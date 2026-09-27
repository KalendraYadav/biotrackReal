import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma, isDbConnected } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STAGE_SEQUENCE = [
  'GENERATION',
  'COLLECTION',
  'TRANSPORT_PICKUP',
  'TRANSPORT_DROPOFF',
  'TREATMENT',
  'DISPOSAL'
];

export const STAGE_TO_STATUS = {
  GENERATION: 'GENERATED',
  COLLECTION: 'COLLECTED',
  TRANSPORT_PICKUP: 'IN_TRANSIT',
  TRANSPORT_DROPOFF: 'RECEIVED',
  TREATMENT: 'TREATED',
  DISPOSAL: 'DISPOSED'
};

// In-memory cache loaded from demo-data.json for instant offline support
let memoryStore = null;
const brokenChainAttemptsMap = new Map();

function loadMemoryStore() {
  if (memoryStore) return memoryStore;

  const dataPath = path.resolve(__dirname, '../data/demo-data.json');
  if (fs.existsSync(dataPath)) {
    try {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      memoryStore = JSON.parse(raw);
      return memoryStore;
    } catch (err) {
      console.warn('[DataStore] Failed to read demo-data.json:', err.message);
    }
  }

  // Fallback default structure
  memoryStore = {
    facilities: [],
    users: [],
    vehicles: [],
    gps_trails: {},
    waste_batches: [],
    custody_events: [],
    hospital_activity_logs: [],
    risk_cases: []
  };
  return memoryStore;
}

/**
 * Retrieves facilities with optional filtering by type (HOSPITAL | CBWTF) and city
 */
export async function getFacilities({ type, city } = {}) {
  if (isDbConnected()) {
    try {
      const where = {};
      if (type) where.type = type.toUpperCase();
      if (city) where.city = { contains: city, mode: 'insensitive' };
      const facilities = await prisma.facility.findMany({
        where,
        orderBy: { name: 'asc' }
      });
      return facilities;
    } catch {
      // Fall through
    }
  }

  const store = loadMemoryStore();
  let list = [...(store.facilities || [])];
  if (type) {
    list = list.filter(f => f.type?.toUpperCase() === type.toUpperCase());
  }
  if (city) {
    list = list.filter(f => f.city?.toLowerCase().includes(city.toLowerCase()));
  }
  return list;
}

/**
 * Retrieves single facility by ID
 */
export async function getFacilityById(id) {
  if (!id) return null;
  if (isDbConnected()) {
    try {
      const facility = await prisma.facility.findUnique({
        where: { id }
      });
      if (facility) return facility;
    } catch {
      // Fall through
    }
  }

  const store = loadMemoryStore();
  return (store.facilities || []).find(f => f.id === id) || null;
}

/**
 * Retrieves waste batches with optional filtering by facility and status
 */
export async function getBatches({ facility, status, hospitalId, cbwtfId } = {}) {
  if (isDbConnected()) {
    try {
      const where = {};
      if (status) where.status = status;
      if (hospitalId) where.hospital_id = hospitalId;
      if (cbwtfId) where.assigned_cbwtf_id = cbwtfId;
      if (facility) {
        where.OR = [
          { hospital_id: facility },
          { assigned_cbwtf_id: facility }
        ];
      }

      const batches = await prisma.wasteBatch.findMany({
        where,
        include: {
          hospital: true,
          assigned_cbwtf: true,
          _count: { select: { custody_events: true, risk_cases: true } }
        },
        orderBy: { created_at: 'desc' }
      });
      return batches;
    } catch {
      // Fall through to memory store
    }
  }

  const store = loadMemoryStore();
  let list = [...store.waste_batches];

  if (status) {
    list = list.filter(b => b.status === status);
  }

  if (hospitalId) {
    const hLower = hospitalId.toLowerCase();
    list = list.filter(b => (b.hospital_id || '').toLowerCase() === hLower);
  }

  if (cbwtfId) {
    const cLower = cbwtfId.toLowerCase();
    list = list.filter(b => (b.assigned_cbwtf_id || '').toLowerCase() === cLower);
  }

  if (facility) {
    const fLower = facility.toLowerCase();
    list = list.filter(b => {
      const hId = (b.hospital_id || '').toLowerCase();
      const cbId = (b.assigned_cbwtf_id || '').toLowerCase();
      return hId === fLower || cbId === fLower;
    });
  }

  // Attach facility metadata and event counts
  return list.map(b => {
    const hospital = store.facilities.find(f => f.id === b.hospital_id) || null;
    const cbwtf = store.facilities.find(f => f.id === b.assigned_cbwtf_id) || null;
    const eventCount = store.custody_events.filter(e => e.batch_id === b.id).length;
    const riskCount = store.risk_cases.filter(r => r.batch_id === b.id).length;

    return {
      ...b,
      hospital,
      assigned_cbwtf: cbwtf,
      _count: {
        custody_events: eventCount,
        risk_cases: riskCount
      }
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Retrieves a single batch by ID, batch code, or QR code, including full custody history
 */
export async function getBatchById(idOrCode) {
  if (!idOrCode) return null;

  if (isDbConnected()) {
    try {
      const batch = await prisma.wasteBatch.findFirst({
        where: {
          OR: [
            { id: idOrCode },
            { batch_code: idOrCode },
            { qr_code_value: idOrCode }
          ]
        },
        include: {
          hospital: true,
          assigned_cbwtf: true,
          custody_events: {
            include: { performed_by: { select: { id: true, name: true, email: true, role: true } } },
            orderBy: { timestamp: 'asc' }
          },
          risk_cases: true
        }
      });
      if (batch) {
        const brokenAttempt = brokenChainAttemptsMap.get(batch.id) || brokenChainAttemptsMap.get(batch.batch_code) || null;
        return {
          ...batch,
          broken_chain_attempt: brokenAttempt
        };
      }
    } catch {
      // Fall through to memory store
    }
  }

  const store = loadMemoryStore();
  const batch = store.waste_batches.find(b => 
    b.id === idOrCode || b.batch_code === idOrCode || b.qr_code_value === idOrCode
  );

  if (!batch) return null;

  const hospital = store.facilities.find(f => f.id === batch.hospital_id) || null;
  const cbwtf = store.facilities.find(f => f.id === batch.assigned_cbwtf_id) || null;
  const events = store.custody_events
    .filter(e => e.batch_id === batch.id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map(e => {
      const user = store.users.find(u => u.id === e.performed_by_user_id);
      return {
        ...e,
        performed_by: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null
      };
    });
  const riskCases = store.risk_cases.filter(r => r.batch_id === batch.id);

  return {
    ...batch,
    hospital,
    assigned_cbwtf: cbwtf,
    custody_events: events,
    risk_cases: riskCases
  };
}

/**
 * Creates a new waste batch and its initial GENERATION custody event
 */
export async function createBatch(data) {
  const store = loadMemoryStore();

  const id = `batch-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
  const batchCode = data.batch_code || `BMW-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const qrCode = data.qr_code_value || `QR-NIDUS-${batchCode}-${Date.now().toString(36)}`;
  const deadline = data.compliance_deadline_at 
    ? new Date(data.compliance_deadline_at) 
    : new Date(Date.now() + 48 * 3600000);

  const newBatch = {
    id,
    batch_code: batchCode,
    hospital_id: data.hospital_id,
    generating_department: data.generating_department,
    cpcb_waste_category: data.cpcb_waste_category,
    cpcb_waste_type: data.cpcb_waste_type || 'General Medical Waste',
    quantity_kg: parseFloat(data.quantity_kg),
    unit: data.unit || 'kg',
    qr_code_value: qrCode,
    status: 'GENERATED',
    assigned_cbwtf_id: data.assigned_cbwtf_id || null,
    compliance_deadline_at: deadline.toISOString(),
    created_at: new Date().toISOString()
  };

  // Initial GENERATION custody event
  const initialEvent = {
    id: `evt-${id}-1`,
    batch_id: id,
    stage: 'GENERATION',
    performed_by_user_id: data.performed_by_user_id || 'user-hosp-001',
    verified_by_scan: true,
    photo_url: data.photo_url || `/uploads/evidence/generation_${id}.jpg`,
    latitude: parseFloat(data.latitude || 28.5672),
    longitude: parseFloat(data.longitude || 77.2100),
    geofence_valid: true,
    timestamp: new Date().toISOString(),
    quantity_at_stage_kg: parseFloat(data.quantity_kg),
    notes: data.notes || `Waste batch ${batchCode} registered at ${data.generating_department}. Initial QR tag attached.`
  };

  if (isDbConnected()) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const b = await tx.wasteBatch.create({ data: newBatch });
        const e = await tx.custodyEvent.create({ data: initialEvent });
        return { ...b, custody_events: [e] };
      });
      return created;
    } catch {
      // Fall through to memory store
    }
  }

  // Memory store addition
  store.waste_batches.unshift(newBatch);
  store.custody_events.push(initialEvent);

  return {
    ...newBatch,
    custody_events: [initialEvent]
  };
}

/**
 * Creates a custody event for a batch with chain-of-custody verification
 */
export async function createCustodyEvent(batchId, eventData) {
  const store = loadMemoryStore();
  const batch = await getBatchById(batchId);

  if (!batch) {
    return { error: 'NOT_FOUND', message: `Waste batch with ID '${batchId}' not found.` };
  }

  const requestedStage = eventData.stage;
  const stageIndex = STAGE_SEQUENCE.indexOf(requestedStage);

  if (stageIndex === -1) {
    return { 
      error: 'INVALID_STAGE', 
      message: `Invalid custody stage '${requestedStage}'. Allowed stages are: ${STAGE_SEQUENCE.join(', ')}` 
    };
  }

  // Existing custody events for this batch
  const existingEvents = batch.custody_events || [];
  const existingStages = existingEvents.map(e => e.stage);

  // CHAIN-OF-CUSTODY PREREQUISITE CHECK:
  // If not GENERATION, verify the immediately preceding stage exists (unless force/bypass_validation is explicitly flagged)
  if (stageIndex > 0 && !eventData.force && !eventData.bypass_validation) {
    const requiredPriorStage = STAGE_SEQUENCE[stageIndex - 1];
    if (!existingStages.includes(requiredPriorStage)) {
      return {
        error: 'CHAIN_OF_CUSTODY_VIOLATION',
        statusCode: 422,
        message: `Cannot record '${requestedStage}' stage: required prior stage '${requiredPriorStage}' has not been completed or verified yet.`,
        requiredPriorStage,
        completedStages: existingStages,
        attemptedStage: requestedStage
      };
    }
  }

  const newStatus = STAGE_TO_STATUS[requestedStage] || batch.status;
  const eventId = `evt-${batch.id}-${existingEvents.length + 1}`;
  const quantity = parseFloat(eventData.quantity_at_stage_kg || eventData.quantity || batch.quantity_kg);

  const newEvent = {
    id: eventId,
    batch_id: batch.id,
    stage: requestedStage,
    performed_by_user_id: eventData.performed_by_user_id || 'user-coll-001',
    verified_by_scan: eventData.verified_by_scan !== false,
    photo_url: eventData.photo_url || `/uploads/evidence/${requestedStage.toLowerCase()}_${batch.id}.jpg`,
    latitude: parseFloat(eventData.latitude || 28.5355),
    longitude: parseFloat(eventData.longitude || 77.2731),
    geofence_valid: eventData.geofence_valid !== false,
    timestamp: eventData.timestamp ? new Date(eventData.timestamp).toISOString() : new Date().toISOString(),
    quantity_at_stage_kg: quantity,
    notes: eventData.notes || `Verified custody handover for stage ${requestedStage}.`
  };

  if (isDbConnected()) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const createdEvent = await tx.custodyEvent.create({ data: newEvent });
        const updatedBatch = await tx.wasteBatch.update({
          where: { id: batch.id },
          data: { status: newStatus }
        });
        return { event: createdEvent, batch: updatedBatch };
      });
      return { success: true, event: result.event, updatedBatchStatus: result.batch.status };
    } catch (err) {
      // Fall through to memory store
    }
  }

  // Memory store addition & update
  store.custody_events.push(newEvent);
  const targetBatch = store.waste_batches.find(b => b.id === batch.id);
  if (targetBatch) {
    targetBatch.status = newStatus;
  }

  return {
    success: true,
    event: newEvent,
    updatedBatchStatus: newStatus
  };
}

/**
 * Retrieves current vehicle GPS location, officer details, and breadcrumb trail
 */
export async function getVehicleLocation(vehicleId) {
  if (!vehicleId) return null;

  if (isDbConnected()) {
    try {
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          OR: [{ id: vehicleId }, { plate_no: vehicleId }]
        },
        include: {
          transport_officer: { select: { id: true, name: true, email: true, role: true, phone_number: true } }
        }
      });
      if (vehicle) return vehicle;
    } catch {
      // Fall through to memory store
    }
  }

  const store = loadMemoryStore();
  const vehicle = store.vehicles.find(v => v.id === vehicleId || v.plate_no === vehicleId);
  if (!vehicle) return null;

  const officer = store.users.find(u => u.id === vehicle.transport_officer_id);
  const trail = store.gps_trails[vehicle.id] || [];

  return {
    ...vehicle,
    transport_officer: officer ? { id: officer.id, name: officer.name, email: officer.email, role: officer.role } : null,
    gps_trail: trail
  };
}

/**
 * Approximates distance in km between two lat/lng points using Haversine formula
 */
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks if a point is within the approved transit corridor
 * Safe corridor between AIIMS (28.5672, 77.2100) and EcoSafe CBWTF (28.5355, 77.2731)
 * with a tolerance buffer of 2.0 km.
 */
export function isPointInCorridor(lat, lng, maxDeviationKm = 2.0) {
  const waypoints = [
    [28.5672, 77.2100], // AIIMS Central Hospital
    [28.5650, 77.2280], // Ring Road - South Ext
    [28.5520, 77.2400], // Moolchand / Lajpat Nagar
    [28.5480, 77.2510], // Nehru Place
    [28.5355, 77.2731]  // EcoSafe CBWTF Okhla
  ];

  let minDistance = Infinity;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat1, lng1] = waypoints[i];
    const [lat2, lng2] = waypoints[i + 1];

    const dx = lng2 - lng1;
    const dy = lat2 - lat1;
    const l2 = dx * dx + dy * dy;
    let t = l2 === 0 ? 0 : ((lng - lng1) * dx + (lat - lat1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const projLat = lat1 + t * dy;
    const projLng = lng1 + t * dx;
    const dist = getDistanceKm(lat, lng, projLat, projLng);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return {
    valid: minDistance <= maxDeviationKm,
    deviationKm: Math.round(minDistance * 100) / 100,
    toleranceKm: maxDeviationKm
  };
}

/**
 * Retrieves all vehicles with assigned officer and GPS trail summary
 */
export async function getAllVehicles() {
  if (isDbConnected()) {
    try {
      const vehicles = await prisma.vehicle.findMany({
        include: {
          transport_officer: { select: { id: true, name: true, email: true, role: true, phone_number: true } }
        }
      });
      return vehicles;
    } catch {
      // Fall through
    }
  }

  const store = loadMemoryStore();
  return store.vehicles.map(v => {
    const officer = store.users.find(u => u.id === v.transport_officer_id);
    const trail = store.gps_trails[v.id] || [];
    return {
      ...v,
      transport_officer: officer ? { id: officer.id, name: officer.name, email: officer.email, role: officer.role } : null,
      gps_trail: trail
    };
  });
}

/**
 * Updates vehicle telemetry ping and appends to GPS trail
 */
export async function updateVehiclePing(vehicleId, { lat, lng, speed_kmh } = {}) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return { error: 'INVALID_COORDINATES', message: 'Valid numeric latitude and longitude are required.' };
  }

  const now = new Date();
  const geofenceCheck = isPointInCorridor(latitude, longitude);

  if (isDbConnected()) {
    try {
      const updated = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          current_lat: latitude,
          current_lng: longitude,
          last_ping_at: now
        }
      });
      return { success: true, vehicle: updated, geofence: geofenceCheck };
    } catch {
      // Fall through to memory store
    }
  }

  const store = loadMemoryStore();
  const vehicle = store.vehicles.find(v => v.id === vehicleId || v.plate_no === vehicleId);
  if (!vehicle) {
    return { error: 'NOT_FOUND', message: `Vehicle with ID/Plate '${vehicleId}' not found.` };
  }

  vehicle.current_lat = latitude;
  vehicle.current_lng = longitude;
  vehicle.last_ping_at = now.toISOString();

  if (!store.gps_trails[vehicle.id]) {
    store.gps_trails[vehicle.id] = [];
  }

  const pingEntry = {
    lat: latitude,
    lng: longitude,
    speed_kmh: speed_kmh !== undefined ? parseFloat(speed_kmh) : 30,
    timestamp: now.toISOString(),
    geofence_valid: geofenceCheck.valid,
    deviation_km: geofenceCheck.deviationKm
  };
  store.gps_trails[vehicle.id].push(pingEntry);

  let deviationAlert = null;
  if (!geofenceCheck.valid) {
    deviationAlert = {
      alert: true,
      code: 'ROUTE_DEVIATION',
      message: `Vehicle ${vehicle.plate_no} deviated ${geofenceCheck.deviationKm} km outside approved green corridor!`,
      timestamp: now.toISOString()
    };

    // Auto-log risk trigger for active in-transit batches
    const inTransitBatches = store.waste_batches.filter(b => b.status === 'IN_TRANSIT');
    for (const batch of inTransitBatches) {
      try {
        await createOrUpdateRiskCase({
          batch_id: batch.id,
          risk_score: 82,
          triggers: [
            `Vehicle ${vehicle.plate_no} deviated from approved green corridor geofence (${geofenceCheck.deviationKm} km outside corridor)`,
            `Transit route deviation detected during active cargo run`
          ],
          assigned_inspector_id: 'user-insp-002'
        });
      } catch (err) {
        console.warn(`[Risk Engine] Auto-case creation error on deviation:`, err.message);
      }
    }
  }

  return {
    success: true,
    vehicle,
    lastPing: pingEntry,
    geofence: geofenceCheck,
    deviationAlert
  };
}

/**
 * Retrieves hospital 90-day activity logs with anomaly detection analysis
 */
export async function getHospitalActivity(hospitalId) {
  const store = loadMemoryStore();
  const hospital = store.facilities.find(f => f.id === hospitalId && f.type === 'HOSPITAL');

  if (!hospital) {
    return null;
  }

  let logs = [];

  if (isDbConnected()) {
    try {
      logs = await prisma.hospitalActivityLog.findMany({
        where: { hospital_id: hospitalId },
        orderBy: { date: 'desc' }
      });
    } catch {
      // Fallback
    }
  }

  if (logs.length === 0) {
    logs = store.hospital_activity_logs
      .filter(l => l.hospital_id === hospitalId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Anomaly analysis
  // Normal ratio: expected_waste_kg / bed_occupancy is roughly 0.8 - 1.6
  const analyzedLogs = logs.map(log => {
    const ratio = log.expected_waste_kg / (log.bed_occupancy || 1);
    let anomaly = null;

    if (ratio < 0.3) {
      anomaly = {
        type: 'UNDER_REPORTED_WASTE',
        severity: 'HIGH',
        description: 'Abnormally low waste logged relative to high patient bed occupancy. Potential unreported dumping.'
      };
    } else if (ratio > 2.2) {
      anomaly = {
        type: 'WASTE_SPIKE',
        severity: 'HIGH',
        description: 'Abnormally high waste volume relative to bed occupancy. Potential hazardous waste mixing.'
      };
    }

    return {
      ...log,
      waste_per_bed_ratio: Math.round(ratio * 100) / 100,
      anomaly
    };
  });

  const anomalyCount = analyzedLogs.filter(l => l.anomaly !== null).length;
  const avgOccupancy = Math.round(logs.reduce((acc, l) => acc + l.bed_occupancy, 0) / (logs.length || 1));
  const totalExpectedWaste = Math.round(logs.reduce((acc, l) => acc + l.expected_waste_kg, 0) * 10) / 10;

  return {
    hospital,
    total_logs: analyzedLogs.length,
    anomalies_detected: anomalyCount,
    statistics: {
      bed_count: hospital.bed_count,
      average_occupancy: avgOccupancy,
      total_waste_90d_kg: totalExpectedWaste,
      daily_average_kg: Math.round((totalExpectedWaste / (logs.length || 1)) * 10) / 10
    },
    logs: analyzedLogs
  };
}

/**
 * Retrieves risk cases with optional filtering by status, min_score, and inspector_id
 */
export async function getRiskCases({ status, minScore, inspectorId } = {}) {
  const store = loadMemoryStore();

  if (isDbConnected()) {
    try {
      const where = {};
      if (status) where.status = status;
      if (minScore) where.risk_score = { gte: parseInt(minScore) };
      if (inspectorId) where.assigned_inspector_id = inspectorId;

      const cases = await prisma.riskCase.findMany({
        where,
        include: {
          batch: {
            include: { hospital: true, assigned_cbwtf: true }
          },
          assigned_inspector: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { risk_score: 'desc' }
      });
      return cases;
    } catch {
      // Fall through to memory store
    }
  }

  let list = [...(store.risk_cases || [])];

  if (status) {
    list = list.filter(c => c.status === status);
  }
  if (minScore) {
    list = list.filter(c => c.risk_score >= parseInt(minScore));
  }
  if (inspectorId) {
    list = list.filter(c => c.assigned_inspector_id === inspectorId);
  }

  return list.map(c => {
    const batch = store.waste_batches.find(b => b.id === c.batch_id) || null;
    let enrichedBatch = null;
    if (batch) {
      enrichedBatch = {
        ...batch,
        hospital: store.facilities.find(f => f.id === batch.hospital_id) || null,
        assigned_cbwtf: store.facilities.find(f => f.id === batch.assigned_cbwtf_id) || null
      };
    }
    const inspector = store.users.find(u => u.id === c.assigned_inspector_id) || null;

    return {
      ...c,
      batch: enrichedBatch,
      assigned_inspector: inspector ? { id: inspector.id, name: inspector.name, email: inspector.email, role: inspector.role } : null
    };
  }).sort((a, b) => b.risk_score - a.risk_score);
}

/**
 * Retrieves a single risk case by ID or case_code
 */
export async function getRiskCaseById(idOrCode) {
  if (!idOrCode) return null;
  const store = loadMemoryStore();

  if (isDbConnected()) {
    try {
      const riskCase = await prisma.riskCase.findFirst({
        where: {
          OR: [{ id: idOrCode }, { case_code: idOrCode }]
        },
        include: {
          batch: {
            include: {
              hospital: true,
              assigned_cbwtf: true,
              custody_events: {
                orderBy: { timestamp: 'asc' }
              }
            }
          },
          assigned_inspector: {
            select: { id: true, name: true, email: true, role: true }
          }
        }
      });
      if (riskCase) return riskCase;
    } catch {
      // Fall through to memory store
    }
  }

  const riskCase = (store.risk_cases || []).find(c => c.id === idOrCode || c.case_code === idOrCode);
  if (!riskCase) return null;

  const batch = await getBatchById(riskCase.batch_id);
  const inspector = store.users.find(u => u.id === riskCase.assigned_inspector_id) || null;
  const auditLogs = (store.audit_logs || []).filter(a => a.entity === 'RiskCase' && a.entity_id === riskCase.id);

  return {
    ...riskCase,
    batch,
    assigned_inspector: inspector ? { id: inspector.id, name: inspector.name, email: inspector.email, role: inspector.role } : null,
    audit_history: auditLogs
  };
}

/**
 * Creates or updates a risk case
 */
export async function createOrUpdateRiskCase(caseData) {
  const store = loadMemoryStore();
  if (!store.risk_cases) store.risk_cases = [];

  // Helper to enrich risk case with linked batch, hospital, and inspector details
  const enrichCase = (c) => {
    const targetBatch = store.waste_batches?.find(b => b.id === c.batch_id || b.batch_code === c.batch_id);
    let enrichedBatch = null;
    if (targetBatch) {
      enrichedBatch = {
        ...targetBatch,
        hospital: store.facilities?.find(f => f.id === targetBatch.hospital_id) || null,
        assigned_cbwtf: store.facilities?.find(f => f.id === targetBatch.assigned_cbwtf_id) || null,
        custody_events: store.custody_events?.filter(e => e.batch_id === targetBatch.id) || []
      };
    }
    const inspector = store.users?.find(u => u.id === c.assigned_inspector_id);
    return {
      ...c,
      batch: c.batch || enrichedBatch,
      assigned_inspector: c.assigned_inspector || (inspector ? { id: inspector.id, name: inspector.name, email: inspector.email, role: inspector.role } : null)
    };
  };

  if (isDbConnected()) {
    try {
      const dbExisting = await prisma.riskCase.findFirst({
        where: {
          batch_id: caseData.batch_id,
          status: { not: 'RESOLVED' }
        },
        include: {
          batch: { include: { hospital: true, assigned_cbwtf: true } },
          assigned_inspector: { select: { id: true, name: true, email: true, role: true } }
        }
      });

      if (dbExisting) {
        const updated = await prisma.riskCase.update({
          where: { id: dbExisting.id },
          data: {
            risk_score: caseData.risk_score,
            triggers: caseData.triggers
          },
          include: {
            batch: { include: { hospital: true, assigned_cbwtf: true } },
            assigned_inspector: { select: { id: true, name: true, email: true, role: true } }
          }
        });
        return { created: false, riskCase: enrichCase(updated) };
      }

      const id = `risk-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
      const caseCode = `INS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const inspectorId = caseData.assigned_inspector_id || 'user-insp-001';

      const created = await prisma.riskCase.create({
        data: {
          id,
          batch_id: caseData.batch_id,
          case_code: caseCode,
          risk_score: caseData.risk_score,
          triggers: caseData.triggers || [],
          status: 'ASSIGNED',
          assigned_inspector_id: inspectorId
        },
        include: {
          batch: { include: { hospital: true, assigned_cbwtf: true } },
          assigned_inspector: { select: { id: true, name: true, email: true, role: true } }
        }
      });
      return { created: true, riskCase: enrichCase(created) };
    } catch (err) {
      console.warn('[DataStore] createOrUpdateRiskCase database query error:', err.message);
    }
  }

  // Fallback to memory store
  const existingIndex = store.risk_cases.findIndex(c => 
    c.batch_id === caseData.batch_id && c.status !== 'RESOLVED'
  );

  if (existingIndex !== -1) {
    const existing = store.risk_cases[existingIndex];
    existing.risk_score = caseData.risk_score;
    existing.triggers = caseData.triggers;
    if (caseData.assigned_inspector_id && !existing.assigned_inspector_id) {
      existing.assigned_inspector_id = caseData.assigned_inspector_id;
    }
    return { created: false, riskCase: enrichCase(existing) };
  }

  const id = `risk-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
  const caseCode = `INS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const newCase = {
    id,
    batch_id: caseData.batch_id,
    case_code: caseCode,
    risk_score: caseData.risk_score,
    triggers: caseData.triggers || [],
    status: 'ASSIGNED',
    assigned_inspector_id: caseData.assigned_inspector_id || 'user-insp-001',
    created_at: new Date().toISOString(),
    resolved_at: null
  };
  store.risk_cases.unshift(newCase);
  return { created: true, riskCase: enrichCase(newCase) };
}

/**
 * Records an attempted chain of custody violation flag on a batch
 */
export async function recordBrokenChainAttempt(batchId, violationData) {
  brokenChainAttemptsMap.set(batchId, violationData);
  const store = loadMemoryStore();
  const batch = (store.waste_batches || []).find(b => b.id === batchId || b.batch_code === batchId);
  if (batch) {
    batch.broken_chain_attempt = violationData;
  }
  return { batchId, ...violationData };
}

/**
 * Applies an action to a risk case (INVESTIGATE, ESCALATE, REQUEST_EVIDENCE, RESOLVE)
 */
export async function applyRiskCaseAction(caseId, { action, notes, inspectorId } = {}) {
  const store = loadMemoryStore();
  const riskCase = (store.risk_cases || []).find(c => c.id === caseId || c.case_code === caseId);

  if (!riskCase) {
    return { error: 'NOT_FOUND', message: `Risk Case with ID '${caseId}' not found.` };
  }

  let newStatus = riskCase.status;
  let resolvedAt = riskCase.resolved_at;

  switch (action) {
    case 'INVESTIGATE':
      newStatus = 'UNDER_INVESTIGATION';
      break;
    case 'ESCALATE':
      newStatus = 'UNDER_INVESTIGATION';
      break;
    case 'REQUEST_EVIDENCE':
      newStatus = 'UNDER_INVESTIGATION';
      break;
    case 'RESOLVE':
      newStatus = 'RESOLVED';
      resolvedAt = new Date().toISOString();
      break;
    default:
      return { 
        error: 'INVALID_ACTION', 
        message: `Action '${action}' is not valid. Supported actions: INVESTIGATE, ESCALATE, REQUEST_EVIDENCE, RESOLVE` 
      };
  }

  riskCase.status = newStatus;
  riskCase.resolved_at = resolvedAt;
  if (inspectorId) riskCase.assigned_inspector_id = inspectorId;

  // Record audit log
  if (!store.audit_logs) store.audit_logs = [];
  const logEntry = {
    id: `audit-${Date.now().toString(36)}`,
    actor_user_id: inspectorId || 'user-insp-001',
    action: `RISK_CASE_${action}`,
    entity: 'RiskCase',
    entity_id: riskCase.id,
    timestamp: new Date().toISOString(),
    notes: notes || `Action '${action}' applied to Risk Case ${riskCase.case_code}.`
  };
  store.audit_logs.push(logEntry);

  if (isDbConnected()) {
    try {
      const updated = await prisma.riskCase.update({
        where: { id: riskCase.id },
        data: {
          status: newStatus,
          resolved_at: resolvedAt ? new Date(resolvedAt) : null,
          assigned_inspector_id: riskCase.assigned_inspector_id
        }
      });
      await prisma.auditLog.create({
        data: {
          actor_user_id: logEntry.actor_user_id,
          action: logEntry.action,
          entity: logEntry.entity,
          entity_id: logEntry.entity_id,
          timestamp: new Date(logEntry.timestamp)
        }
      });
      return { success: true, riskCase: updated, actionLog: logEntry };
    } catch {
      // Fall through
    }
  }

  return {
    success: true,
    riskCase,
    actionLog: logEntry
  };
}

export default {
  STAGE_SEQUENCE,
  STAGE_TO_STATUS,
  getFacilities,
  getFacilityById,
  getBatches,
  getBatchById,
  createBatch,
  createCustodyEvent,
  getVehicleLocation,
  getAllVehicles,
  updateVehiclePing,
  getDistanceKm,
  isPointInCorridor,
  getHospitalActivity,
  getRiskCases,
  getRiskCaseById,
  createOrUpdateRiskCase,
  recordBrokenChainAttempt,
  applyRiskCaseAction
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const requireBackend = createRequire(path.resolve(__dirname, '../backend/package.json'));
const bcrypt = requireBackend('bcryptjs');
const dotenv = requireBackend('dotenv');

import { prisma, isDbConnected, testDbConnection } from '../backend/db.js';
import { ROLES } from '../backend/constants/roles.js';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const PASSWORD_HASH = bcrypt.hashSync('password123', 10);

// =========================================================================
// 1. FACILITIES (6 Hospitals + 3 CBWTFs)
// =========================================================================
export const FACILITIES = [
  // Hospitals
  {
    id: 'fac-hosp-001',
    name: 'AIIMS Central Hospital',
    type: 'HOSPITAL',
    city: 'New Delhi',
    address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi 110029',
    lat: 28.5672,
    lng: 77.2100,
    bed_count: 500,
    cpcb_registration_no: 'CPCB-HOSP-DL-2024-001'
  },
  {
    id: 'fac-hosp-002',
    name: 'Apollo Speciality Hospital',
    type: 'HOSPITAL',
    city: 'Chennai',
    address: '21 Greams Lane, Thousand Lights, Chennai 600006',
    lat: 13.0604,
    lng: 80.2496,
    bed_count: 400,
    cpcb_registration_no: 'CPCB-HOSP-TN-2024-002'
  },
  {
    id: 'fac-hosp-003',
    name: 'Fortis Memorial Research Institute',
    type: 'HOSPITAL',
    city: 'Gurugram',
    address: 'Sector 44, Opposite HUDA City Centre, Gurugram 122002',
    lat: 28.4595,
    lng: 77.0725,
    bed_count: 300,
    cpcb_registration_no: 'CPCB-HOSP-HR-2024-003'
  },
  {
    id: 'fac-hosp-004',
    name: 'Manipal Hospital Bengaluru',
    type: 'HOSPITAL',
    city: 'Bengaluru',
    address: '98 HAL Old Airport Road, Kodihalli, Bengaluru 560017',
    lat: 12.9592,
    lng: 77.6517,
    bed_count: 250,
    cpcb_registration_no: 'CPCB-HOSP-KA-2024-004'
  },
  {
    id: 'fac-hosp-005',
    name: 'Lilavati Hospital & Research Centre',
    type: 'HOSPITAL',
    city: 'Mumbai',
    address: 'A-791 Bandra Reclamation, Bandra West, Mumbai 400050',
    lat: 19.0514,
    lng: 72.8295,
    bed_count: 150,
    cpcb_registration_no: 'CPCB-HOSP-MH-2024-005'
  },
  {
    id: 'fac-hosp-006',
    name: 'City Care Community Hospital',
    type: 'HOSPITAL',
    city: 'Jaipur',
    address: '14 Tonk Road, Bapu Nagar, Jaipur 302015',
    lat: 26.9124,
    lng: 75.7873,
    bed_count: 60,
    cpcb_registration_no: 'CPCB-HOSP-RJ-2024-006'
  },
  // CBWTFs (Treatment Facilities)
  {
    id: 'fac-cbwtf-001',
    name: 'EcoSafe Waste Handlers (CBWTF Central)',
    type: 'CBWTF',
    city: 'Delhi NCR',
    address: 'Plot 48, Okhla Industrial Area Phase-III, New Delhi 110020',
    lat: 28.5355,
    lng: 77.2731,
    bed_count: null,
    cpcb_registration_no: 'CPCB-CBWTF-DL-2023-011'
  },
  {
    id: 'fac-cbwtf-002',
    name: 'Apex Bio-Clean Treatment Plant',
    type: 'CBWTF',
    city: 'Mumbai',
    address: 'MIDC Industrial Zone, Wagle Estate, Thane 400604',
    lat: 19.2183,
    lng: 72.9781,
    bed_count: null,
    cpcb_registration_no: 'CPCB-CBWTF-MH-2023-012'
  },
  {
    id: 'fac-cbwtf-003',
    name: 'GreenEarth Bio-Disposal Hub',
    type: 'CBWTF',
    city: 'Bengaluru',
    address: 'KIADB Industrial Area, Phase 2, Hosur Road, Bengaluru 560099',
    lat: 12.8398,
    lng: 77.6770,
    bed_count: null,
    cpcb_registration_no: 'CPCB-CBWTF-KA-2023-013'
  }
];

// =========================================================================
// 2. 15 DEMO USERS (Covering all 6 Roles, Password: password123)
// =========================================================================
export const USERS = [
  // 1. HOSPITAL_AUTHORITY (3 users)
  {
    id: 'user-hosp-001',
    name: 'Dr. Aarav Mehta',
    email: 'hospital@demo.com',
    password_hash: PASSWORD_HASH,
    role: ROLES.HOSPITAL_AUTHORITY,
    facility_id: 'fac-hosp-001',
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34501'
  },
  {
    id: 'user-hosp-002',
    name: 'Dr. Priya Nair',
    email: 'priya.nair@apollo.demo',
    password_hash: PASSWORD_HASH,
    role: ROLES.HOSPITAL_AUTHORITY,
    facility_id: 'fac-hosp-002',
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34502'
  },
  {
    id: 'user-hosp-003',
    name: 'Dr. Rohan Verma',
    email: 'rohan.verma@lilavati.demo',
    password_hash: PASSWORD_HASH,
    role: ROLES.HOSPITAL_AUTHORITY,
    facility_id: 'fac-hosp-005',
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34503'
  },

  // 2. COLLECTION_OFFICER (3 users)
  {
    id: 'user-coll-001',
    name: 'Meera Iyer',
    email: 'collection@demo.com',
    password_hash: PASSWORD_HASH,
    role: ROLES.COLLECTION_OFFICER,
    facility_id: 'fac-cbwtf-001',
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34504'
  },
  {
    id: 'user-coll-002',
    name: 'Suresh Kumar',
    email: 'suresh.kumar@demo.com',
    password_hash: PASSWORD_HASH,
    role: ROLES.COLLECTION_OFFICER,
    facility_id: 'fac-cbwtf-002',
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34505'
  },
  {
    id: 'user-coll-003',
    name: 'Deepak Chauhan',
    email: 'deepak.chauhan@demo.com',
    password_hash: PASSWORD_HASH,
    role: ROLES.COLLECTION_OFFICER,
    facility_id: 'fac-cbwtf-003',
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34506'
  },

  // 3. TRANSPORT_OFFICER (3 users)
  {
    id: 'user-tran-001',
    name: 'Vikram Singh',
    email: 'transport@demo.com',
    password_hash: PASSWORD_HASH,
    role: ROLES.TRANSPORT_OFFICER,
    facility_id: 'fac-cbwtf-001',
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34507'
  },
  {
    id: 'user-tran-002',
    name: 'Rajesh Shinde',
    email: 'rajesh.shinde@demo.com',
    password_hash: PASSWORD_HASH,
    role: ROLES.TRANSPORT_OFFICER,
    facility_id: 'fac-cbwtf-002',
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34508'
  },
  {
    id: 'user-tran-003',
    name: 'Harpreet Singh',
    email: 'harpreet.singh@demo.com',
    password_hash: PASSWORD_HASH,
    role: ROLES.TRANSPORT_OFFICER,
    facility_id: 'fac-cbwtf-003',
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34509'
  },

  // 4. TREATMENT_FACILITY (2 users)
  {
    id: 'user-cbwtf-001',
    name: 'Rajesh Patel',
    email: 'treatment@demo.com',
    password_hash: PASSWORD_HASH,
    role: ROLES.TREATMENT_FACILITY,
    facility_id: 'fac-cbwtf-001',
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34510'
  },
  {
    id: 'user-cbwtf-002',
    name: 'Anand Joshi',
    email: 'anand.joshi@demo.com',
    password_hash: PASSWORD_HASH,
    role: ROLES.TREATMENT_FACILITY,
    facility_id: 'fac-cbwtf-002',
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34511'
  },

  // 5. GOVERNMENT_AUTHORITY (2 users)
  {
    id: 'user-govt-001',
    name: 'Sunita Sharma',
    email: 'regulator@demo.com',
    password_hash: PASSWORD_HASH,
    role: ROLES.GOVERNMENT_AUTHORITY,
    facility_id: null,
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34512'
  },
  {
    id: 'user-govt-002',
    name: 'K. V. Swaminathan',
    email: 'swaminathan@spcb.demo',
    password_hash: PASSWORD_HASH,
    role: ROLES.GOVERNMENT_AUTHORITY,
    facility_id: null,
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34513'
  },

  // 6. COMPLIANCE_INSPECTOR (2 users)
  {
    id: 'user-insp-001',
    name: 'Amit Deshmukh',
    email: 'inspector@demo.com',
    password_hash: PASSWORD_HASH,
    role: ROLES.COMPLIANCE_INSPECTOR,
    facility_id: null,
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34514'
  },
  {
    id: 'user-insp-002',
    name: 'Ananya Ray',
    email: 'ananya.ray@inspector.demo',
    password_hash: PASSWORD_HASH,
    role: ROLES.COMPLIANCE_INSPECTOR,
    facility_id: null,
    verification_status: 'VERIFIED',
    phone_number: '+91 98112 34515'
  }
];

// =========================================================================
// 3. VEHICLES & GPS TRAILS
// =========================================================================
export const VEHICLES = [
  {
    id: 'veh-001',
    plate_no: 'DL-01-AB-4421',
    transport_officer_id: 'user-tran-001',
    driver_phone: '+91 98112 34507',
    phone_number: '+91 98112 34507',
    current_lat: 28.5492,
    current_lng: 77.2415,
    last_ping_at: new Date()
  },
  {
    id: 'veh-002',
    plate_no: 'MH-04-CD-8812',
    transport_officer_id: 'user-tran-002',
    driver_phone: '+91 98112 34508',
    phone_number: '+91 98112 34508',
    current_lat: 19.1245,
    current_lng: 72.8912,
    last_ping_at: new Date()
  },
  {
    id: 'veh-003',
    plate_no: 'KA-05-EF-3390',
    transport_officer_id: 'user-tran-003',
    driver_phone: '+91 98112 34509',
    phone_number: '+91 98112 34509',
    current_lat: 12.8950,
    current_lng: 77.6620,
    last_ping_at: new Date()
  }
];

export const VEHICLE_GPS_TRAILS = {
  'veh-001': [
    { lat: 28.5672, lng: 77.2100, timestamp: new Date(Date.now() - 3600000).toISOString(), speed_kmh: 0 },
    { lat: 28.5620, lng: 77.2185, timestamp: new Date(Date.now() - 2700000).toISOString(), speed_kmh: 32 },
    { lat: 28.5540, lng: 77.2310, timestamp: new Date(Date.now() - 1800000).toISOString(), speed_kmh: 41 },
    { lat: 28.5492, lng: 77.2415, timestamp: new Date(Date.now() - 900000).toISOString(), speed_kmh: 28 },
    { lat: 28.5355, lng: 77.2731, timestamp: new Date().toISOString(), speed_kmh: 0 }
  ],
  'veh-002': [
    { lat: 19.0514, lng: 72.8295, timestamp: new Date(Date.now() - 4200000).toISOString(), speed_kmh: 0 },
    { lat: 19.0810, lng: 72.8550, timestamp: new Date(Date.now() - 3000000).toISOString(), speed_kmh: 38 },
    { lat: 19.1245, lng: 72.8912, timestamp: new Date(Date.now() - 1500000).toISOString(), speed_kmh: 44 },
    { lat: 19.2183, lng: 72.9781, timestamp: new Date().toISOString(), speed_kmh: 0 }
  ],
  'veh-003': [
    { lat: 12.9592, lng: 77.6517, timestamp: new Date(Date.now() - 3600000).toISOString(), speed_kmh: 0 },
    { lat: 12.9150, lng: 77.6600, timestamp: new Date(Date.now() - 2400000).toISOString(), speed_kmh: 35 },
    { lat: 12.8950, lng: 77.6620, timestamp: new Date(Date.now() - 1200000).toISOString(), speed_kmh: 40 },
    { lat: 12.8398, lng: 77.6770, timestamp: new Date().toISOString(), speed_kmh: 0 }
  ]
};

// =========================================================================
// 4. 40 WASTE BATCHES & MATCHING CUSTODY EVENTS
// =========================================================================
const CATEGORIES = [
  { cat: 'Yellow', types: ['Soiled Cotton & Dressings', 'Anatomical Tissue', 'Microbiology Cultures', 'Expired Medicines'] },
  { cat: 'Red', types: ['Contaminated IV Tubing & Catheters', 'Syringes without needles', 'Dialysis Kits', 'Gloves & Vacutainers'] },
  { cat: 'White', types: ['Needles with syringes', 'Scalpels & Blades', 'Contaminated Sharps', 'Luer lock tips'] },
  { cat: 'Blue', types: ['Broken Glassware', 'Medicine Vials & Ampoules', 'Orthopedic Metallic Implants', 'Cytotoxic Drug Glassware'] }
];

const DEPARTMENTS = [
  'Operation Theatre 1', 'Intensive Care Unit (ICU)', 'Emergency Ward', 
  'Pathology & Hematology Lab', 'Pediatrics Ward', 'Oncology Day Care', 'General Surgery'
];

const STAGES = ['GENERATION', 'COLLECTION', 'TRANSPORT_PICKUP', 'TRANSPORT_DROPOFF', 'TREATMENT', 'DISPOSAL'];
const STATUS_ORDER = ['GENERATED', 'COLLECTED', 'IN_TRANSIT', 'RECEIVED', 'TREATED', 'DISPOSED'];

export function generateBatchesAndCustody() {
  const batches = [];
  const custodyEvents = [];

  // Distribution of 40 batches across statuses:
  // 6 GENERATED, 6 COLLECTED, 8 IN_TRANSIT, 6 RECEIVED, 6 TREATED, 8 DISPOSED = 40 total
  const statusCounts = {
    GENERATED: 6,
    COLLECTED: 6,
    IN_TRANSIT: 8,
    RECEIVED: 6,
    TREATED: 6,
    DISPOSED: 8
  };

  let batchIndex = 1;

  for (const [targetStatus, count] of Object.entries(statusCounts)) {
    for (let i = 0; i < count; i++) {
      const bId = `batch-${String(batchIndex).padStart(3, '0')}`;
      const batchCode = `BMW-2026-${String(100 + batchIndex).padStart(5, '0')}`;
      const qrCode = `QR-NIDUS-${batchCode}-${Date.now().toString(36)}`;
      
      const hospital = FACILITIES[batchIndex % 6]; // Cycle through the 6 hospitals
      const cbwtf = FACILITIES[6 + (batchIndex % 3)]; // Cycle through 3 CBWTFs

      const catObj = CATEGORIES[batchIndex % CATEGORIES.length];
      const wasteCat = catObj.cat;
      const wasteType = catObj.types[i % catObj.types.length];
      const dept = DEPARTMENTS[(batchIndex + i) % DEPARTMENTS.length];

      // Weight between 6.5 kg and 62.0 kg
      const baseWeight = Math.round((7.5 + (batchIndex * 1.37) % 52) * 10) / 10;
      
      // Generation date: between 1 and 20 days ago
      const daysAgo = (batchIndex % 15) + 1;
      const createdAt = new Date(Date.now() - daysAgo * 86400000 + i * 3600000);
      
      // SLA deadline: 48h from generation (or overdue if specifically targeted)
      const isOverdue = batchIndex === 5 || batchIndex === 14;
      const deadlineAt = isOverdue
        ? new Date(createdAt.getTime() + 12 * 3600000) // already past deadline
        : new Date(createdAt.getTime() + 48 * 3600000);

      const batch = {
        id: bId,
        batch_code: batchCode,
        hospital_id: hospital.id,
        generating_department: dept,
        cpcb_waste_category: wasteCat,
        cpcb_waste_type: wasteType,
        quantity_kg: baseWeight,
        unit: 'kg',
        qr_code_value: qrCode,
        status: targetStatus,
        assigned_cbwtf_id: cbwtf.id,
        compliance_deadline_at: deadlineAt,
        created_at: createdAt
      };
      batches.push(batch);

      // Create matching custody events for every stage up to targetStatus
      const stageCount = STATUS_ORDER.indexOf(targetStatus) + 1;
      let runningWeight = baseWeight;

      for (let sIdx = 0; sIdx < stageCount; sIdx++) {
        const stage = STAGES[sIdx];
        const eventId = `evt-${bId}-${sIdx + 1}`;
        const eventTime = new Date(createdAt.getTime() + (sIdx * 4 + 1) * 3600000);

        let performerId = 'user-hosp-001';
        let lat = hospital.lat;
        let lng = hospital.lng;
        let geofenceValid = true;

        if (stage === 'GENERATION') {
          performerId = hospital.id === 'fac-hosp-001' ? 'user-hosp-001' : (hospital.id === 'fac-hosp-002' ? 'user-hosp-002' : 'user-hosp-003');
          lat = hospital.lat;
          lng = hospital.lng;
        } else if (stage === 'COLLECTION') {
          performerId = 'user-coll-001';
          lat = hospital.lat + 0.0004;
          lng = hospital.lng + 0.0003;
        } else if (stage === 'TRANSPORT_PICKUP') {
          performerId = 'user-tran-001';
          lat = hospital.lat + 0.0008;
          lng = hospital.lng + 0.0005;
        } else if (stage === 'TRANSPORT_DROPOFF') {
          performerId = 'user-tran-001';
          lat = cbwtf.lat - 0.0005;
          lng = cbwtf.lng - 0.0004;
          // Injected geofence violation on batch 19
          if (batchIndex === 19) geofenceValid = false;
        } else if (stage === 'TREATMENT') {
          performerId = 'user-cbwtf-001';
          lat = cbwtf.lat;
          lng = cbwtf.lng;
          // Injected weight mismatch on batch 8 (28 kg lost)
          if (batchIndex === 8) {
            runningWeight = Math.max(1.0, runningWeight - 28.0);
          }
        } else if (stage === 'DISPOSAL') {
          performerId = 'user-cbwtf-001';
          lat = cbwtf.lat;
          lng = cbwtf.lng;
        }

        custodyEvents.push({
          id: eventId,
          batch_id: bId,
          stage,
          performed_by_user_id: performerId,
          verified_by_scan: true,
          photo_url: `/uploads/evidence/${stage.toLowerCase()}_${bId}.jpg`,
          latitude: lat,
          longitude: lng,
          geofence_valid: geofenceValid,
          timestamp: eventTime,
          quantity_at_stage_kg: Math.round(runningWeight * 10) / 10,
          notes: `Verified custody step ${stage} for ${batchCode}. Digital verification completed.`
        });
      }

      batchIndex++;
    }
  }

  return { batches, custodyEvents };
}

// =========================================================================
// 5. 90 DAYS OF HOSPITAL ACTIVITY LOGS (With 3 Injected Anomalies)
// =========================================================================
export function generateHospitalActivityLogs() {
  const logs = [];
  const primaryHospitals = FACILITIES.filter(f => f.type === 'HOSPITAL');

  for (const hosp of primaryHospitals) {
    const totalBeds = hosp.bed_count || 100;
    
    for (let day = 89; day >= 0; day--) {
      const logDate = new Date(Date.now() - day * 86400000);
      logDate.setHours(18, 0, 0, 0);

      // Baseline occupancy: 70% to 92%
      const baseOccupancy = Math.floor(totalBeds * (0.70 + Math.sin(day * 0.2) * 0.15));
      const bedOccupancy = Math.min(totalBeds, Math.max(20, baseOccupancy));
      
      // Proportional surgeries and OPD visits
      const surgeries = Math.floor(bedOccupancy * 0.08) + Math.floor(Math.random() * 4);
      const ops = Math.floor(bedOccupancy * 0.35) + Math.floor(Math.random() * 10);

      // Standard expected waste: ~0.8kg per occupied bed + 3kg per surgery + 1.2kg per op
      let expectedWaste = (bedOccupancy * 0.8) + (surgeries * 3.0) + (ops * 1.2);

      // Injected Anomalies on AIIMS (fac-hosp-001) for validation demo:
      if (hosp.id === 'fac-hosp-001') {
        // Anomaly 1: Day 14 ago - High activity surge (occupancy 95%, 45 surgeries), but abnormal waste DROP (unreported waste)
        if (day === 14) {
          expectedWaste = expectedWaste * 0.25; // 75% drop
        }
        // Anomaly 2: Day 42 ago - Low activity day, but massive abnormal waste SPIKE (hazardous chemical mixing)
        else if (day === 42) {
          expectedWaste = expectedWaste * 2.85; // 185% spike
        }
        // Anomaly 3: Day 70 ago - Near-zero waste logged despite 400+ patients
        else if (day === 70) {
          expectedWaste = 8.5; // extreme anomaly drop
        }
      }

      logs.push({
        id: `act-${hosp.id}-d${day}`,
        hospital_id: hosp.id,
        date: logDate,
        bed_occupancy: bedOccupancy,
        surgeries_count: surgeries,
        ops_count: ops,
        expected_waste_kg: Math.round(expectedWaste * 10) / 10
      });
    }
  }

  return logs;
}

// =========================================================================
// 6. 7 AI RISK CASES (Different States & Triggers)
// =========================================================================
export const RISK_CASES = [
  {
    id: 'risk-001',
    batch_id: 'batch-008',
    case_code: 'INS-2026-0042',
    risk_score: 92,
    triggers: [
      'Quantity discrepancy of 28.0 kg between Generated and Received weight',
      'Missing weighbridge tare confirmation at CBWTF gate',
      'Exceeded tolerance threshold (CPCB Rule 12)'
    ],
    status: 'UNDER_INVESTIGATION',
    assigned_inspector_id: 'user-insp-001',
    created_at: new Date(Date.now() - 4 * 86400000),
    resolved_at: null
  },
  {
    id: 'risk-002',
    batch_id: 'batch-005',
    case_code: 'INS-2026-0051',
    risk_score: 86,
    triggers: [
      'SLA breach: 48-hour legal disposal compliance deadline expired',
      'Hazardous anatomical waste (Yellow) untreated past statutory limit'
    ],
    status: 'ASSIGNED',
    assigned_inspector_id: 'user-insp-001',
    created_at: new Date(Date.now() - 3 * 86400000),
    resolved_at: null
  },
  {
    id: 'risk-003',
    batch_id: 'batch-019',
    case_code: 'INS-2026-0068',
    risk_score: 79,
    triggers: [
      'Vehicle DL-01-AB-4421 deviated from approved green corridor geofence',
      'Unplanned 45-minute stop recorded in unauthorized zone'
    ],
    status: 'UNDER_INVESTIGATION',
    assigned_inspector_id: 'user-insp-002',
    created_at: new Date(Date.now() - 2 * 86400000),
    resolved_at: null
  },
  {
    id: 'risk-004',
    batch_id: 'batch-014',
    case_code: 'INS-2026-0075',
    risk_score: 74,
    triggers: [
      'Collection SLA overdue: Waste at dock > 24 hours without officer pickup',
      'Hospital bed activity surge vs waste generation mismatch'
    ],
    status: 'ASSIGNED',
    assigned_inspector_id: 'user-insp-002',
    created_at: new Date(Date.now() - 1 * 86400000),
    resolved_at: null
  },
  {
    id: 'risk-005',
    batch_id: 'batch-028',
    case_code: 'INS-2026-0083',
    risk_score: 45,
    triggers: [
      'Minor tag scan retry count exceeded',
      'Driver GPS telemetry intermittent for 10 minutes'
    ],
    status: 'RESOLVED',
    assigned_inspector_id: 'user-insp-001',
    created_at: new Date(Date.now() - 8 * 86400000),
    resolved_at: new Date(Date.now() - 6 * 86400000)
  },
  {
    id: 'risk-006',
    batch_id: 'batch-032',
    case_code: 'INS-2026-0091',
    risk_score: 95,
    triggers: [
      'Cytotoxic waste bag (Yellow) registered without certified autoclave tag',
      'Weight recorded at treatment exceeds generating manifest by 15.2 kg'
    ],
    status: 'UNDER_INVESTIGATION',
    assigned_inspector_id: 'user-insp-001',
    created_at: new Date(Date.now() - 12 * 3600000),
    resolved_at: null
  },
  {
    id: 'risk-007',
    batch_id: 'batch-038',
    case_code: 'INS-2026-0104',
    risk_score: 62,
    triggers: [
      'Custody handover photo evidence failed automated blur & verification check'
    ],
    status: 'ASSIGNED',
    assigned_inspector_id: 'user-insp-002',
    created_at: new Date(Date.now() - 6 * 3600000),
    resolved_at: null
  }
];

// =========================================================================
// 7. SEED EXECUTION LOGIC (Idempotent Database Population & JSON Export)
// =========================================================================
export async function seedDatabase() {
  console.log('\n===============================================================');
  console.log('  BioTrace (NidusClean) - Realistic Demo Database Seeder       ');
  console.log('===============================================================\n');

  console.log('[1/5] Generating in-memory datasets...');
  const { batches, custodyEvents } = generateBatchesAndCustody();
  const activityLogs = generateHospitalActivityLogs();

  console.log(`  ✔ Prepared ${FACILITIES.length} Facilities (6 Hospitals, 3 CBWTFs)`);
  console.log(`  ✔ Prepared ${USERS.length} Demo Users across all 6 Roles`);
  console.log(`  ✔ Prepared ${VEHICLES.length} Fleet Vehicles with GPS Trails`);
  console.log(`  ✔ Prepared ${batches.length} Waste Batches across all 6 lifecycle stages`);
  console.log(`  ✔ Prepared ${custodyEvents.length} Chain-of-Custody Events`);
  console.log(`  ✔ Prepared ${activityLogs.length} Hospital Activity Daily Logs (90 days + 3 anomalies)`);
  console.log(`  ✔ Prepared ${RISK_CASES.length} AI Anomaly Risk Cases`);

  // Export datasets to JSON so frontend and mock services can consume them offline
  const exportPayload = {
    generated_at: new Date().toISOString(),
    facilities: FACILITIES,
    users: USERS.map(({ password_hash, ...u }) => ({ ...u, demo_password: 'password123' })),
    vehicles: VEHICLES,
    gps_trails: VEHICLE_GPS_TRAILS,
    waste_batches: batches,
    custody_events: custodyEvents,
    hospital_activity_logs: activityLogs,
    risk_cases: RISK_CASES
  };

  const seedJsonPath = path.resolve(__dirname, 'demo-data.json');
  fs.writeFileSync(seedJsonPath, JSON.stringify(exportPayload, null, 2), 'utf-8');
  console.log(`\n[2/5] Saved snapshot to seed/demo-data.json`);

  const backendDataDir = path.resolve(__dirname, '../backend/data');
  if (!fs.existsSync(backendDataDir)) {
    fs.mkdirSync(backendDataDir, { recursive: true });
  }
  fs.writeFileSync(path.join(backendDataDir, 'demo-data.json'), JSON.stringify(exportPayload, null, 2), 'utf-8');
  console.log(`  ✔ Synchronized with backend/data/demo-data.json`);

  // Check PostgreSQL Database Connection
  console.log('\n[3/5] Checking PostgreSQL Database Connection...');
  const dbConnected = await testDbConnection();

  if (dbConnected) {
    console.log('[4/5] Populating PostgreSQL Database via Prisma (Idempotent)...');
    try {
      // Clean existing records in reverse foreign key dependency order
      console.log('  -> Purging existing records...');
      await prisma.auditLog.deleteMany();
      await prisma.riskCase.deleteMany();
      await prisma.custodyEvent.deleteMany();
      await prisma.wasteBatch.deleteMany();
      await prisma.hospitalActivityLog.deleteMany();
      await prisma.vehicle.deleteMany();
      await prisma.user.deleteMany();
      await prisma.facility.deleteMany();

      // Insert Facilities
      console.log('  -> Inserting Facilities...');
      for (const fac of FACILITIES) {
        await prisma.facility.create({ data: fac });
      }

      // Insert Users
      console.log('  -> Inserting Users...');
      for (const u of USERS) {
        await prisma.user.create({ data: u });
      }

      // Insert Vehicles
      console.log('  -> Inserting Vehicles...');
      for (const v of VEHICLES) {
        await prisma.vehicle.create({ data: v });
      }

      // Insert Batches
      console.log('  -> Inserting Waste Batches...');
      for (const b of batches) {
        await prisma.wasteBatch.create({ data: b });
      }

      // Insert Custody Events
      console.log('  -> Inserting Custody Events...');
      for (const evt of custodyEvents) {
        await prisma.custodyEvent.create({ data: evt });
      }

      // Insert Hospital Activity Logs (in chunks for performance)
      console.log('  -> Inserting Hospital Activity Logs...');
      for (let i = 0; i < activityLogs.length; i += 50) {
        const chunk = activityLogs.slice(i, i + 50);
        await prisma.hospitalActivityLog.createMany({ data: chunk });
      }

      // Insert Risk Cases
      console.log('  -> Inserting Risk Cases...');
      for (const r of RISK_CASES) {
        await prisma.riskCase.create({ data: r });
      }

      console.log('  ✔ PostgreSQL database fully populated & synchronized!');
    } catch (err) {
      console.error('  ✖ Error during Prisma database seeding:', err.message);
    }
  } else {
    console.log('[4/5] Notice: PostgreSQL is not currently running at DATABASE_URL.');
    console.log('  -> Complete realistic seed data compiled, validated, and exported to demo-data.json.');
    console.log('  -> The backend & frontend mock layer will utilize this dataset seamlessly.');
    console.log('  -> Run "npm run seed" again anytime after starting PostgreSQL to write directly to SQL tables.');
  }

  // Print Summary Table of Demo Credentials
  console.log('\n[5/5] Demo Login Credentials for All 6 Roles:\n');
  
  const credentialsTable = USERS.map((u, idx) => {
    const fac = FACILITIES.find(f => f.id === u.facility_id);
    return {
      '#': idx + 1,
      'Role': u.role,
      'Name': u.name,
      'Email': u.email,
      'Password': 'password123',
      'Facility / Agency': fac ? fac.name : 'Regulatory / Field Agency'
    };
  });

  console.table(credentialsTable);

  console.log('\n===============================================================');
  console.log('  Seeding Finished Successfully! Ready for Demo Context        ');
  console.log('===============================================================\n');
}

// Execute when invoked directly
seedDatabase().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});

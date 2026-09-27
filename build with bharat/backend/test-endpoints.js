import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import wasteBatchesRouter from './routes/wasteBatches.js';
import vehiclesRouter from './routes/vehicles.js';
import hospitalsRouter from './routes/hospitals.js';
import facilitiesRouter from './routes/facilities.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/waste-batches', wasteBatchesRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/hospitals', hospitalsRouter);
app.use('/api/facilities', facilitiesRouter);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('  BioTrace Core Endpoints & Chain-of-Custody Verification Test ');
  console.log('===============================================================\n');

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // -----------------------------------------------------------------
    // SETUP: Authenticate All Required Roles
    // -----------------------------------------------------------------
    console.log('\x1b[36m[Setup] Obtaining Authenticated Role Tokens\x1b[0m');

    const loginRole = async (email, password = 'password123') => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      return data.token;
    };

    const hospToken = await loginRole('hospital@demo.com');
    const collToken = await loginRole('collection@demo.com');
    const transToken = await loginRole('transport@demo.com');
    const treatToken = await loginRole('treatment@demo.com');
    const regToken = await loginRole('regulator@demo.com');

    assert(!!hospToken, 'Obtained JWT for Hospital Authority');
    assert(!!collToken, 'Obtained JWT for Collection Officer');
    assert(!!transToken, 'Obtained JWT for Transport Officer');
    assert(!!treatToken, 'Obtained JWT for Treatment Facility');
    assert(!!regToken, 'Obtained JWT for Government Authority');

    // -----------------------------------------------------------------
    // TEST SUITE 1: POST /api/waste-batches (Creation & Initial Tagging)
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 1] POST /api/waste-batches - Batch Generation\x1b[0m');

    // Missing required fields
    const resBadBatch = await fetch(`${baseUrl}/waste-batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospToken}`
      },
      body: JSON.stringify({ hospital_id: 'fac-hosp-001' })
    });
    assert(resBadBatch.status === 400, 'POST /waste-batches returns 400 when missing fields');

    // Create valid batch
    const newBatchPayload = {
      hospital_id: 'fac-hosp-001',
      generating_department: 'Operation Theatre 2',
      cpcb_waste_category: 'Yellow',
      cpcb_waste_type: 'Anatomical Tissue & Soiled Gauze',
      quantity_kg: 18.5,
      assigned_cbwtf_id: 'fac-cbwtf-001',
      latitude: 28.5672,
      longitude: 77.2100,
      notes: 'Post-op clinical waste registered for collection'
    };

    const resCreateBatch = await fetch(`${baseUrl}/waste-batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospToken}`
      },
      body: JSON.stringify(newBatchPayload)
    });
    assert(resCreateBatch.status === 201, 'POST /waste-batches creates new batch (201)');
    const createData = await resCreateBatch.json();
    const createdBatch = createData.batch;

    assert(createdBatch && createdBatch.id, 'Batch receives unique ID');
    assert(createdBatch.batch_code && createdBatch.batch_code.startsWith('BMW-'), 'Batch code auto-generated with BMW- prefix');
    assert(createdBatch.qr_code_value && createdBatch.qr_code_value.startsWith('QR-'), 'Unique QR code generated for bag tagging');
    assert(createdBatch.status === 'GENERATED', 'Initial batch status is GENERATED');
    assert(createdBatch.custody_events && createdBatch.custody_events.length === 1, 'Initial GENERATION custody event recorded automatically');
    assert(createdBatch.custody_events[0].stage === 'GENERATION', 'Initial event stage is GENERATION');

    // -----------------------------------------------------------------
    // TEST SUITE 2: GET /api/waste-batches & Filtering
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 2] GET /api/waste-batches & Query Filters\x1b[0m');

    const resListAll = await fetch(`${baseUrl}/waste-batches`, {
      headers: { 'Authorization': `Bearer ${regToken}` }
    });
    assert(resListAll.status === 200, 'GET /waste-batches returns 200 OK');
    const allData = await resListAll.json();
    assert(Array.isArray(allData.batches) && allData.batches.length > 0, `Returns populated list of batches (count: ${allData.batches.length})`);

    // Filter by facility (using hospital token)
    const resFilterFac = await fetch(`${baseUrl}/waste-batches?facility=fac-hosp-001`, {
      headers: { 'Authorization': `Bearer ${hospToken}` }
    });
    assert(resFilterFac.status === 200, 'GET /waste-batches?facility=fac-hosp-001 returns 200 OK');
    const facData = await resFilterFac.json();
    assert(facData.batches.every(b => b.hospital_id === 'fac-hosp-001' || b.assigned_cbwtf_id === 'fac-hosp-001'), 
      'All returned batches match requested facility filter');

    // Filter by status (using regulator token)
    const resFilterStatus = await fetch(`${baseUrl}/waste-batches?status=IN_TRANSIT`, {
      headers: { 'Authorization': `Bearer ${regToken}` }
    });
    assert(resFilterStatus.status === 200, 'GET /waste-batches?status=IN_TRANSIT returns 200 OK');
    const statusData = await resFilterStatus.json();
    assert(statusData.batches.every(b => b.status === 'IN_TRANSIT'), 
      'All returned batches match requested status IN_TRANSIT');

    // -----------------------------------------------------------------
    // TEST SUITE 3: GET /api/waste-batches/:id
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 3] GET /api/waste-batches/:id - Batch Detail & History\x1b[0m');

    const resGetSingle = await fetch(`${baseUrl}/waste-batches/${createdBatch.id}`, {
      headers: { 'Authorization': `Bearer ${hospToken}` }
    });
    assert(resGetSingle.status === 200, 'GET /waste-batches/:id returns 200 OK');
    const singleData = await resGetSingle.json();
    assert(singleData.batch.id === createdBatch.id, 'Returns correct requested batch ID');
    assert(Array.isArray(singleData.batch.custody_events), 'Includes custody_events history array');

    // 404 on non-existent ID
    const res404 = await fetch(`${baseUrl}/waste-batches/non-existent-batch-uuid-9999`, {
      headers: { 'Authorization': `Bearer ${regToken}` }
    });
    assert(res404.status === 404, 'GET /waste-batches/:id returns 404 for unknown batch');

    // -----------------------------------------------------------------
    // TEST SUITE 4: POST /api/waste-batches/:id/custody-event - Chain of Custody Enforcement
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 4] Chain-of-Custody Prerequisite Enforcement\x1b[0m');

    // Currently, createdBatch only has GENERATION stage.
    // VIOLATION 1: Attempting to jump directly to TRANSPORT_PICKUP without COLLECTION
    const resSkipToPickup = await fetch(`${baseUrl}/waste-batches/${createdBatch.id}/custody-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${transToken}`
      },
      body: JSON.stringify({
        stage: 'TRANSPORT_PICKUP',
        quantity: 18.5,
        latitude: 28.5680,
        longitude: 77.2110
      })
    });
    assert(resSkipToPickup.status === 422, 'REJECTS skipping to TRANSPORT_PICKUP when COLLECTION missing (HTTP 422)');
    const skipPickupJson = await resSkipToPickup.json();
    assert(skipPickupJson.error === 'Chain of custody violation', 'Error identifies Chain of custody violation');
    assert(skipPickupJson.requiredPriorStage === 'COLLECTION', 'Error specifies COLLECTION was required prior stage');

    // VIOLATION 2: Attempting to jump directly to TREATMENT without TRANSPORT_DROPOFF
    const resSkipToTreat = await fetch(`${baseUrl}/waste-batches/${createdBatch.id}/custody-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${treatToken}`
      },
      body: JSON.stringify({
        stage: 'TREATMENT',
        quantity: 18.5
      })
    });
    assert(resSkipToTreat.status === 422, 'REJECTS skipping to TREATMENT without prior stages (HTTP 422)');

    // VALID STAGE 2: Record COLLECTION stage
    const resCollect = await fetch(`${baseUrl}/waste-batches/${createdBatch.id}/custody-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${collToken}`
      },
      body: JSON.stringify({
        stage: 'COLLECTION',
        quantity_at_stage_kg: 18.5,
        verified_by_scan: true,
        photo_url: '/uploads/evidence/collection_verified.jpg',
        latitude: 28.5675,
        longitude: 77.2105,
        notes: 'Handover verified by Collection Officer at hospital dock'
      })
    });
    assert(resCollect.status === 201, 'ACCEPTS valid COLLECTION stage following GENERATION (201)');
    const collectData = await resCollect.json();
    assert(collectData.event.stage === 'COLLECTION', 'Event recorded with stage COLLECTION');
    assert(collectData.updatedBatchStatus === 'COLLECTED', 'Batch status advanced to COLLECTED');

    // VALID STAGE 3: Now that COLLECTION exists, TRANSPORT_PICKUP must be allowed!
    const resPickup = await fetch(`${baseUrl}/waste-batches/${createdBatch.id}/custody-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${transToken}`
      },
      body: JSON.stringify({
        stage: 'TRANSPORT_PICKUP',
        quantity_at_stage_kg: 18.5,
        verified_by_scan: true,
        latitude: 28.5680,
        longitude: 77.2110,
        notes: 'Loaded onto Vehicle DL-01-AB-4421'
      })
    });
    assert(resPickup.status === 201, 'ACCEPTS valid TRANSPORT_PICKUP following COLLECTION (201)');
    const pickupData = await resPickup.json();
    assert(pickupData.updatedBatchStatus === 'IN_TRANSIT', 'Batch status advanced to IN_TRANSIT');

    // -----------------------------------------------------------------
    // TEST SUITE 5: GET /api/vehicles/:id/location & POST /api/vehicles/:id/ping
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 5] Vehicle GPS Location & Telemetry Ping\x1b[0m');

    // Get location
    const resVehLoc = await fetch(`${baseUrl}/vehicles/veh-001/location`, {
      headers: { 'Authorization': `Bearer ${transToken}` }
    });
    assert(resVehLoc.status === 200, 'GET /vehicles/:id/location returns 200 OK');
    const vehData = await resVehLoc.json();
    assert(vehData.vehicle_id === 'veh-001', 'Returns requested vehicle ID');
    assert(vehData.current_location && typeof vehData.current_location.latitude === 'number', 'Returns numeric latitude');
    assert(vehData.current_location && typeof vehData.current_location.longitude === 'number', 'Returns numeric longitude');
    assert(Array.isArray(vehData.gps_trail), 'Returns breadcrumb GPS trail');

    // Post telemetry ping
    const resPing = await fetch(`${baseUrl}/vehicles/veh-001/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${transToken}`
      },
      body: JSON.stringify({
        lat: 28.5520,
        lng: 77.2350,
        speed_kmh: 38.5
      })
    });
    assert(resPing.status === 200, 'POST /vehicles/:id/ping records telemetry (200 OK)');
    const pingData = await resPing.json();
    assert(pingData.vehicle.current_lat === 28.5520, 'Vehicle current latitude updated');

    // Test GET /api/vehicles
    const resAllVeh = await fetch(`${baseUrl}/vehicles`, {
      headers: { 'Authorization': `Bearer ${regToken}` }
    });
    assert(resAllVeh.status === 200, 'GET /vehicles returns 200 OK');
    const allVehData = await resAllVeh.json();
    assert(Array.isArray(allVehData.vehicles) && allVehData.vehicles.length >= 3, 'GET /vehicles returns fleet list');

    // Post off-corridor ping to verify geofence deviation detection
    const resDevPing = await fetch(`${baseUrl}/vehicles/veh-001/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${transToken}`
      },
      body: JSON.stringify({
        lat: 28.6500,
        lng: 77.1500,
        speed_kmh: 42.0
      })
    });
    assert(resDevPing.status === 200, 'POST /vehicles/:id/ping accepts ping outside corridor (200 OK)');
    const devPingData = await resDevPing.json();
    assert(devPingData.geofence && devPingData.geofence.valid === false, 'Detects GPS coordinate outside safe corridor');
    assert(devPingData.deviationAlert && devPingData.deviationAlert.alert === true, 'Generates real-time ROUTE_DEVIATION alert');

    // -----------------------------------------------------------------
    // TEST SUITE 6: GET /api/hospitals/:id/activity (90-Day Logs & Anomaly Detection)
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 6] GET /api/hospitals/:id/activity - 90-Day Logs & Anomaly Detection\x1b[0m');

    const resHospAct = await fetch(`${baseUrl}/hospitals/fac-hosp-001/activity`, {
      headers: { 'Authorization': `Bearer ${hospToken}` }
    });
    assert(resHospAct.status === 200, 'GET /hospitals/:id/activity returns 200 OK');
    const actData = await resHospAct.json();
    assert(actData.hospital_name === 'AIIMS Central Hospital', 'Returns hospital metadata');
    assert(actData.total_logs_analyzed === 90, 'Returns full 90-day activity timeline');
    assert(actData.anomalies_detected > 0, `Identified injected anomalies (count: ${actData.anomalies_detected})`);
    
    // Verify anomaly objects
    const hasAnomaly = actData.activity_logs.some(l => l.anomaly !== null);
    assert(hasAnomaly === true, 'Activity logs contain classified anomaly tags');

    // -----------------------------------------------------------------
    // TEST SUITE 7: GET /api/facilities & GET /api/facilities/:id
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 7] GET /api/facilities - Regulated Facilities Directory\x1b[0m');

    const resAllFac = await fetch(`${baseUrl}/facilities`, {
      headers: { 'Authorization': `Bearer ${regToken}` }
    });
    assert(resAllFac.status === 200, 'GET /facilities returns 200 OK');
    const allFacDirectoryData = await resAllFac.json();
    assert(allFacDirectoryData.total >= 9, `Returns full directory of facilities (count: ${allFacDirectoryData.total})`);

    const resHospOnly = await fetch(`${baseUrl}/facilities?type=HOSPITAL`, {
      headers: { 'Authorization': `Bearer ${regToken}` }
    });
    assert(resHospOnly.status === 200, 'GET /facilities?type=HOSPITAL returns 200 OK');
    const hospOnlyData = await resHospOnly.json();
    assert(hospOnlyData.facilities.every(f => f.type === 'HOSPITAL'), 'Filter returns only hospitals');

    const resSingleFac = await fetch(`${baseUrl}/facilities/fac-hosp-001`, {
      headers: { 'Authorization': `Bearer ${regToken}` }
    });
    assert(resSingleFac.status === 200, 'GET /facilities/:id returns 200 OK');
    const singleFacData = await resSingleFac.json();
    assert(singleFacData.facility && singleFacData.facility.id === 'fac-hosp-001', 'Returns requested facility object');
    assert(singleFacData.facility.bed_count === 500, 'Facility contains accurate bed count');

  } catch (err) {
    console.error('\nTest runner encountered an error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n===============================================================');
  console.log(`Test Execution Complete: \x1b[32m${passed} Passed\x1b[0m, \x1b[31m${failed} Failed\x1b[0m`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

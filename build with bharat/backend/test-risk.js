import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import wasteBatchesRouter from './routes/wasteBatches.js';
import vehiclesRouter from './routes/vehicles.js';
import hospitalsRouter from './routes/hospitals.js';
import riskCasesRouter from './routes/riskCases.js';
import riskEngine from './services/riskEngine.js';
import { createBatch, createCustodyEvent } from './services/dataStore.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/waste-batches', wasteBatchesRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/hospitals', hospitalsRouter);
app.use('/api/risk-cases', riskCasesRouter);

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
  console.log('  BioTrace AI Risk Engine & Risk Cases Automated Test Suite    ');
  console.log('===============================================================\n');

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // -----------------------------------------------------------------
    // SETUP: Authenticate Inspector & Collection Officer
    // -----------------------------------------------------------------
    const loginRole = async (email, password = 'password123') => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      return data.token;
    };

    const inspToken = await loginRole('inspector@demo.com');
    const collToken = await loginRole('collection@demo.com');
    const regToken = await loginRole('regulator@demo.com');

    // -----------------------------------------------------------------
    // TEST SUITE 1: Rule-Based Evaluation Dimensions
    // -----------------------------------------------------------------
    console.log('\x1b[36m[Suite 1] Rule Evaluation Dimensions & Risk Scoring\x1b[0m');

    // Create a clean batch
    const cleanBatch = await createBatch({
      hospital_id: 'fac-hosp-001',
      generating_department: 'ICU',
      cpcb_waste_category: 'Yellow',
      quantity_kg: 20.0,
      performed_by_user_id: 'user-hosp-001',
      latitude: 28.5672,
      longitude: 77.2100
    });

    const cleanEval = await riskEngine.evaluate(cleanBatch.id);
    assert(cleanEval.riskScore === 0, `Clean single-event batch evaluates to 0 risk score (actual: ${cleanEval.riskScore})`);
    assert(cleanEval.isHighRisk === false, 'Clean batch is not marked high risk');

    // Create an anomalous batch (weight discrepancy + route deviation)
    const anomalyBatch = await createBatch({
      hospital_id: 'fac-hosp-001',
      generating_department: 'Oncology',
      cpcb_waste_category: 'Red',
      quantity_kg: 50.0,
      performed_by_user_id: 'user-hosp-001'
    });

    // Add custody event with 40% weight drop (50kg -> 30kg)
    await createCustodyEvent(anomalyBatch.id, {
      stage: 'COLLECTION',
      quantity_at_stage_kg: 30.0,
      verified_by_scan: true,
      notes: 'Dock collection'
    });

    // Add transport pickup with geofence deviation
    await createCustodyEvent(anomalyBatch.id, {
      stage: 'TRANSPORT_PICKUP',
      quantity_at_stage_kg: 30.0,
      latitude: 28.6500, // Off corridor
      longitude: 77.1500,
      geofence_valid: false,
      verified_by_scan: true
    });

    const anomalyEval = await riskEngine.evaluate(anomalyBatch.id);
    assert(anomalyEval.riskScore >= 55, `Anomalous batch score is >= 55 (actual: ${anomalyEval.riskScore})`);
    assert(anomalyEval.triggers.some(t => t.includes('Quantity discrepancy') || t.includes('Weight loss') || t.includes('weight')), 'Triggers include Quantity discrepancy');
    assert(anomalyEval.triggers.some(t => t.includes('Route deviation') || t.includes('corridor') || t.includes('geofence')), 'Triggers include Route deviation');

    // -----------------------------------------------------------------
    // TEST SUITE 2: Auto Case Creation on High Risk (>= 70)
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 2] Auto-Case Creation Trigger (Score >= 70)\x1b[0m');

    // Add an off-hours spike to escalate score over 70
    await createCustodyEvent(anomalyBatch.id, {
      stage: 'TRANSPORT_DROPOFF',
      quantity_at_stage_kg: 22.0, // further drop
      latitude: 28.5355,
      longitude: 77.2731,
      verified_by_scan: false
    });

    const highRiskEval = await riskEngine.evaluate(anomalyBatch.id);
    assert(highRiskEval.riskScore >= 70, `Composite score crossed threshold >= 70 (actual: ${highRiskEval.riskScore})`);
    assert(highRiskEval.isHighRisk === true, 'Flagged as high risk');
    assert(highRiskEval.riskCase !== null, 'Automatically generated an assigned risk case');
    assert(highRiskEval.riskCase.case_code.startsWith('INS-'), 'Case code received INS- prefix');
    assert(highRiskEval.riskCase.status === 'ASSIGNED', 'Initial case status is ASSIGNED');
    assert(highRiskEval.riskCase.assigned_inspector_id !== null, 'Inspector automatically assigned to case');

    // -----------------------------------------------------------------
    // TEST SUITE 3: Auto-Evaluation on POST /api/waste-batches/:id/custody-event
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 3] Custody Event Handover Endpoint Auto-Evaluation\x1b[0m');

    const testBatch3 = await createBatch({
      hospital_id: 'fac-hosp-002',
      generating_department: 'Pathology',
      cpcb_waste_category: 'White',
      quantity_kg: 10.0
    });

    const resCustodyWithEval = await fetch(`${baseUrl}/waste-batches/${testBatch3.id}/custody-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${collToken}`
      },
      body: JSON.stringify({
        stage: 'COLLECTION',
        quantity_at_stage_kg: 10.0,
        verified_by_scan: true,
        photo_url: '/uploads/evidence/test_coll.jpg'
      })
    });
    assert(resCustodyWithEval.status === 201, 'Custody event recorded successfully (201)');
    const custodyRespJson = await resCustodyWithEval.json();
    assert(custodyRespJson.risk_evaluation !== undefined, 'Response automatically includes risk_evaluation payload');
    assert(typeof custodyRespJson.risk_evaluation.riskScore === 'number', 'risk_evaluation contains numeric riskScore');

    // -----------------------------------------------------------------
    // TEST SUITE 4: GET /api/risk-cases & Filtering
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 4] GET /api/risk-cases - Filtering & Listing\x1b[0m');

    const resListCases = await fetch(`${baseUrl}/risk-cases`, {
      headers: { 'Authorization': `Bearer ${inspToken}` }
    });
    assert(resListCases.status === 200, 'GET /risk-cases returns 200 OK');
    const casesJson = await resListCases.json();
    assert(Array.isArray(casesJson.risk_cases) && casesJson.count > 0, `Returns populated risk cases (count: ${casesJson.count})`);

    // Filter by status
    const resFilterStatus = await fetch(`${baseUrl}/risk-cases?status=UNDER_INVESTIGATION`, {
      headers: { 'Authorization': `Bearer ${inspToken}` }
    });
    assert(resFilterStatus.status === 200, 'GET /risk-cases?status=UNDER_INVESTIGATION returns 200 OK');
    const underInvestJson = await resFilterStatus.json();
    assert(underInvestJson.risk_cases.every(c => c.status === 'UNDER_INVESTIGATION'), 'All filtered cases have status UNDER_INVESTIGATION');

    // Filter by min_score
    const resFilterScore = await fetch(`${baseUrl}/risk-cases?min_score=80`, {
      headers: { 'Authorization': `Bearer ${inspToken}` }
    });
    assert(resFilterScore.status === 200, 'GET /risk-cases?min_score=80 returns 200 OK');
    const highScoresJson = await resFilterScore.json();
    assert(highScoresJson.risk_cases.every(c => c.risk_score >= 80), 'All filtered cases have risk_score >= 80');

    // -----------------------------------------------------------------
    // TEST SUITE 5: GET /api/risk-cases/:id
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 5] GET /api/risk-cases/:id - Case Detail View\x1b[0m');

    const sampleCaseId = casesJson.risk_cases[0].id;
    const resGetCase = await fetch(`${baseUrl}/risk-cases/${sampleCaseId}`, {
      headers: { 'Authorization': `Bearer ${inspToken}` }
    });
    assert(resGetCase.status === 200, 'GET /risk-cases/:id returns 200 OK');
    const caseDetailJson = await resGetCase.json();
    assert(caseDetailJson.risk_case && caseDetailJson.risk_case.id === sampleCaseId, 'Returns matching case ID');
    assert(Array.isArray(caseDetailJson.risk_case.triggers), 'Case contains triggers array');
    assert(caseDetailJson.risk_case.batch !== undefined, 'Case contains linked batch details');

    // 404 for non-existent case
    const resCase404 = await fetch(`${baseUrl}/risk-cases/non-existent-case-id-9999`, {
      headers: { 'Authorization': `Bearer ${inspToken}` }
    });
    assert(resCase404.status === 404, 'GET /risk-cases/:id returns 404 for unknown case');

    // -----------------------------------------------------------------
    // TEST SUITE 6: POST /api/risk-cases/:id/action (Inspector Workflow)
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 6] POST /api/risk-cases/:id/action - Inspector Actions & Audit Log\x1b[0m');

    // Missing action parameter
    const resBadAction = await fetch(`${baseUrl}/risk-cases/${highRiskEval.riskCase.id}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${inspToken}`
      },
      body: JSON.stringify({})
    });
    assert(resBadAction.status === 400, 'POST /action without action returns 400 Bad Request');

    // Action 1: INVESTIGATE
    const resInvestigate = await fetch(`${baseUrl}/risk-cases/${highRiskEval.riskCase.id}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${inspToken}`
      },
      body: JSON.stringify({
        action: 'INVESTIGATE',
        notes: 'Inspector Deshmukh commenced field investigation.',
        inspector_id: 'user-insp-001'
      })
    });
    assert(resInvestigate.status === 200, 'Action INVESTIGATE returns 200 OK');
    const investJson = await resInvestigate.json();
    assert(investJson.risk_case.status === 'UNDER_INVESTIGATION', 'Case transitioned to UNDER_INVESTIGATION');
    assert(investJson.action_log && investJson.action_log.action === 'RISK_CASE_INVESTIGATE', 'Audit log entry recorded');

    // Action 2: ESCALATE
    const resEscalate = await fetch(`${baseUrl}/risk-cases/${highRiskEval.riskCase.id}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${inspToken}`
      },
      body: JSON.stringify({
        action: 'ESCALATE',
        notes: 'Notice of violation dispatched to CPCB regulatory authority.'
      })
    });
    assert(resEscalate.status === 200, 'Action ESCALATE returns 200 OK');

    // Action 3: RESOLVE
    const resResolve = await fetch(`${baseUrl}/risk-cases/${highRiskEval.riskCase.id}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${inspToken}`
      },
      body: JSON.stringify({
        action: 'RESOLVE',
        notes: 'Discrepancy reconciled. Re-weighing certificate received and approved.'
      })
    });
    assert(resResolve.status === 200, 'Action RESOLVE returns 200 OK');
    const resolveJson = await resResolve.json();
    assert(resolveJson.risk_case.status === 'RESOLVED', 'Case status changed to RESOLVED');
    assert(resolveJson.risk_case.resolved_at !== null, 'resolved_at timestamp populated upon resolution');

    // -----------------------------------------------------------------
    // TEST SUITE 7: POST /api/risk-cases/run-sla-check
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 7] POST /api/risk-cases/run-sla-check - Scheduled SLA Scanner\x1b[0m');

    const resSlaCheck = await fetch(`${baseUrl}/risk-cases/run-sla-check`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${regToken}` }
    });
    assert(resSlaCheck.status === 200, 'POST /run-sla-check returns 200 OK');
    const slaJson = await resSlaCheck.json();
    assert(slaJson.total_active_batches_scanned > 0, `Scanned active non-disposed batches (count: ${slaJson.total_active_batches_scanned})`);
    assert(Array.isArray(slaJson.evaluations), 'Returns evaluated batches array');

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

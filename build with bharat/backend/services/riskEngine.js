import { getBatchById, getBatches, createOrUpdateRiskCase } from './dataStore.js';
import { ROLES } from '../constants/roles.js';

/**
 * Valid performer roles expected for each lifecycle stage
 */
const EXPECTED_STAGE_ROLES = {
  GENERATION: [ROLES.HOSPITAL_AUTHORITY],
  COLLECTION: [ROLES.COLLECTION_OFFICER],
  TRANSPORT_PICKUP: [ROLES.TRANSPORT_OFFICER],
  TRANSPORT_DROPOFF: [ROLES.TRANSPORT_OFFICER],
  TREATMENT: [ROLES.TREATMENT_FACILITY],
  DISPOSAL: [ROLES.TREATMENT_FACILITY]
};

/**
 * Evaluates risk anomalies for a given waste batch and computes composite risk score (0-100).
 * If the score is >= 70, automatically creates/updates an assigned inspection case.
 * 
 * @param {string} batchId - Waste batch ID
 * @returns {Promise<{batchId: string, riskScore: number, triggers: string[], caseCreated: boolean, riskCase: object|null}>}
 */
export async function evaluate(batchId, extraViolationData = null) {
  const batch = await getBatchById(batchId);
  if (!batch) {
    throw new Error(`Cannot evaluate risk: Waste batch '${batchId}' not found.`);
  }

  const events = batch.custody_events || [];
  const triggers = [];
  let score = 0;

  // -------------------------------------------------------------------------
  // RULE 1: Quantity Mismatch (+30 pts)
  // Evaluates weight differences between consecutive custody stages
  // -------------------------------------------------------------------------
  let hasQuantityMismatch = false;
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];

    const prevQty = parseFloat(prev.quantity_at_stage_kg);
    const currQty = parseFloat(curr.quantity_at_stage_kg);

    if (prevQty > 0 && currQty > 0) {
      const diffKg = Math.abs(currQty - prevQty);
      const diffPct = (diffKg / prevQty) * 100;

      // Flag if difference exceeds 5% or >= 5 kg
      if (diffPct > 5.0 || diffKg >= 5.0) {
        hasQuantityMismatch = true;
        triggers.push(
          `Quantity discrepancy: difference of ${diffKg.toFixed(1)} kg (${diffPct.toFixed(1)}%) recorded between ${prev.stage} and ${curr.stage}`
        );
      }
    }
  }
  if (hasQuantityMismatch) {
    score += 30;
  }

  // -------------------------------------------------------------------------
  // RULE 2: Route Deviation / Geofence Breach (+25 pts)
  // Evaluates transport telemetry for transit corridor violations
  // -------------------------------------------------------------------------
  let hasRouteDeviation = false;
  for (const evt of events) {
    if (evt.geofence_valid === false) {
      hasRouteDeviation = true;
      triggers.push(
        `Route deviation: transit GPS coordinates at stage ${evt.stage} deviated outside approved green corridor`
      );
    }
  }
  if (hasRouteDeviation) {
    score += 25;
  }

  // -------------------------------------------------------------------------
  // RULE 3: Unauthorized Activity (+25 pts)
  // Checks if stage was logged by an unauthorized role
  // -------------------------------------------------------------------------
  let hasUnauthorizedRole = false;
  for (const evt of events) {
    const userRole = evt.performed_by?.role;
    if (userRole) {
      const allowedRoles = EXPECTED_STAGE_ROLES[evt.stage] || [];
      if (!allowedRoles.includes(userRole)) {
        hasUnauthorizedRole = true;
        triggers.push(
          `Unauthorized activity: ${evt.stage} recorded by user '${evt.performed_by.name}' with role '${userRole}'`
        );
      }
    }
  }
  if (hasUnauthorizedRole) {
    score += 25;
  }

  // -------------------------------------------------------------------------
  // RULE 4: Missing Verification (+20 pts)
  // Evaluates QR scan confirmation and photo evidence capture
  // -------------------------------------------------------------------------
  let hasMissingVerification = false;
  for (const evt of events) {
    if (evt.verified_by_scan === false) {
      hasMissingVerification = true;
      triggers.push(
        `Missing verification: ${evt.stage} handover recorded without digital QR tag scan confirmation`
      );
    }
    if (!evt.photo_url || evt.photo_url.trim() === '') {
      hasMissingVerification = true;
      triggers.push(
        `Missing verification: mandatory visual photo evidence absent at ${evt.stage}`
      );
    }
  }
  if (hasMissingVerification) {
    score += 20;
  }

  // -------------------------------------------------------------------------
  // RULE 5: Time / SLA Violations (+15 pts)
  // Checks statutory 48-hour compliance deadlines and inter-stage delays
  // -------------------------------------------------------------------------
  const now = new Date();
  if (batch.compliance_deadline_at) {
    const deadline = new Date(batch.compliance_deadline_at);
    if (now > deadline && batch.status !== 'DISPOSED') {
      score += 15;
      triggers.push(
        `Time/SLA violation: 48-hour statutory compliance deadline exceeded for batch ${batch.batch_code}`
      );
    }
  }

  // Check inter-stage delays (> 24 hours)
  for (let i = 1; i < events.length; i++) {
    const prevTime = new Date(events[i - 1].timestamp).getTime();
    const currTime = new Date(events[i].timestamp).getTime();
    const diffHours = (currTime - prevTime) / 3600000;

    if (diffHours > 24) {
      score += 10;
      triggers.push(
        `Excessive transit delay: ${diffHours.toFixed(1)} hours elapsed between ${events[i - 1].stage} and ${events[i].stage}`
      );
      break;
    }
  }

  // -------------------------------------------------------------------------
  // RULE 6: Broken Chain of Custody / Missing Lifecycle Stages (+50 pts, Min Score 85)
  // Evaluates out-of-order or missing lifecycle stages:
  // GENERATED -> COLLECTED -> IN_TRANSIT -> RECEIVED_AT_CBWTF -> TREATED/DISPOSED
  // -------------------------------------------------------------------------
  let hasBrokenChain = false;
  const stageSequence = [
    'GENERATION',
    'COLLECTION',
    'TRANSPORT_PICKUP',
    'TRANSPORT_DROPOFF',
    'TREATMENT',
    'DISPOSAL'
  ];

  const recordedStages = events.map(e => e.stage);

  // Check 6A: Sequential stage continuity in logged custody events
  let highestSequenceIndex = -1;
  for (const stg of recordedStages) {
    const idx = stageSequence.indexOf(stg);
    if (idx !== -1) {
      if (highestSequenceIndex === -1 && idx > 0) {
        hasBrokenChain = true;
        const missing = stageSequence.slice(0, idx);
        triggers.push(
          `Broken chain of custody: initial event is ${stg}, skipping mandatory initial stages: ${missing.join(', ')}`
        );
      } else if (highestSequenceIndex !== -1 && idx > highestSequenceIndex + 1) {
        hasBrokenChain = true;
        const missing = stageSequence.slice(highestSequenceIndex + 1, idx);
        triggers.push(
          `Broken chain of custody: lifecycle jumped from ${stageSequence[highestSequenceIndex]} to ${stg}, skipping mandatory stages: ${missing.join(', ')}`
        );
      } else if (highestSequenceIndex !== -1 && idx < highestSequenceIndex) {
        hasBrokenChain = true;
        triggers.push(
          `Broken chain of custody: out-of-sequence event logged (${stg} recorded after ${stageSequence[highestSequenceIndex]})`
        );
      }
      highestSequenceIndex = Math.max(highestSequenceIndex, idx);
    }
  }

  // Check 6B: Batch status vs custody events (e.g. status marked IN_TREATMENT without prior pickup/intake)
  const statusToPrereqIndex = {
    'COLLECTED': 1,
    'IN_TRANSIT': 2,
    'RECEIVED_AT_CBWTF': 3,
    'RECEIVED': 3,
    'IN_TREATMENT': 4,
    'TREATED': 4,
    'DISPOSED': 5
  };
  const expectedMaxIndex = statusToPrereqIndex[batch.status];
  if (expectedMaxIndex !== undefined && expectedMaxIndex > 0) {
    for (let s = 0; s < expectedMaxIndex; s++) {
      const requiredStage = stageSequence[s];
      if (!recordedStages.includes(requiredStage)) {
        hasBrokenChain = true;
        triggers.push(
          `Broken chain of custody: batch status is '${batch.status}' but mandatory prior stage '${requiredStage}' is missing from ledger`
        );
      }
    }
  }

  // Check 6C: Attempted broken chain violation flag on batch
  const violation = extraViolationData || batch.broken_chain_attempt;
  if (violation) {
    hasBrokenChain = true;
    triggers.push(
      `Broken chain of custody: illegal handover attempted to '${violation.attemptedStage}' while prior stage '${violation.requiredPriorStage}' was never completed`
    );
  }

  if (hasBrokenChain) {
    // Score jumps immediately to HIGH / CRITICAL (>= 75, minimum 85)
    score = Math.max(score + 50, 85);
  }

  // Clamp composite score between 0 and 100
  const compositeRiskScore = Math.min(100, Math.max(0, score));

  // -------------------------------------------------------------------------
  // AUTO-CASE CREATION THRESHOLD (Score >= 70)
  // -------------------------------------------------------------------------
  let riskCase = null;
  let caseCreated = false;

  if (compositeRiskScore >= 70) {
    // Determine assigned inspector
    const inspectorId = compositeRiskScore > 85 ? 'user-insp-001' : 'user-insp-002';
    const caseType = hasBrokenChain ? 'BROKEN_CHAIN_OF_CUSTODY' : 'ANOMALY_DETECTION';

    const caseResult = await createOrUpdateRiskCase({
      batch_id: batch.id,
      risk_score: compositeRiskScore,
      triggers,
      type: caseType,
      case_type: caseType,
      assigned_inspector_id: inspectorId
    });

    riskCase = caseResult.riskCase;
    caseCreated = caseResult.created;
  }

  return {
    batchId: batch.id,
    batchCode: batch.batch_code,
    riskScore: compositeRiskScore,
    isHighRisk: compositeRiskScore >= 70,
    triggers,
    evaluatedAt: new Date().toISOString(),
    caseCreated,
    riskCase
  };
}

/**
 * Scans all non-disposed batches and runs SLA compliance evaluations
 */
export async function runSlaCheck() {
  const allBatches = await getBatches();
  const activeBatches = allBatches.filter(b => b.status !== 'DISPOSED');
  const now = new Date();

  const results = [];
  let casesGenerated = 0;

  for (const batch of activeBatches) {
    const deadline = batch.compliance_deadline_at ? new Date(batch.compliance_deadline_at) : null;
    const isOverdue = deadline && now > deadline;

    // Run evaluation on batches that are overdue or have potential risks
    if (isOverdue || (batch._count && batch._count.custody_events > 1)) {
      try {
        const evalResult = await evaluate(batch.id);
        results.push(evalResult);
        if (evalResult.caseCreated) {
          casesGenerated++;
        }
      } catch (err) {
        console.warn(`[Risk Engine] SLA check failed on batch ${batch.id}:`, err.message);
      }
    }
  }

  return {
    total_active_batches_scanned: activeBatches.length,
    batches_evaluated: results.length,
    new_cases_generated: casesGenerated,
    evaluations: results
  };
}

export default {
  evaluate,
  runSlaCheck
};

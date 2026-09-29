import express from 'express';
import { 
  getBatches, 
  getBatchById, 
  createBatch, 
  createCustodyEvent,
  recordBrokenChainAttempt,
  STAGE_SEQUENCE 
} from '../services/dataStore.js';
import riskEngine from '../services/riskEngine.js';
import { emitCustodyEvent, emitRiskAlert } from '../services/eventBus.js';
import { authenticateToken, authorizeRoles, ROLES } from '../middleware/auth.js';
import { prisma } from '../db.js';
import { 
  processEvidencePhoto, 
  attachSignedUrlsToBatch, 
  getSignedEvidenceUrl 
} from '../services/storageService.js';

const router = express.Router();

/**
 * GET /api/waste-batches
 * Returns waste batches, strictly facility-scoped by role:
 * - HOSPITAL_AUTHORITY: only their own hospital batches
 * - TREATMENT_FACILITY: only their own CBWTF facility batches
 * - COLLECTION_OFFICER / TRANSPORT_OFFICER: facility unit assigned batches
 * - COMPLIANCE_INSPECTOR / GOVERNMENT_AUTHORITY: statewide visibility
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { facility, status } = req.query;
    const user = req.user;

    const filterOptions = { status };

    // Enforce Facility Scoping by Role:
    if (user.role === ROLES.HOSPITAL_AUTHORITY) {
      filterOptions.hospitalId = user.facility_id;
    } else if (user.role === ROLES.TREATMENT_FACILITY) {
      filterOptions.cbwtfId = user.facility_id;
    } else if (user.role === ROLES.COLLECTION_OFFICER) {
      if (user.facility_id) filterOptions.facility = user.facility_id;
    } else if (user.role === ROLES.TRANSPORT_OFFICER) {
      if (user.facility_id) filterOptions.facility = user.facility_id;
    } else {
      // Inspectors & Regulators
      if (facility) filterOptions.facility = facility;
    }

    const batches = await getBatches(filterOptions);
    
    res.status(200).json({
      count: batches.length,
      filters: filterOptions,
      batches
    });
  } catch (err) {
    console.error('[WasteBatches Route] GET / error:', err);
    res.status(500).json({ error: 'Failed to fetch waste batches', message: err.message });
  }
});

/**
 * GET /api/waste-batches/:id
 * Returns detailed view of a waste batch including chronological custody events
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const batch = await getBatchById(id);

    if (!batch) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Waste batch '${id}' was not found.`
      });
    }

    // Facility scoping check for single batch
    if (user.role === ROLES.HOSPITAL_AUTHORITY && user.facility_id && batch.hospital_id !== user.facility_id) {
      return res.status(403).json({
        error: 'Forbidden: Scoped facility access violation',
        message: `Hospital Authority cannot access batches from another facility.`
      });
    }

    if (user.role === ROLES.TREATMENT_FACILITY && user.facility_id && batch.assigned_cbwtf_id !== user.facility_id) {
      return res.status(403).json({
        error: 'Forbidden: Scoped facility access violation',
        message: `Treatment facility cannot access batches assigned to another facility.`
      });
    }

    const enrichedBatch = await attachSignedUrlsToBatch(batch);
    res.status(200).json({ batch: enrichedBatch });
  } catch (err) {
    console.error('[WasteBatches Route] GET /:id error:', err);
    res.status(500).json({ error: 'Failed to fetch waste batch details', message: err.message });
  }
});

/**
 * POST /api/waste-batches
 * Creates a new waste batch at point of generation.
 * STRICT RBAC: Only HOSPITAL_AUTHORITY can register point-of-generation batches.
 * STRICT SCOPING: Can only register for their own hospital.
 */
router.post('/', authenticateToken, authorizeRoles(ROLES.HOSPITAL_AUTHORITY), async (req, res) => {
  try {
    const {
      generating_department,
      cpcb_waste_category,
      cpcb_waste_type,
      quantity_kg,
      assigned_cbwtf_id,
      notes,
      latitude,
      longitude,
      photo_url
    } = req.body || {};

    const hospital_id = req.user.facility_id || req.body.hospital_id;

    if (!hospital_id || !generating_department || !cpcb_waste_category || quantity_kg === undefined) {
      return res.status(400).json({
        error: 'Missing required batch fields',
        message: 'hospital_id, generating_department, cpcb_waste_category, and quantity_kg are required.'
      });
    }

    // Verify performer verification status
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (dbUser && dbUser.verification_status !== 'VERIFIED') {
      return res.status(403).json({
        error: 'Forbidden: Verification status not verified',
        message: `Action Prohibited: Your personnel verification status is ${dbUser.verification_status}. Contact your facility administrator.`
      });
    }

    const performedBy = req.user.id;

    // Process initial evidence photo through Supabase Storage if Base64
    let resolvedPhotoUrl = photo_url;
    if (photo_url) {
      try {
        resolvedPhotoUrl = await processEvidencePhoto(photo_url, { batchId: 'new-batch', stage: 'GENERATION' });
      } catch (photoErr) {
        return res.status(photoErr.statusCode || 400).json({
          error: photoErr.name || 'Bad Request',
          message: photoErr.message
        });
      }
    }

    const batch = await createBatch({
      hospital_id,
      generating_department,
      cpcb_waste_category,
      cpcb_waste_type,
      quantity_kg,
      assigned_cbwtf_id,
      notes,
      latitude,
      longitude,
      photo_url: resolvedPhotoUrl,
      performed_by_user_id: performedBy
    });

    res.status(201).json({
      message: 'Waste batch successfully registered with initial QR tag.',
      batch
    });
  } catch (err) {
    console.error('[WasteBatches Route] POST / error:', err);
    res.status(500).json({ error: 'Failed to create waste batch', message: err.message });
  }
});

/**
 * POST /api/waste-batches/:id/custody-event
 * Logs a stage handover for an existing waste batch.
 * STRICT RBAC: Authorized operational roles only, stage-matched to role.
 */
router.post('/:id/custody-event', authenticateToken, authorizeRoles(
  ROLES.COLLECTION_OFFICER,
  ROLES.TRANSPORT_OFFICER,
  ROLES.TREATMENT_FACILITY
), async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const {
      stage,
      quantity_at_stage_kg,
      quantity,
      verified_by_scan,
      photo_url,
      latitude,
      longitude,
      geofence_valid,
      timestamp,
      notes
    } = req.body || {};

    if (!stage) {
      return res.status(400).json({
        error: 'Missing stage parameter',
        message: `Field 'stage' is required. Valid stages: ${STAGE_SEQUENCE.join(', ')}`
      });
    }

    // Role-to-stage verification
    const STAGE_PERMITTED_ROLES = {
      'COLLECTION': [ROLES.COLLECTION_OFFICER],
      'TRANSPORT_PICKUP': [ROLES.TRANSPORT_OFFICER],
      'TRANSPORT_DROPOFF': [ROLES.TRANSPORT_OFFICER],
      'TREATMENT': [ROLES.TREATMENT_FACILITY],
      'DISPOSAL': [ROLES.TREATMENT_FACILITY]
    };

    if (STAGE_PERMITTED_ROLES[stage] && !STAGE_PERMITTED_ROLES[stage].includes(user.role)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient role permissions for this stage',
        message: `Role '${user.role}' cannot log '${stage}' custody events. Required roles: ${STAGE_PERMITTED_ROLES[stage].join(', ')}`
      });
    }

    // Verify performer verification status
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (dbUser && dbUser.verification_status !== 'VERIFIED') {
      return res.status(403).json({
        error: 'Forbidden: Verification status not verified',
        message: `Action Prohibited: Your personnel verification status is ${dbUser.verification_status}. Contact your facility administrator.`
      });
    }

    const performerId = user.id;

    // Process evidence photo through Supabase Storage if Base64
    let resolvedPhotoUrl = photo_url;
    if (photo_url) {
      try {
        resolvedPhotoUrl = await processEvidencePhoto(photo_url, { batchId: id, stage });
      } catch (photoErr) {
        return res.status(photoErr.statusCode || 400).json({
          error: photoErr.name || 'Bad Request',
          message: photoErr.message
        });
      }
    }

    const result = await createCustodyEvent(id, {
      stage,
      quantity_at_stage_kg: quantity_at_stage_kg || quantity,
      verified_by_scan: verified_by_scan !== false,
      photo_url: resolvedPhotoUrl,
      latitude,
      longitude,
      geofence_valid,
      timestamp,
      notes,
      performed_by_user_id: performerId
    });

    if (result.error) {
      if (result.error === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: result.message });
      }

      if (result.error === 'CHAIN_OF_CUSTODY_VIOLATION') {
        const violationData = {
          attemptedStage: result.attemptedStage,
          requiredPriorStage: result.requiredPriorStage,
          completedStages: result.completedStages,
          timestamp: new Date().toISOString()
        };
        // Record broken chain violation attempt on the batch
        await recordBrokenChainAttempt(id, violationData);

        // Automatically trigger AI Risk Engine evaluation for broken chain
        let riskEvaluation = null;
        try {
          riskEvaluation = await riskEngine.evaluate(id, violationData);
          if (riskEvaluation?.riskCase) {
            emitRiskAlert(riskEvaluation.riskCase);
          }
        } catch (evalErr) {
          console.warn(`[Risk Engine] Auto-evaluation on chain violation notice:`, evalErr.message);
        }

        return res.status(422).json({
          error: 'Chain of custody violation',
          message: result.message,
          requiredPriorStage: result.requiredPriorStage,
          attemptedStage: result.attemptedStage,
          completedStages: result.completedStages,
          risk_evaluation: riskEvaluation,
          risk_case: riskEvaluation?.riskCase
        });
      }

      return res.status(400).json({ error: result.error, message: result.message });
    }

    // Automatically trigger AI Risk Engine evaluation
    let riskEvaluation = null;
    try {
      riskEvaluation = await riskEngine.evaluate(id);
      if (riskEvaluation?.riskCase) {
        emitRiskAlert(riskEvaluation.riskCase);
      }
    } catch (evalErr) {
      console.warn(`[Risk Engine] Auto-evaluation notice for batch ${id}:`, evalErr.message);
    }

    // Broadcast custody event via EventBus -> Socket.IO
    emitCustodyEvent(id, result.event, result.updatedBatchStatus);

    // Attach signed URL for immediate client feedback if stored in Supabase
    let eventResponse = result.event;
    if (result.event?.photo_url && result.event.photo_url.startsWith('batches/')) {
      const signedUrl = await getSignedEvidenceUrl(result.event.photo_url);
      eventResponse = { ...result.event, signed_photo_url: signedUrl };
    }

    res.status(201).json({
      message: `Custody handover verified and recorded for stage '${stage}'.`,
      event: eventResponse,
      updatedBatchStatus: result.updatedBatchStatus,
      risk_evaluation: riskEvaluation
    });
  } catch (err) {
    console.error('[WasteBatches Route] POST /:id/custody-event error:', err);
    res.status(500).json({ error: 'Failed to record custody event', message: err.message });
  }
});

/**
 * GET /api/waste-batches/:id/evidence/:eventId/signed-url
 * Generates an on-demand short-lived signed URL for a specific custody event photo
 */
router.get('/:id/evidence/:eventId/signed-url', authenticateToken, async (req, res) => {
  try {
    const { id, eventId } = req.params;
    const batch = await getBatchById(id);

    if (!batch) {
      return res.status(404).json({ error: 'Not Found', message: `Waste batch '${id}' was not found.` });
    }

    const event = (batch.custody_events || []).find((e) => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Not Found', message: `Custody event '${eventId}' was not found for this batch.` });
    }

    if (!event.photo_url) {
      return res.status(404).json({ error: 'Not Found', message: 'No photo evidence recorded for this custody event.' });
    }

    const signedUrl = await getSignedEvidenceUrl(event.photo_url);
    res.status(200).json({
      batchId: id,
      eventId: event.id,
      photo_url: event.photo_url,
      signedUrl: signedUrl || event.photo_url
    });
  } catch (err) {
    console.error('[WasteBatches Route] GET /:id/evidence/:eventId/signed-url error:', err);
    res.status(500).json({ error: 'Failed to generate signed URL', message: err.message });
  }
});

export default router;


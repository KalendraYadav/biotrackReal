import express from 'express';
import { getFacilities, getFacilityById, getBatches, getHospitalActivity } from '../services/dataStore.js';
import { authenticateToken, authorizeRoles, ROLES } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/facilities
 * Returns all registered hospitals and CBWTFs with optional type/city filter.
 * Protected by JWT authentication.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, city } = req.query;
    const user = req.user;
    const facilities = await getFacilities({ type, city });

    // Enrich with active batches count
    const allBatches = await getBatches();
    const enriched = facilities.map(f => {
      const facilityBatches = allBatches.filter(
        b => b.hospital_id === f.id || b.assigned_cbwtf_id === f.id
      );
      const activeCount = facilityBatches.filter(
        b => b.status !== 'DISPOSED'
      ).length;
      return {
        ...f,
        total_batches_count: facilityBatches.length,
        active_batches_count: activeCount
      };
    });

    res.status(200).json({
      total: enriched.length,
      facilities: enriched
    });
  } catch (err) {
    console.error('[Facilities Route] GET / error:', err);
    res.status(500).json({ error: 'Failed to retrieve facilities', message: err.message });
  }
});

/**
 * GET /api/facilities/:id
 * Retrieves single facility with summary activity metrics.
 * STRICT SCOPING: Hospital Authority can only inspect their own facility.
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Scoping check for Hospital Authority
    if (user.role === ROLES.HOSPITAL_AUTHORITY && user.facility_id && user.facility_id !== id) {
      return res.status(403).json({
        error: 'Forbidden: Scoped facility access violation',
        message: `Hospital Authority cannot access facility details for '${id}'.`
      });
    }

    const facility = await getFacilityById(id);

    if (!facility) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Facility with ID '${id}' was not found.`
      });
    }

    const allBatches = await getBatches({ facility: id });
    let activitySummary = null;
    if (facility.type === 'HOSPITAL') {
      try {
        activitySummary = await getHospitalActivity(id);
      } catch {
        // Fall through
      }
    }

    res.status(200).json({
      facility,
      batches_count: allBatches.length,
      active_batches: allBatches.filter(b => b.status !== 'DISPOSED'),
      activity_analysis: activitySummary
    });
  } catch (err) {
    console.error('[Facilities Route] GET /:id error:', err);
    res.status(500).json({ error: 'Failed to retrieve facility', message: err.message });
  }
});

export default router;

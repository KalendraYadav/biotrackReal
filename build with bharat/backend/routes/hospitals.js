import express from 'express';
import { getHospitalActivity } from '../services/dataStore.js';
import { authenticateToken, authorizeRoles, ROLES } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/hospitals/:id/activity
 * Retrieves 90 days of hospital daily activity logs, bed occupancy, surgery count,
 * expected waste volume, and AI anomaly detection flags for activity validation.
 * STRICT SCOPING: Hospital Authority can only access activity logs for their own hospital.
 * STRICT RBAC: Accessible only to Hospital Authority, Compliance Inspector, and Government Authority.
 */
router.get('/:id/activity', authenticateToken, authorizeRoles(
  ROLES.HOSPITAL_AUTHORITY,
  ROLES.COMPLIANCE_INSPECTOR,
  ROLES.GOVERNMENT_AUTHORITY
), async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Hospital Authority can only inspect their own hospital data
    if (user.role === ROLES.HOSPITAL_AUTHORITY && user.facility_id && user.facility_id !== id) {
      return res.status(403).json({
        error: 'Forbidden: Scoped facility access violation',
        message: `Hospital Authority is restricted to viewing facility '${user.facility_id}'. Access to '${id}' denied.`
      });
    }

    const result = await getHospitalActivity(id);

    if (!result) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Hospital facility with ID '${id}' was not found.`
      });
    }

    res.status(200).json({
      hospital_id: result.hospital.id,
      hospital_name: result.hospital.name,
      city: result.hospital.city,
      bed_count: result.hospital.bed_count,
      total_logs_analyzed: result.total_logs,
      anomalies_detected: result.anomalies_detected,
      statistics: result.statistics,
      activity_logs: result.logs
    });
  } catch (err) {
    console.error('[Hospitals Route] GET /:id/activity error:', err);
    res.status(500).json({ error: 'Failed to retrieve hospital activity logs', message: err.message });
  }
});

export default router;

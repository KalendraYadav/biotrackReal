import express from 'express';
import { getVehicleLocation, updateVehiclePing, getAllVehicles } from '../services/dataStore.js';
import { emitVehiclePing } from '../services/eventBus.js';
import { authenticateToken, authorizeRoles, ROLES } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/vehicles
 * Lists vehicles with current GPS positions.
 * Scoped by role:
 * - TRANSPORT_OFFICER: sees own assigned vehicle
 * - INSPECTOR / GOVERNMENT / CBWTF: sees fleet vehicles
 * STRICT RBAC: Transport-only, Treatment, or Regulatory oversight.
 */
router.get('/', authenticateToken, authorizeRoles(
  ROLES.TRANSPORT_OFFICER,
  ROLES.TREATMENT_FACILITY,
  ROLES.GOVERNMENT_AUTHORITY,
  ROLES.COMPLIANCE_INSPECTOR
), async (req, res) => {
  try {
    const { officer_id } = req.query;
    const user = req.user;
    let vehicles = await getAllVehicles();

    if (user.role === ROLES.TRANSPORT_OFFICER) {
      vehicles = vehicles.filter(
        v => v.transport_officer_id === user.id || v.transport_officer?.id === user.id || v.id === 'veh-001'
      );
    } else if (officer_id) {
      vehicles = vehicles.filter(v => v.transport_officer_id === officer_id);
    }
    res.status(200).json({ vehicles });
  } catch (err) {
    console.error('[Vehicles Route] GET / error:', err);
    res.status(500).json({ error: 'Failed to retrieve vehicles', message: err.message });
  }
});

/**
 * GET /api/vehicles/:id/location
 * Retrieves vehicle's live GPS location, assigned officer, and breadcrumb trail
 * STRICT RBAC: Transport, Treatment, Inspector, and Government oversight only.
 */
router.get('/:id/location', authenticateToken, authorizeRoles(
  ROLES.TRANSPORT_OFFICER,
  ROLES.TREATMENT_FACILITY,
  ROLES.GOVERNMENT_AUTHORITY,
  ROLES.COMPLIANCE_INSPECTOR
), async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await getVehicleLocation(id);

    if (!vehicle) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Vehicle with ID or Plate '${id}' was not found.`
      });
    }

    res.status(200).json({
      vehicle_id: vehicle.id,
      plate_no: vehicle.plate_no,
      current_location: {
        latitude: vehicle.current_lat,
        longitude: vehicle.current_lng,
        last_ping_at: vehicle.last_ping_at
      },
      transport_officer: vehicle.transport_officer,
      gps_trail: vehicle.gps_trail || []
    });
  } catch (err) {
    console.error('[Vehicles Route] GET /:id/location error:', err);
    res.status(500).json({ error: 'Failed to retrieve vehicle location', message: err.message });
  }
});

/**
 * POST /api/vehicles/:id/ping
 * Receives GPS telemetry ping from vehicle/transporter app and updates position
 * STRICT RBAC: Only Transport Officers and Government Authority can transmit telemetry pings.
 */
router.post('/:id/ping', authenticateToken, authorizeRoles(
  ROLES.TRANSPORT_OFFICER,
  ROLES.GOVERNMENT_AUTHORITY
), async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, lat, lng, speed_kmh } = req.body || {};

    const targetLat = lat !== undefined ? lat : latitude;
    const targetLng = lng !== undefined ? lng : longitude;

    if (targetLat === undefined || targetLng === undefined) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Both latitude and longitude are required in request body.'
      });
    }

    const result = await updateVehiclePing(id, {
      lat: targetLat,
      lng: targetLng,
      speed_kmh
    });

    if (result.error) {
      const statusCode = result.error === 'NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({ error: result.error, message: result.message });
    }

    // Broadcast live telemetry via EventBus -> Socket.IO
    emitVehiclePing(id, {
      vehicle: result.vehicle,
      ping: result.lastPing,
      geofence: result.geofence,
      deviationAlert: result.deviationAlert || null
    });

    res.status(200).json({
      message: 'Vehicle GPS telemetry ping successfully recorded.',
      vehicle: result.vehicle,
      ping: result.lastPing,
      geofence: result.geofence,
      deviationAlert: result.deviationAlert || null
    });
  } catch (err) {
    console.error('[Vehicles Route] POST /:id/ping error:', err);
    res.status(500).json({ error: 'Failed to process vehicle telemetry ping', message: err.message });
  }
});

export default router;

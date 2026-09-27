import express from 'express';
import { prisma, isDbConnected } from '../db.js';
import { authenticateToken, authorizeRoles, ROLES } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/personnel
 * Lists personnel scoped by facility/role:
 * - HOSPITAL_AUTHORITY: staff assigned to their own hospital
 * - GOVERNMENT_AUTHORITY: all personnel statewide across all facilities
 */
router.get('/', authenticateToken, authorizeRoles(ROLES.HOSPITAL_AUTHORITY, ROLES.GOVERNMENT_AUTHORITY), async (req, res) => {
  try {
    const user = req.user;
    const where = {};

    if (user.role === ROLES.HOSPITAL_AUTHORITY) {
      if (!user.facility_id) {
        return res.status(400).json({ error: 'Hospital authority missing assigned facility_id' });
      }
      where.facility_id = user.facility_id;
    }

    const personnel = await prisma.user.findMany({
      where,
      include: {
        facility: {
          select: { id: true, name: true, type: true, city: true }
        },
        vehicles: {
          select: { id: true, plate_no: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const safePersonnel = personnel.map(({ password_hash, ...u }) => ({
      ...u,
      assigned_facility: u.facility ? u.facility.name : 'Unassigned / Field Unit',
      assigned_vehicle: u.vehicles && u.vehicles.length > 0 ? u.vehicles[0].plate_no : null
    }));

    res.status(200).json({
      count: safePersonnel.length,
      personnel: safePersonnel
    });
  } catch (err) {
    console.error('[Personnel Route] GET / error:', err);
    res.status(500).json({ error: 'Failed to fetch personnel directory', message: err.message });
  }
});

/**
 * PUT /api/personnel/:id/verify
 * Verifies or rejects personnel assignment
 * - Logs action to audit_log
 * - Enforces facility scoping for Hospital Authority
 */
router.put('/:id/verify', authenticateToken, authorizeRoles(ROLES.HOSPITAL_AUTHORITY, ROLES.GOVERNMENT_AUTHORITY), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const actor = req.user;

    if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid verification status. Must be VERIFIED, REJECTED, or PENDING.' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { facility: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Personnel member not found' });
    }

    // Hospital Authority scoping check
    if (actor.role === ROLES.HOSPITAL_AUTHORITY && targetUser.facility_id !== actor.facility_id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Hospital Authority can only verify/reject personnel assigned to their own facility.'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { verification_status: status }
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        actor_user_id: actor.id,
        action: `PERSONNEL_VERIFICATION_${status}`,
        entity: 'User',
        entity_id: id,
        timestamp: new Date()
      }
    });

    const { password_hash, ...safeUser } = updatedUser;

    res.status(200).json({
      message: `Personnel ${safeUser.name} status updated to ${status}`,
      personnel: safeUser
    });
  } catch (err) {
    console.error('[Personnel Route] PUT /:id/verify error:', err);
    res.status(500).json({ error: 'Failed to update verification status', message: err.message });
  }
});

export default router;

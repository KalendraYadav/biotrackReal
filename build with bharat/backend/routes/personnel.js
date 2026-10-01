import express from 'express';
import { prisma, isDbConnected } from '../db.js';
import { authenticateToken, authorizeRoles, ROLES } from '../middleware/auth.js';
import { isValidRole, isValidVerificationStatus } from '../constants/roles.js';

const router = express.Router();

/**
 * GET /api/personnel
 * Lists personnel scoped by statutory authority & jurisdiction:
 * - GOVERNMENT_AUTHORITY & COMPLIANCE_INSPECTOR: Statewide jurisdiction (all facilities & field units)
 * - HOSPITAL_AUTHORITY: Scoped strictly to personnel belonging to their own hospital facility
 * - TREATMENT_FACILITY: Scoped strictly to personnel belonging to their own CBWTF / organization
 */
router.get(
  '/',
  authenticateToken,
  authorizeRoles(
    ROLES.HOSPITAL_AUTHORITY,
    ROLES.TREATMENT_FACILITY,
    ROLES.GOVERNMENT_AUTHORITY,
    ROLES.COMPLIANCE_INSPECTOR
  ),
  async (req, res) => {
    try {
      const user = req.user;
      const { status, role, search } = req.query || {};
      const where = {};

      // Facility Scoping Enforcement
      if (user.role === ROLES.HOSPITAL_AUTHORITY || user.role === ROLES.TREATMENT_FACILITY) {
        if (!user.facility_id) {
          return res.status(400).json({
            error: 'Facility scope missing',
            message: 'Authority account is missing an assigned facility_id.'
          });
        }
        where.facility_id = user.facility_id;
      }

      // Optional filters
      if (status && status !== 'ALL') {
        if (isValidVerificationStatus(status)) {
          where.verification_status = status;
        }
      }

      if (role && role !== 'ALL') {
        if (isValidRole(role)) {
          where.role = role;
        }
      }

      if (search && search.trim()) {
        const q = search.trim();
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone_number: { contains: q } }
        ];
      }

      const personnel = await prisma.user.findMany({
        where,
        include: {
          facility: {
            select: { id: true, name: true, type: true, city: true, cpcb_registration_no: true }
          },
          vehicles: {
            select: { id: true, plate_no: true }
          },
          audit_logs: {
            where: { entity: 'User' },
            orderBy: { timestamp: 'desc' },
            take: 3,
            select: { id: true, action: true, timestamp: true, actor_user_id: true }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      const safePersonnel = personnel.map(({ password_hash, ...u }) => ({
        ...u,
        assigned_facility: u.facility ? u.facility.name : 'Unassigned / Field Unit',
        assigned_vehicle: u.vehicles && u.vehicles.length > 0 ? u.vehicles[0].plate_no : null,
        recent_audit_history: u.audit_logs || []
      }));

      res.status(200).json({
        count: safePersonnel.length,
        jurisdiction:
          user.role === ROLES.GOVERNMENT_AUTHORITY || user.role === ROLES.COMPLIANCE_INSPECTOR
            ? 'Statewide CPCB / SPCB Regulatory Jurisdiction'
            : user.facility_name || 'Local Facility Scope',
        personnel: safePersonnel
      });
    } catch (err) {
      console.error('[Personnel Route] GET / error:', err);
      res.status(500).json({ error: 'Failed to fetch personnel directory', message: err.message });
    }
  }
);

/**
 * PUT /api/personnel/:id/verify
 * Verification & Role Lifecycle Management endpoint:
 * Enforces the BIOTrace Governance Authority Matrix:
 * - Hospital Authority: can verify/reject/suspend own hospital personnel
 * - Treatment Facility: can verify/reject/suspend own CBWTF personnel
 * - Government Authority: can verify/reject/suspend/reinstate/revoke any regulated account
 * - Compliance Inspector: strictly forbidden from administrative mutations (read/flag only)
 * - Self-verification / self-promotion is strictly rejected
 * - Permanent REVOKED status can only be granted by Government Authority
 * - Requires mandatory reason for SUSPENDED, REJECTED, and REVOKED
 * - Generates immutable AuditLog entry
 */
router.put(
  '/:id/verify',
  authenticateToken,
  authorizeRoles(ROLES.HOSPITAL_AUTHORITY, ROLES.TREATMENT_FACILITY, ROLES.GOVERNMENT_AUTHORITY),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason, approved_role } = req.body || {};
      const actor = req.user;

      if (!status || !['VERIFIED', 'REJECTED', 'SUSPENDED', 'REVOKED', 'PENDING'].includes(status)) {
        return res.status(400).json({
          error: 'Invalid verification status',
          message: 'Status must be one of: VERIFIED, REJECTED, SUSPENDED, REVOKED, PENDING.'
        });
      }

      // Self-Verification Guard: No user may approve, reject, suspend, or revoke themselves
      if (actor.id === id) {
        return res.status(403).json({
          error: 'Forbidden: Self-action prohibited',
          message: 'You cannot verify, reject, suspend, or revoke your own account.'
        });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id },
        include: { facility: true }
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'Personnel record not found' });
      }

      // Terminal state guard: Revoked status is permanent and cannot be modified
      if (targetUser.verification_status === 'REVOKED') {
        return res.status(400).json({
          error: 'Terminal state violation',
          message: 'This account has been permanently REVOKED and cannot be modified.'
        });
      }

      // Reason requirement for sensitive actions
      if (['SUSPENDED', 'REJECTED', 'REVOKED'].includes(status) && (!reason || !reason.trim())) {
        return res.status(400).json({
          error: 'Administrative reason required',
          message: `A specific reason is mandatory when setting status to ${status}.`
        });
      }

      // =========================================================================
      // GOVERNANCE AUTHORITY MATRIX ENFORCEMENT
      // =========================================================================

      // 1. HOSPITAL_AUTHORITY Governance Scope
      if (actor.role === ROLES.HOSPITAL_AUTHORITY) {
        // Must belong to the same hospital facility
        if (!actor.facility_id || targetUser.facility_id !== actor.facility_id) {
          return res.status(403).json({
            error: 'Forbidden: Facility scope violation',
            message: 'Hospital Authority can only manage personnel assigned to their own hospital facility.'
          });
        }

        // Cannot manage regulatory or other facility authorities
        if (
          [
            ROLES.GOVERNMENT_AUTHORITY,
            ROLES.COMPLIANCE_INSPECTOR,
            ROLES.TREATMENT_FACILITY,
            ROLES.HOSPITAL_AUTHORITY
          ].includes(targetUser.role) &&
          targetUser.id !== actor.id
        ) {
          // If the target is another hospital authority or regulator
          if (targetUser.role === ROLES.GOVERNMENT_AUTHORITY || targetUser.role === ROLES.COMPLIANCE_INSPECTOR) {
            return res.status(403).json({
              error: 'Forbidden: Privileged role violation',
              message: 'Hospital Authority cannot verify or modify regulatory authorities or compliance inspectors.'
            });
          }
        }

        // Permanent revocation is reserved for Government Authority
        if (status === 'REVOKED') {
          return res.status(403).json({
            error: 'Forbidden: Insufficient regulatory authority',
            message: 'Permanent revocation is reserved exclusively for Government Authority. You may SUSPEND local personnel.'
          });
        }
      }

      // 2. TREATMENT_FACILITY Governance Scope
      if (actor.role === ROLES.TREATMENT_FACILITY) {
        // Must belong to the same CBWTF / treatment facility
        if (!actor.facility_id || targetUser.facility_id !== actor.facility_id) {
          return res.status(403).json({
            error: 'Forbidden: Organization scope violation',
            message: 'Treatment Facility authority can only manage personnel assigned to their own organization.'
          });
        }

        // Cannot manage regulatory or hospital authorities
        if ([ROLES.GOVERNMENT_AUTHORITY, ROLES.COMPLIANCE_INSPECTOR, ROLES.HOSPITAL_AUTHORITY].includes(targetUser.role)) {
          return res.status(403).json({
            error: 'Forbidden: Privileged role violation',
            message: 'Treatment Facility authority cannot verify or modify regulatory or hospital personnel.'
          });
        }

        // Permanent revocation reserved for Government Authority
        if (status === 'REVOKED') {
          return res.status(403).json({
            error: 'Forbidden: Insufficient regulatory authority',
            message: 'Permanent revocation is reserved exclusively for Government Authority. You may SUSPEND local personnel.'
          });
        }
      }

      // 3. Optional Role-Change Approval by Authorized Authority
      const updateData = { verification_status: status };
      let roleChangeNote = '';

      if (approved_role && approved_role !== targetUser.role) {
        if (!isValidRole(approved_role)) {
          return res.status(400).json({ error: 'Invalid approved role specified' });
        }

        // Only Government Authority can approve regulatory roles
        if (
          (approved_role === ROLES.GOVERNMENT_AUTHORITY || approved_role === ROLES.COMPLIANCE_INSPECTOR) &&
          actor.role !== ROLES.GOVERNMENT_AUTHORITY
        ) {
          return res.status(403).json({
            error: 'Forbidden: Regulatory appointment restricted',
            message: 'Only Government Authority can appoint or approve regulatory roles.'
          });
        }

        updateData.role = approved_role;
        roleChangeNote = ` | Role Changed: ${targetUser.role} -> ${approved_role}`;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData
      });

      // Determine clean action name for audit log
      let actionType = `USER_${status}`;
      if (status === 'VERIFIED') {
        actionType = targetUser.verification_status === 'SUSPENDED' ? 'USER_REINSTATED' : 'USER_VERIFIED';
      }

      const auditActionString = `${actionType}${roleChangeNote} | Previous: ${targetUser.verification_status} | New: ${status}${
        reason ? ` | Reason: ${reason.trim()}` : ''
      } | Target: ${targetUser.name} (${updatedUser.role}) | Facility: ${targetUser.facility ? targetUser.facility.name : 'Unassigned'}`;

      // Immutable AuditLog Record
      await prisma.auditLog.create({
        data: {
          actor_user_id: actor.id,
          action: auditActionString,
          entity: 'User',
          entity_id: id,
          timestamp: new Date()
        }
      });

      const { password_hash: _h, ...safeUser } = updatedUser;

      res.status(200).json({
        message: `Personnel ${safeUser.name} status updated to ${status}${roleChangeNote}`,
        personnel: safeUser,
        audit_action: actionType
      });
    } catch (err) {
      console.error('[Personnel Route] PUT /:id/verify error:', err);
      res.status(500).json({ error: 'Failed to update verification status', message: err.message });
    }
  }
);

/**
 * POST /api/personnel/:id/flag
 * Compliance Inspector Audit Flagging:
 * - Allows Compliance Inspectors and Government Authorities to record inspection flags or report findings
 * - Does NOT mutate administrative authorization or arbitrarily ban accounts
 * - Creates an auditable compliance inspection record
 */
router.post(
  '/:id/flag',
  authenticateToken,
  authorizeRoles(ROLES.COMPLIANCE_INSPECTOR, ROLES.GOVERNMENT_AUTHORITY),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { finding, notes, severity } = req.body || {};
      const actor = req.user;

      if (!finding && !notes) {
        return res.status(400).json({
          error: 'Missing inspection finding',
          message: 'An inspection finding or compliance note is required.'
        });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id },
        include: { facility: true }
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'Personnel record not found' });
      }

      const auditAction = `PERSONNEL_FLAGGED_FOR_AUDIT | Severity: ${severity || 'STANDARD'} | Target: ${
        targetUser.name
      } (${targetUser.role}) | Finding: ${finding || notes} | Inspector: ${actor.name}`;

      await prisma.auditLog.create({
        data: {
          actor_user_id: actor.id,
          action: auditAction,
          entity: 'User',
          entity_id: id,
          timestamp: new Date()
        }
      });

      res.status(200).json({
        message: `Personnel ${targetUser.name} flagged for regulatory compliance audit.`,
        target_id: id,
        severity: severity || 'STANDARD',
        finding: finding || notes
      });
    } catch (err) {
      console.error('[Personnel Route] POST /:id/flag error:', err);
      res.status(500).json({ error: 'Failed to flag personnel for audit', message: err.message });
    }
  }
);

/**
 * POST /api/personnel/:id/request-role-change
 * Request a formal role change:
 * - Creates a role change request without instant self-promotion
 * - Marks status as PENDING if approved by governance workflow
 * - Prohibits self-requesting regulatory roles
 */
router.post('/:id/request-role-change', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { requested_role, reason } = req.body || {};
    const actor = req.user;

    // Must be the user themselves or an authorized administrator
    if (actor.id !== id && actor.role !== ROLES.GOVERNMENT_AUTHORITY) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only request a role change for your own account.'
      });
    }

    if (!requested_role || !isValidRole(requested_role)) {
      return res.status(400).json({
        error: 'Invalid requested role',
        message: `Requested role '${requested_role}' is not a valid statutory role.`
      });
    }

    if (requested_role === ROLES.GOVERNMENT_AUTHORITY || requested_role === ROLES.COMPLIANCE_INSPECTOR) {
      return res.status(403).json({
        error: 'Forbidden: Regulatory self-request prohibited',
        message: 'Regulatory roles cannot be self-requested. Contact an authorized government administrator.'
      });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Record the request in AuditLog
    await prisma.auditLog.create({
      data: {
        actor_user_id: actor.id,
        action: `ROLE_CHANGE_REQUESTED | Current: ${targetUser.role} | Requested: ${requested_role}${
          reason ? ` | Reason: ${reason}` : ''
        }`,
        entity: 'User',
        entity_id: id,
        timestamp: new Date()
      }
    });

    res.status(200).json({
      message: `Role change request for ${requested_role} submitted successfully. It will be reviewed by the authorized authority.`,
      current_role: targetUser.role,
      requested_role: requested_role
    });
  } catch (err) {
    console.error('[Personnel Route] POST /:id/request-role-change error:', err);
    res.status(500).json({ error: 'Failed to request role change', message: err.message });
  }
});

export default router;

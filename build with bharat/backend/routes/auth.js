import express from 'express';
import { authenticateCredentials, findUserById, hashPassword, DEMO_USERS } from '../services/authService.js';
import { authenticateToken, authorizeRoles, ROLES } from '../middleware/auth.js';
import { isValidRole } from '../constants/roles.js';
import { prisma } from '../db.js';
import { authLoginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Public login endpoint with email and password
 * Validates credentials via bcrypt, checks verification lifecycle, and issues signed JWT
 */
router.post('/login', authLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Missing required credentials',
        message: 'Both email and password are required'
      });
    }

    const result = await authenticateCredentials(email, password);
    if (!result.success) {
      return res.status(result.status || 401).json({
        error: result.error || 'Authentication failed',
        code: result.code || 'AUTH_FAILED',
        message: result.error || 'Invalid email or password'
      });
    }

    res.status(200).json({
      message: 'Login successful',
      token: result.token,
      user: result.user
    });
  } catch (err) {
    console.error('[Auth Route] Login error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

/**
 * POST /api/auth/register
 * Real-user statutory onboarding:
 * - Public endpoint for registering personnel with real credentials
 * - Creates user account in PENDING status
 * - Strictly prohibits public self-registration for privileged regulatory roles (GOVERNMENT_AUTHORITY, COMPLIANCE_INSPECTOR)
 * - Logs registration event in audit log
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone_number, facility_id } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Missing required registration fields',
        code: 'MISSING_FIELDS',
        message: 'Name, email, password, and requested operational role are required.'
      });
    }

    // Standard email validation (accepts public & institutional domains e.g. @example.com, @gmail.com)
    // Institutional email domain verification is intentionally NOT required for MVP
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL',
        message: 'Please provide a valid email address (e.g. name@example.com).'
      });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        error: 'Password requirements not met',
        code: 'INVALID_PASSWORD',
        message: 'Password must be at least 6 characters long.'
      });
    }

    if (!isValidRole(role)) {
      return res.status(400).json({
        error: 'Invalid operational role requested',
        code: 'INVALID_ROLE',
        message: `Role '${role}' is not a recognized statutory role.`
      });
    }

    // STRICT GOVERNANCE RULE: Privileged regulatory roles cannot be self-requested
    if (role === ROLES.GOVERNMENT_AUTHORITY || role === ROLES.COMPLIANCE_INSPECTOR) {
      return res.status(403).json({
        error: 'Forbidden: Regulatory role self-registration prohibited',
        code: 'REGULATORY_ROLE_PROHIBITED',
        message: 'Government Authority and Compliance Inspector roles cannot be self-requested. They must be provisioned by an existing authorized government authority.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      return res.status(409).json({
        error: 'Email already registered',
        code: 'DUPLICATE_EMAIL',
        message: 'An account with this email address already exists. Please log in or contact your administrator.'
      });
    }

    // Validate facility if provided
    let facility = null;
    if (facility_id) {
      facility = await prisma.facility.findUnique({ where: { id: facility_id } });
      if (!facility) {
        return res.status(400).json({
          error: 'Facility not found',
          code: 'FACILITY_NOT_FOUND',
          message: `Specified facility ID '${facility_id}' does not exist in the CPCB registry.`
        });
      }
    }

    const password_hash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password_hash,
        role,
        facility_id: facility_id || null,
        phone_number: phone_number ? phone_number.trim() : null,
        verification_status: 'PENDING'
      },
      include: { facility: true }
    });

    // Record registration audit log
    await prisma.auditLog.create({
      data: {
        actor_user_id: newUser.id,
        action: `USER_REGISTERED_PENDING | Role: ${role} | Facility: ${newUser.facility ? newUser.facility.name : 'Unassigned'}`,
        entity: 'User',
        entity_id: newUser.id,
        timestamp: new Date()
      }
    });

    const { password_hash: _h, ...safeUser } = newUser;
    if (newUser.facility) {
      safeUser.facility_name = newUser.facility.name;
      safeUser.facility_type = newUser.facility.type;
    }

    res.status(201).json({
      message: 'Account created successfully. Status: PENDING. The account requires authorized administrator verification.',
      status: 'PENDING',
      notice: 'Registration does not grant operational access. Your account will remain PENDING until an authorized administrator verifies your identity, role, and facility assignment.',
      user: safeUser
    });
  } catch (err) {
    console.error('[Auth Route] Register error:', err);
    res.status(500).json({
      error: 'Registration service error',
      code: 'SERVER_ERROR',
      message: err.message
    });
  }
});

/**
 * POST /api/auth/provision
 * Administrative provisioning endpoint:
 * - Restricted to GOVERNMENT_AUTHORITY
 * - Provisions verified regulatory or facility personnel
 */
router.post('/provision', authenticateToken, authorizeRoles(ROLES.GOVERNMENT_AUTHORITY), async (req, res) => {
  try {
    const { name, email, password, role, phone_number, facility_id } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Missing required provisioning fields',
        message: 'Name, email, password, and role are required.'
      });
    }

    if (!isValidRole(role)) {
      return res.status(400).json({
        error: 'Invalid statutory role',
        message: `Role '${role}' is not a recognized role.`
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email address already exists.'
      });
    }

    const password_hash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password_hash,
        role,
        facility_id: facility_id || null,
        phone_number: phone_number ? phone_number.trim() : null,
        verification_status: 'VERIFIED'
      },
      include: { facility: true }
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        actor_user_id: req.user.id,
        action: `USER_PROVISIONED_BY_GOVERNMENT | Target: ${newUser.name} | Role: ${role} | Facility: ${newUser.facility_id || 'N/A'}`,
        entity: 'User',
        entity_id: newUser.id,
        timestamp: new Date()
      }
    });

    const { password_hash: _h, ...safeUser } = newUser;
    res.status(201).json({
      message: `Account for ${safeUser.name} provisioned successfully with role ${role}.`,
      user: safeUser
    });
  } catch (err) {
    console.error('[Auth Route] Provision error:', err);
    res.status(500).json({
      error: 'Provisioning failed',
      message: err.message
    });
  }
});


/**
 * GET /api/auth/me
 * Protected endpoint to retrieve currently logged-in user profile
 * Enforced via authenticateToken middleware
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      // Return decoded token context if user not found in database/store
      return res.status(200).json({ user: req.user });
    }

    const { password_hash, ...safeUser } = user;
    if (user.facility) {
      safeUser.facility_name = user.facility.name;
      safeUser.facility_type = user.facility.type;
    }
    safeUser.verification_status = user.verification_status || 'VERIFIED';
    safeUser.phone_number = user.phone_number || null;
    res.status(200).json({ user: safeUser });
  } catch (err) {
    console.error('[Auth Route] /me error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile', message: err.message });
  }
});

/**
 * GET /api/auth/demo-users
 * Returns available demo user credentials for quick role switching and testing
 */
router.get('/demo-users', (req, res) => {
  // Production environment safeguard: disable in production unless demo endpoints explicitly allowed
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_ENDPOINTS !== 'true') {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Demo users endpoint is disabled in production environment.'
    });
  }

  const users = DEMO_USERS.map(({ password_hash, ...user }) => ({
    ...user,
    demo_password: 'password123'
  }));
  res.status(200).json({ demo_users: users });
});

/* =========================================================================
 * RBAC Verification Test Routes (Server-side role enforcement)
 * Each route enforces that only users possessing that specific JWT role can enter.
 * Any other role receives HTTP 403 Forbidden.
 * Missing / invalid tokens receive HTTP 401 Unauthorized.
 * In production, disabled unless ALLOW_DEMO_ENDPOINTS=true.
 * ========================================================================= */

router.use('/test', (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_ENDPOINTS !== 'true') {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Test verification endpoints are disabled in production environment.'
    });
  }
  next();
});

// 1. Hospital Authority only
router.get(
  '/test/hospital-only',
  authenticateToken,
  authorizeRoles(ROLES.HOSPITAL_AUTHORITY),
  (req, res) => {
    res.status(200).json({
      message: 'Access granted: Hospital Authority route verified.',
      user: req.user
    });
  }
);

// 2. Collection Officer only
router.get(
  '/test/collection-only',
  authenticateToken,
  authorizeRoles(ROLES.COLLECTION_OFFICER),
  (req, res) => {
    res.status(200).json({
      message: 'Access granted: Collection Officer route verified.',
      user: req.user
    });
  }
);

// 3. Transport Officer only
router.get(
  '/test/transport-only',
  authenticateToken,
  authorizeRoles(ROLES.TRANSPORT_OFFICER),
  (req, res) => {
    res.status(200).json({
      message: 'Access granted: Transport Officer route verified.',
      user: req.user
    });
  }
);

// 4. Treatment Facility only
router.get(
  '/test/treatment-only',
  authenticateToken,
  authorizeRoles(ROLES.TREATMENT_FACILITY),
  (req, res) => {
    res.status(200).json({
      message: 'Access granted: Treatment Facility route verified.',
      user: req.user
    });
  }
);

// 5. Government Authority only
router.get(
  '/test/government-only',
  authenticateToken,
  authorizeRoles(ROLES.GOVERNMENT_AUTHORITY),
  (req, res) => {
    res.status(200).json({
      message: 'Access granted: Government Authority route verified.',
      user: req.user
    });
  }
);

// 6. Compliance Inspector only
router.get(
  '/test/inspector-only',
  authenticateToken,
  authorizeRoles(ROLES.COMPLIANCE_INSPECTOR),
  (req, res) => {
    res.status(200).json({
      message: 'Access granted: Compliance Inspector route verified.',
      user: req.user
    });
  }
);

// Multi-role regulatory route (Government Authority OR Compliance Inspector)
router.get(
  '/test/regulatory',
  authenticateToken,
  authorizeRoles(ROLES.GOVERNMENT_AUTHORITY, ROLES.COMPLIANCE_INSPECTOR),
  (req, res) => {
    res.status(200).json({
      message: 'Access granted: Regulatory Authority route verified.',
      user: req.user
    });
  }
);

export default router;

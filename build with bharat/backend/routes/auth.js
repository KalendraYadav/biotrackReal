import express from 'express';
import { authenticateCredentials, findUserById, DEMO_USERS } from '../services/authService.js';
import { authenticateToken, authorizeRoles, ROLES } from '../middleware/auth.js';
import { authLoginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Public login endpoint with email and password
 * Validates credentials via bcrypt and issues a signed JWT
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
      return res.status(401).json({
        error: 'Authentication failed',
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

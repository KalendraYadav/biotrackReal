import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { ROLES, ALL_ROLES } from '../constants/roles.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'nidusclean_biotrace_super_secure_jwt_secret_2026';

/**
 * Authentication Middleware
 * Validates JWT Bearer token from Authorization header and attaches req.user
 * Returns HTTP 401 Unauthorized if token is missing, invalid, or expired.
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication token required',
      message: 'Authorization header is missing. Please provide a valid Bearer token.'
    });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication token required',
      message: 'Empty Bearer token provided in Authorization header.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        error: isExpired ? 'Unauthorized: Token expired' : 'Unauthorized: Invalid token',
        message: err.message
      });
    }

    req.user = decodedUser;
    next();
  });
}

/**
 * Role-Based Access Control (RBAC) Middleware Factory
 * Enforces server-side authorization by verifying that the authenticated user's role
 * is in the authorized roles list.
 * 
 * Rejects unauthorized requests with HTTP 403 Forbidden.
 * 
 * @param {...(string|string[])} allowedRoles - One or more role strings, or an array of roles.
 * @returns {import('express').RequestHandler}
 * 
 * @example
 * router.post('/batches', authenticateToken, authorizeRoles(ROLES.HOSPITAL_AUTHORITY), createBatch);
 * router.get('/audit', authenticateToken, authorizeRoles(ROLES.GOVERNMENT_AUTHORITY, ROLES.COMPLIANCE_INSPECTOR), getAudit);
 */
export function authorizeRoles(...allowedRoles) {
  // Support both authorizeRoles('A', 'B') and authorizeRoles(['A', 'B'])
  const roles = allowedRoles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized: Authentication required',
        message: 'No authenticated user identity found on request. Ensure authenticateToken runs first.'
      });
    }

    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient role permissions',
        message: `Role '${userRole}' is not authorized to access this route.`,
        requiredRoles: roles,
        userRole: userRole
      });
    }

    next();
  };
}

export { ROLES, ALL_ROLES };

export default {
  authenticateToken,
  authorizeRoles,
  ROLES,
  ALL_ROLES
};

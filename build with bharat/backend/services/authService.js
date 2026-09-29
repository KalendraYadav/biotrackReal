import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { prisma, isDbConnected } from '../db.js';
import { ROLES } from '../constants/roles.js';

dotenv.config();

/**
 * Resolves the JWT secret.
 * Enforces that process.env.JWT_SECRET must be set in production mode.
 * @returns {string}
 */
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY FATAL] JWT_SECRET must be configured in production environment.');
    }
    return 'nidusclean_biotrace_super_secure_jwt_secret_2026';
  }
  return secret;
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Valid bcrypt hash for password 'password123' (10 salt rounds)
const DEMO_PASSWORD_HASH = '$2b$10$3zTfm.ffiVJxe2Gyn7Apd.ZexxZxWSVe78e7An.T4J/yzmuPzEzue';

/**
 * Standard demo users for all 6 roles (15 demo users)
 * All demo users authenticate with password: 'password123'
 */
export const DEMO_USERS = [
  // 1. HOSPITAL_AUTHORITY (3 users)
  {
    id: 'user-hosp-001',
    name: 'Dr. Aarav Mehta',
    email: 'hospital@demo.com',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.HOSPITAL_AUTHORITY,
    facility_id: 'fac-hosp-001',
    facility_name: 'AIIMS Central Hospital',
    facility_type: 'HOSPITAL'
  },
  {
    id: 'user-hosp-002',
    name: 'Dr. Priya Nair',
    email: 'priya.nair@apollo.demo',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.HOSPITAL_AUTHORITY,
    facility_id: 'fac-hosp-002',
    facility_name: 'Apollo Speciality Hospital',
    facility_type: 'HOSPITAL'
  },
  {
    id: 'user-hosp-003',
    name: 'Dr. Rohan Verma',
    email: 'rohan.verma@lilavati.demo',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.HOSPITAL_AUTHORITY,
    facility_id: 'fac-hosp-005',
    facility_name: 'Lilavati Hospital & Research Centre',
    facility_type: 'HOSPITAL'
  },

  // 2. COLLECTION_OFFICER (3 users)
  {
    id: 'user-coll-001',
    name: 'Meera Iyer',
    email: 'collection@demo.com',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.COLLECTION_OFFICER,
    facility_id: 'fac-cbwtf-001',
    facility_name: 'EcoSafe Waste Handlers (CBWTF Central)',
    facility_type: 'COLLECTION_UNIT'
  },
  {
    id: 'user-coll-002',
    name: 'Suresh Kumar',
    email: 'suresh.kumar@demo.com',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.COLLECTION_OFFICER,
    facility_id: 'fac-cbwtf-002',
    facility_name: 'Apex Bio-Clean Treatment Plant',
    facility_type: 'COLLECTION_UNIT'
  },
  {
    id: 'user-coll-003',
    name: 'Deepak Chauhan',
    email: 'deepak.chauhan@demo.com',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.COLLECTION_OFFICER,
    facility_id: 'fac-cbwtf-003',
    facility_name: 'GreenEarth Bio-Disposal Hub',
    facility_type: 'COLLECTION_UNIT'
  },

  // 3. TRANSPORT_OFFICER (3 users)
  {
    id: 'user-tran-001',
    name: 'Vikram Singh',
    email: 'transport@demo.com',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.TRANSPORT_OFFICER,
    facility_id: 'fac-cbwtf-001',
    facility_name: 'BioTransit Fleet DL-01-AB-4421',
    facility_type: 'LOGISTICS'
  },
  {
    id: 'user-tran-002',
    name: 'Rajesh Shinde',
    email: 'rajesh.shinde@demo.com',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.TRANSPORT_OFFICER,
    facility_id: 'fac-cbwtf-002',
    facility_name: 'Apex Bio-Transit MH-04-CD-8812',
    facility_type: 'LOGISTICS'
  },
  {
    id: 'user-tran-003',
    name: 'Harpreet Singh',
    email: 'harpreet.singh@demo.com',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.TRANSPORT_OFFICER,
    facility_id: 'fac-cbwtf-003',
    facility_name: 'GreenEarth Fleet KA-05-EF-3390',
    facility_type: 'LOGISTICS'
  },

  // 4. TREATMENT_FACILITY (2 users)
  {
    id: 'user-cbwtf-001',
    name: 'Rajesh Patel',
    email: 'treatment@demo.com',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.TREATMENT_FACILITY,
    facility_id: 'fac-cbwtf-001',
    facility_name: 'EcoSafe Waste Handlers (CBWTF Central)',
    facility_type: 'CBWTF'
  },
  {
    id: 'user-cbwtf-002',
    name: 'Anand Joshi',
    email: 'anand.joshi@demo.com',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.TREATMENT_FACILITY,
    facility_id: 'fac-cbwtf-002',
    facility_name: 'Apex Bio-Clean Treatment Plant',
    facility_type: 'CBWTF'
  },

  // 5. GOVERNMENT_AUTHORITY (2 users)
  {
    id: 'user-govt-001',
    name: 'Sunita Sharma',
    email: 'regulator@demo.com',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.GOVERNMENT_AUTHORITY,
    facility_id: null,
    facility_name: 'Central Pollution Control Board (CPCB)',
    facility_type: 'REGULATORY'
  },
  {
    id: 'user-govt-002',
    name: 'K. V. Swaminathan',
    email: 'swaminathan@spcb.demo',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.GOVERNMENT_AUTHORITY,
    facility_id: null,
    facility_name: 'State Pollution Control Board (SPCB South)',
    facility_type: 'REGULATORY'
  },

  // 6. COMPLIANCE_INSPECTOR (2 users)
  {
    id: 'user-insp-001',
    name: 'Amit Deshmukh',
    email: 'inspector@demo.com',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.COMPLIANCE_INSPECTOR,
    facility_id: null,
    facility_name: 'National Waste Compliance Audit Unit',
    facility_type: 'INSPECTION_AGENCY'
  },
  {
    id: 'user-insp-002',
    name: 'Ananya Ray',
    email: 'ananya.ray@inspector.demo',
    password_hash: DEMO_PASSWORD_HASH,
    role: ROLES.COMPLIANCE_INSPECTOR,
    facility_id: null,
    facility_name: 'Western Region BMW Inspection Bureau',
    facility_type: 'INSPECTION_AGENCY'
  }
];

/**
 * Hashes a plaintext password using bcrypt with 10 salt rounds
 * @param {string} plainText 
 * @returns {Promise<string>}
 */
export async function hashPassword(plainText) {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Invalid plainText password provided for hashing');
  }
  const saltRounds = 10;
  return bcrypt.hash(plainText, saltRounds);
}

/**
 * Compares plaintext password against a bcrypt hash
 * @param {string} plainText 
 * @param {string} hash 
 * @returns {Promise<boolean>}
 */
export async function comparePassword(plainText, hash) {
  if (!plainText || !hash) return false;
  return bcrypt.compare(plainText, hash);
}

/**
 * Generates a signed JWT for the authenticated user
 * @param {object} user 
 * @returns {string}
 */
export function generateToken(user) {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    facility_id: user.facility_id || null,
    facility_name: user.facility_name || user.facility?.name || null,
    facility_type: user.facility_type || user.facility?.type || null,
    verification_status: user.verification_status || 'VERIFIED',
    phone_number: user.phone_number || null
  };

  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Finds user by email in database, with fallback to demo users in development only
 * @param {string} email 
 * @returns {Promise<object|null>}
 */
export async function findUserByEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { facility: true }
    });
    if (dbUser) return dbUser;
  } catch (err) {
    console.warn('[AuthService] findUserByEmail database query warning:', err.message);
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
  }

  // Fallback to demo in-memory list ONLY in development if database unreachable
  if (process.env.NODE_ENV !== 'production') {
    return DEMO_USERS.find(u => u.email.toLowerCase() === normalizedEmail) || null;
  }
  return null;
}

/**
 * Finds user by ID in database, with fallback to demo users in development only
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findUserById(id) {
  if (!id) return null;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id },
      include: { facility: true }
    });
    if (dbUser) return dbUser;
  } catch (err) {
    console.warn('[AuthService] findUserById database query warning:', err.message);
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    return DEMO_USERS.find(u => u.id === id) || null;
  }
  return null;
}

/**
 * Authenticates user credentials and returns JWT token and safe user payload
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{success: boolean, token?: string, user?: object, code?: string, error?: string}>}
 */
export async function authenticateCredentials(email, password) {
  if (!email || !password) {
    return { success: false, code: 'MISSING_CREDENTIALS', error: 'Both email and password are required' };
  }

  let user = null;
  try {
    user = await findUserByEmail(email);
  } catch (err) {
    return {
      success: false,
      code: 'DATABASE_ERROR',
      error: 'Database service is temporarily unavailable. Please try again later.'
    };
  }

  if (!user) {
    return { success: false, code: 'UNKNOWN_USER', error: 'Unknown user email' };
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    return { success: false, code: 'INCORRECT_PASSWORD', error: 'Incorrect password' };
  }

  const token = generateToken(user);
  const { password_hash, ...safeUser } = user;

  // Normalize facility fields if loaded from relation
  if (user.facility) {
    safeUser.facility_name = user.facility.name;
    safeUser.facility_type = user.facility.type;
  }
  safeUser.verification_status = user.verification_status || 'VERIFIED';
  safeUser.phone_number = user.phone_number || null;

  return {
    success: true,
    token,
    user: safeUser
  };
}

export default {
  DEMO_USERS,
  hashPassword,
  comparePassword,
  generateToken,
  findUserByEmail,
  findUserById,
  authenticateCredentials
};

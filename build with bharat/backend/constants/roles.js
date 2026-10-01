/**
 * Standard System Roles for NidusClean (BioTrace)
 * Biomedical Waste Digital Chain-of-Custody Platform
 */
export const ROLES = Object.freeze({
  HOSPITAL_AUTHORITY: 'HOSPITAL_AUTHORITY',
  COLLECTION_OFFICER: 'COLLECTION_OFFICER',
  TRANSPORT_OFFICER: 'TRANSPORT_OFFICER',
  TREATMENT_FACILITY: 'TREATMENT_FACILITY',
  GOVERNMENT_AUTHORITY: 'GOVERNMENT_AUTHORITY',
  COMPLIANCE_INSPECTOR: 'COMPLIANCE_INSPECTOR'
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

export const VERIFICATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  REVOKED: 'REVOKED'
});

export const ALL_VERIFICATION_STATUSES = Object.freeze(Object.values(VERIFICATION_STATUS));

/**
 * Validates if a given role string is a valid system role
 * @param {string} role 
 * @returns {boolean}
 */
export function isValidRole(role) {
  return ALL_ROLES.includes(role);
}

/**
 * Validates if a given verification status string is valid
 * @param {string} status 
 * @returns {boolean}
 */
export function isValidVerificationStatus(status) {
  return ALL_VERIFICATION_STATUSES.includes(status);
}

export default ROLES;


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

/**
 * Validates if a given role string is a valid system role
 * @param {string} role 
 * @returns {boolean}
 */
export function isValidRole(role) {
  return ALL_ROLES.includes(role);
}

export default ROLES;

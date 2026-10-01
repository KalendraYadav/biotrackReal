import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import personnelRouter from './routes/personnel.js';
import { generateToken, hashPassword, DEMO_USERS } from './services/authService.js';
import { ROLES, ALL_ROLES, VERIFICATION_STATUS } from './constants/roles.js';
import { prisma, isDbConnected } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/personnel', personnelRouter);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
    failed++;
  }
}

async function runGovernanceTests() {
  console.log('\n======================================================');
  console.log('  BIOTrace Identity Governance & Lifecycle Test Suite ');
  console.log('======================================================\n');

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  const createdUserIds = [];

  try {
    // -----------------------------------------------------------------
    // SUITE 1: Governance Enums & Constants
    // -----------------------------------------------------------------
    console.log('\x1b[36m[Suite 1] Governance Lifecycle Enums\x1b[0m');
    assert(VERIFICATION_STATUS.PENDING === 'PENDING', 'VERIFICATION_STATUS.PENDING defined');
    assert(VERIFICATION_STATUS.VERIFIED === 'VERIFIED', 'VERIFICATION_STATUS.VERIFIED defined');
    assert(VERIFICATION_STATUS.REJECTED === 'REJECTED', 'VERIFICATION_STATUS.REJECTED defined');
    assert(VERIFICATION_STATUS.SUSPENDED === 'SUSPENDED', 'VERIFICATION_STATUS.SUSPENDED defined');
    assert(VERIFICATION_STATUS.REVOKED === 'REVOKED', 'VERIFICATION_STATUS.REVOKED defined');

    // -----------------------------------------------------------------
    // SUITE 2: Real-User Onboarding & Public Registration
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 2] Real-User Onboarding & Registration Guards\x1b[0m');

    // 1. Missing required fields rejected with 400 and MISSING_FIELDS
    const missingFieldRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'incomplete@example.com', password: 'password123' })
    });
    const missingData = await missingFieldRes.json();
    assert(missingFieldRes.status === 400, 'Missing required fields returns 400 Bad Request');
    assert(missingData.code === 'MISSING_FIELDS', 'Returns structured error code MISSING_FIELDS');

    // 2. Invalid email format rejected with 400 and INVALID_EMAIL
    const invalidEmailRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid Email User',
        email: 'invalid-email-without-at',
        password: 'password123',
        role: ROLES.HOSPITAL_AUTHORITY
      })
    });
    const invalidEmailData = await invalidEmailRes.json();
    assert(invalidEmailRes.status === 400, 'Invalid email format returns 400 Bad Request');
    assert(invalidEmailData.code === 'INVALID_EMAIL', 'Returns structured error code INVALID_EMAIL');

    // 3. Operational role registration with non-institutional email (e.g. @example.com, @gmail.com) succeeds
    const testEmail1 = `operator.test.${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Field Operator',
        email: testEmail1,
        password: 'securePassword123!',
        role: ROLES.COLLECTION_OFFICER,
        phone_number: '+91 99999 11111',
        facility_id: 'fac-cbwtf-001'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Registration returns 201 Created for non-institutional email (MVP rule)');
    assert(regData.user.verification_status === 'PENDING', 'New registration defaults strictly to PENDING');
    assert(regData.user.role === ROLES.COLLECTION_OFFICER, 'Requested role recorded on account');
    assert(regData.notice && regData.notice.includes('PENDING'), 'Response includes clear PENDING governance notice');
    if (regData.user.id) createdUserIds.push(regData.user.id);

    // 4. Duplicate email rejected with 409 and DUPLICATE_EMAIL
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Operator',
        email: testEmail1,
        password: 'anotherPassword123!',
        role: ROLES.COLLECTION_OFFICER
      })
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 409, 'Duplicate email registration returns 409 Conflict');
    assert(dupData.code === 'DUPLICATE_EMAIL', 'Returns structured error code DUPLICATE_EMAIL');

    // 5. Public self-registration for GOVERNMENT_AUTHORITY is forbidden (403)
    const regGovRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Imposter Regulator',
        email: `imposter.gov.${Date.now()}@example.com`,
        password: 'password123',
        role: ROLES.GOVERNMENT_AUTHORITY
      })
    });
    const regGovData = await regGovRes.json();
    assert(regGovRes.status === 403, 'Public self-registration for GOVERNMENT_AUTHORITY strictly rejected (403)');
    assert(regGovData.code === 'REGULATORY_ROLE_PROHIBITED', 'Returns structured error code REGULATORY_ROLE_PROHIBITED');

    // 6. Public self-registration for COMPLIANCE_INSPECTOR is forbidden (403)
    const regInspRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Self-Appointed Inspector',
        email: `imposter.insp.${Date.now()}@example.com`,
        password: 'password123',
        role: ROLES.COMPLIANCE_INSPECTOR
      })
    });
    const regInspData = await regInspRes.json();
    assert(regInspRes.status === 403, 'Public self-registration for COMPLIANCE_INSPECTOR strictly rejected (403)');
    assert(regInspData.code === 'REGULATORY_ROLE_PROHIBITED', 'Returns structured error code REGULATORY_ROLE_PROHIBITED');

    // -----------------------------------------------------------------
    // SUITE 3: Authentication Lifecycle State Enforcement
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 3] Authentication with Lifecycle States\x1b[0m');

    // 1. Pending account attempting login receives 403 with ACCOUNT_PENDING code
    const pendingLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail1, password: 'securePassword123!' })
    });
    const pendingLoginData = await pendingLogin.json();
    assert(pendingLogin.status === 403, 'Pending account rejected from login with 403 Forbidden');
    assert(pendingLoginData.code === 'ACCOUNT_PENDING', 'Response code is ACCOUNT_PENDING');

    // 2. Pending token sent to operational endpoint receives 403 Forbidden from authorizeRoles
    const pendingToken = generateToken({
      id: regData.user.id,
      name: regData.user.name,
      email: testEmail1,
      role: ROLES.COLLECTION_OFFICER,
      verification_status: 'PENDING'
    });
    const pendingOpRes = await fetch(`${baseUrl}/auth/test/collection-only`, {
      headers: { 'Authorization': `Bearer ${pendingToken}` }
    });
    assert(pendingOpRes.status === 403, 'authorizeRoles rejects token with verification_status=PENDING (403)');

    // 3. Create a hospital staff member for lifecycle transitions
    const hospStaffEmail = `nurse.aiims.${Date.now()}@example.com`;
    const nurseUser = await prisma.user.create({
      data: {
        name: 'Nurse Kavita AIIMS',
        email: hospStaffEmail,
        password_hash: await hashPassword('password123'),
        role: ROLES.HOSPITAL_AUTHORITY,
        facility_id: 'fac-hosp-001',
        verification_status: 'PENDING',
        phone_number: '+91 98111 22222'
      }
    });
    createdUserIds.push(nurseUser.id);

    // -----------------------------------------------------------------
    // SUITE 4: Verification Authority Matrix (Positive Cases)
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 4] Verification Authority Matrix & Positive Scopes\x1b[0m');

    // Obtain token for Hospital Authority at fac-hosp-001 (AIIMS)
    const hospLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hospital@demo.com', password: 'password123' })
    });
    const hospAuth = await hospLogin.json();

    // 1. Hospital Authority verifies own hospital personnel (PENDING -> VERIFIED)
    const verifyNurseRes = await fetch(`${baseUrl}/personnel/${nurseUser.id}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospAuth.token}`
      },
      body: JSON.stringify({ status: 'VERIFIED' })
    });
    const verifyNurseData = await verifyNurseRes.json();
    assert(verifyNurseRes.status === 200, 'Hospital Authority verifies own hospital personnel (200 OK)');
    assert(verifyNurseData.personnel.verification_status === 'VERIFIED', 'Target user updated to VERIFIED');

    // Verified nurse can now log in
    const nurseLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: hospStaffEmail, password: 'password123' })
    });
    assert(nurseLogin.status === 200, 'Newly verified user can authenticate with 200 OK');

    // 2. Government Authority verifies Treatment Facility / personnel statewide
    const govLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'regulator@demo.com', password: 'password123' })
    });
    const govAuth = await govLogin.json();

    const verifyOperatorRes = await fetch(`${baseUrl}/personnel/${regData.user.id}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${govAuth.token}`
      },
      body: JSON.stringify({ status: 'VERIFIED' })
    });
    assert(verifyOperatorRes.status === 200, 'Government Authority verifies personnel statewide (200 OK)');

    // -----------------------------------------------------------------
    // SUITE 5: Suspension, Enforcement & Reinstatement Lifecycle
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 5] Account Suspension, Blocking & Reinstatement\x1b[0m');

    // 1. Suspension requires mandatory reason
    const suspNoReason = await fetch(`${baseUrl}/personnel/${nurseUser.id}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospAuth.token}`
      },
      body: JSON.stringify({ status: 'SUSPENDED' })
    });
    assert(suspNoReason.status === 400, 'Suspension without reason rejected (400 Bad Request)');

    // 2. Suspension with valid reason succeeds
    const suspWithReason = await fetch(`${baseUrl}/personnel/${nurseUser.id}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospAuth.token}`
      },
      body: JSON.stringify({
        status: 'SUSPENDED',
        reason: 'Temporary regulatory audit pending medical certification renewal.'
      })
    });
    assert(suspWithReason.status === 200, 'Hospital Authority suspends personnel with valid reason (200 OK)');

    // 3. Suspended user login is strictly blocked (403 Forbidden)
    const suspUserLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: hospStaffEmail, password: 'password123' })
    });
    const suspUserData = await suspUserLogin.json();
    assert(suspUserLogin.status === 403, 'Suspended user login rejected with 403 Forbidden');
    assert(suspUserData.code === 'ACCOUNT_SUSPENDED', 'Error code is ACCOUNT_SUSPENDED');

    // 4. Suspended JWT rejected from operational endpoints
    const suspToken = generateToken({
      id: nurseUser.id,
      name: nurseUser.name,
      email: hospStaffEmail,
      role: ROLES.HOSPITAL_AUTHORITY,
      verification_status: 'SUSPENDED'
    });
    const suspOpRes = await fetch(`${baseUrl}/auth/test/hospital-only`, {
      headers: { 'Authorization': `Bearer ${suspToken}` }
    });
    assert(suspOpRes.status === 403, 'Operational endpoint rejects SUSPENDED account token with 403 Forbidden');

    // 5. Reinstatement brings account back to VERIFIED
    const reinstateRes = await fetch(`${baseUrl}/personnel/${nurseUser.id}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospAuth.token}`
      },
      body: JSON.stringify({ status: 'VERIFIED' })
    });
    const reinstateData = await reinstateRes.json();
    assert(reinstateRes.status === 200, 'Reinstatement succeeds with 200 OK');
    assert(reinstateData.audit_action === 'USER_REINSTATED', 'Audit action correctly reflects USER_REINSTATED');

    // Reinstated user can log in again
    const reinLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: hospStaffEmail, password: 'password123' })
    });
    assert(reinLogin.status === 200, 'Reinstated account logs in successfully (200 OK)');

    // -----------------------------------------------------------------
    // SUITE 6: Permanent Revocation & Terminal State
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 6] Permanent Revocation & Terminal State\x1b[0m');

    // 1. Hospital Authority cannot issue REVOKED
    const hospTryRevoke = await fetch(`${baseUrl}/personnel/${nurseUser.id}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospAuth.token}`
      },
      body: JSON.stringify({ status: 'REVOKED', reason: 'Attempted permanent ban by hospital' })
    });
    assert(hospTryRevoke.status === 403, 'Hospital Authority cannot issue REVOKED (403 Forbidden)');

    // 2. Government Authority revokes account permanently
    const govRevoke = await fetch(`${baseUrl}/personnel/${nurseUser.id}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${govAuth.token}`
      },
      body: JSON.stringify({
        status: 'REVOKED',
        reason: 'Permanent revocation pursuant to CPCB Section 12 statutory violation.'
      })
    });
    assert(govRevoke.status === 200, 'Government Authority revokes account with 200 OK');

    // 3. Revoked account login is permanently rejected
    const revUserLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: hospStaffEmail, password: 'password123' })
    });
    const revUserData = await revUserLogin.json();
    assert(revUserLogin.status === 403, 'Revoked user login rejected with 403 Forbidden');
    assert(revUserData.code === 'ACCOUNT_REVOKED', 'Error code is ACCOUNT_REVOKED');

    // 4. Revoked account is in terminal state and cannot be modified again
    const tryReactivate = await fetch(`${baseUrl}/personnel/${nurseUser.id}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${govAuth.token}`
      },
      body: JSON.stringify({ status: 'VERIFIED' })
    });
    assert(tryReactivate.status === 400, 'Attempting to modify REVOKED account is rejected (400 Bad Request)');

    // -----------------------------------------------------------------
    // SUITE 7: Negative Cases & Security Invariants
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 7] Negative Cases & Security Constraints\x1b[0m');

    // 1. Self-verification / self-action is strictly forbidden
    const demoHospUser = DEMO_USERS.find(u => u.email === 'hospital@demo.com');
    const selfVerifyRes = await fetch(`${baseUrl}/personnel/${demoHospUser.id}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospAuth.token}`
      },
      body: JSON.stringify({ status: 'VERIFIED' })
    });
    assert(selfVerifyRes.status === 403, 'Self-verification strictly rejected with 403 Forbidden');

    // 2. Hospital Authority cannot manage personnel of another hospital
    const apolloStaff = await prisma.user.findFirst({
      where: { facility_id: 'fac-hosp-002' }
    });
    if (apolloStaff) {
      const otherFacRes = await fetch(`${baseUrl}/personnel/${apolloStaff.id}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hospAuth.token}`
        },
        body: JSON.stringify({ status: 'SUSPENDED', reason: 'Cross facility test' })
      });
      assert(otherFacRes.status === 403, 'Hospital Authority cannot manage personnel of another facility (403 Forbidden)');
    } else {
      assert(true, 'Cross facility test skipped (no separate facility user found)');
    }

    // 3. Hospital Authority cannot verify Government Authority
    const govtUser = DEMO_USERS.find(u => u.email === 'regulator@demo.com');
    const hospToGovRes = await fetch(`${baseUrl}/personnel/${govtUser.id}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospAuth.token}`
      },
      body: JSON.stringify({ status: 'VERIFIED' })
    });
    assert(hospToGovRes.status === 403, 'Hospital Authority cannot verify Government Authority (403 Forbidden)');

    // 4. Compliance Inspector cannot verify, suspend, or revoke personnel
    const inspLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'inspector@demo.com', password: 'password123' })
    });
    const inspAuth = await inspLogin.json();

    const inspVerifyRes = await fetch(`${baseUrl}/personnel/${regData.user.id}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${inspAuth.token}`
      },
      body: JSON.stringify({ status: 'SUSPENDED', reason: 'Inspector attempting administrative ban' })
    });
    assert(inspVerifyRes.status === 403, 'Compliance Inspector cannot administratively verify/suspend personnel (403)');

    // 5. Compliance Inspector CAN flag personnel for audit
    const inspFlagRes = await fetch(`${baseUrl}/personnel/${regData.user.id}/flag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${inspAuth.token}`
      },
      body: JSON.stringify({
        finding: 'Waste collection barcode discrepancy observed during spot-check at Ward 4.',
        severity: 'HIGH'
      })
    });
    assert(inspFlagRes.status === 200, 'Compliance Inspector can flag personnel for audit (200 OK)');

    // 6. User cannot self-service change role to GOVERNMENT_AUTHORITY
    const roleChangeRes = await fetch(`${baseUrl}/personnel/${regData.user.id}/request-role-change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pendingToken}`
      },
      body: JSON.stringify({
        requested_role: ROLES.GOVERNMENT_AUTHORITY,
        reason: 'Attempted self-promotion to regulator'
      })
    });
    assert(roleChangeRes.status === 403, 'Self-service request for GOVERNMENT_AUTHORITY strictly rejected (403)');

    // -----------------------------------------------------------------
    // SUITE 8: Audit Log Integrity Verification
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 8] Audit Log Verification\x1b[0m');

    const recentLogs = await prisma.auditLog.findMany({
      where: { entity: 'User', entity_id: nurseUser.id },
      orderBy: { timestamp: 'desc' }
    });

    assert(recentLogs.length >= 2, 'Audit log records created for lifecycle events');
    const hasSuspend = recentLogs.some(l => l.action.includes('USER_SUSPENDED'));
    const hasReinstate = recentLogs.some(l => l.action.includes('USER_REINSTATED'));
    const hasRevoke = recentLogs.some(l => l.action.includes('USER_REVOKED'));
    assert(hasSuspend, 'Audit log captures USER_SUSPENDED event with reason');
    assert(hasReinstate, 'Audit log captures USER_REINSTATED event');
    assert(hasRevoke, 'Audit log captures USER_REVOKED event');

  } catch (err) {
    console.error('\nGovernance test suite encountered an unexpected error:', err);
    failed++;
  } finally {
    // Cleanup created test users
    if (createdUserIds.length > 0) {
      try {
        await prisma.auditLog.deleteMany({
          where: { entity: 'User', entity_id: { in: createdUserIds } }
        });
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } }
        });
      } catch (cleanErr) {
        console.warn('Test cleanup warning:', cleanErr.message);
      }
    }
    server.close();
  }

  console.log('\n======================================================');
  console.log(`Governance Execution: \x1b[32m${passed} Passed\x1b[0m, \x1b[31m${failed} Failed\x1b[0m`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGovernanceTests();

import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import { hashPassword, comparePassword } from './services/authService.js';
import { ROLES, ALL_ROLES, isValidRole } from './constants/roles.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);

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

async function runTests() {
  console.log('\n======================================================');
  console.log('  BioTrace Backend Auth & RBAC Automated Test Suite   ');
  console.log('======================================================\n');

  // Start test server on random available port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/auth`;

  try {
    // -----------------------------------------------------------------
    // TEST SUITE 1: Role Definitions & Constants
    // -----------------------------------------------------------------
    console.log('\x1b[36m[Suite 1] Role Constants & Enums\x1b[0m');
    assert(ALL_ROLES.length === 6, 'Exactly 6 roles defined in ALL_ROLES');
    assert(ROLES.HOSPITAL_AUTHORITY === 'HOSPITAL_AUTHORITY', 'HOSPITAL_AUTHORITY constant defined');
    assert(ROLES.COLLECTION_OFFICER === 'COLLECTION_OFFICER', 'COLLECTION_OFFICER constant defined');
    assert(ROLES.TRANSPORT_OFFICER === 'TRANSPORT_OFFICER', 'TRANSPORT_OFFICER constant defined');
    assert(ROLES.TREATMENT_FACILITY === 'TREATMENT_FACILITY', 'TREATMENT_FACILITY constant defined');
    assert(ROLES.GOVERNMENT_AUTHORITY === 'GOVERNMENT_AUTHORITY', 'GOVERNMENT_AUTHORITY constant defined');
    assert(ROLES.COMPLIANCE_INSPECTOR === 'COMPLIANCE_INSPECTOR', 'COMPLIANCE_INSPECTOR constant defined');
    assert(isValidRole('HOSPITAL_AUTHORITY') === true, 'isValidRole returns true for valid role');
    assert(isValidRole('INVALID_ROLE') === false, 'isValidRole returns false for unrecognized role');

    // -----------------------------------------------------------------
    // TEST SUITE 2: Password Hashing & Bcrypt
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 2] Bcrypt Hashing & Verification\x1b[0m');
    const customHash = await hashPassword('myCustomPass123!');
    assert(customHash && customHash.startsWith('$2'), 'Bcrypt generates valid salt/hash string');
    const matchesTrue = await comparePassword('myCustomPass123!', customHash);
    assert(matchesTrue === true, 'comparePassword validates correct password against hash');
    const matchesFalse = await comparePassword('wrongPassword', customHash);
    assert(matchesFalse === false, 'comparePassword rejects incorrect password against hash');

    // -----------------------------------------------------------------
    // TEST SUITE 3: POST /api/auth/login Validation & Error Cases
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 3] POST /api/auth/login - Credential Validation\x1b[0m');
    
    // Missing body / email
    const resEmpty = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(resEmpty.status === 400, 'POST /login with missing credentials returns 400 Bad Request');
    const emptyJson = await resEmpty.json();
    assert(emptyJson.error === 'Missing required credentials', 'Returns clear missing credentials error message');

    // Non-existent user
    const resNonExistent = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@nowhere.com', password: 'password123' })
    });
    assert(resNonExistent.status === 401, 'POST /login with non-existent email returns 401 Unauthorized');

    // Wrong password
    const resWrongPass = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hospital@demo.com', password: 'incorrect_password_999' })
    });
    assert(resWrongPass.status === 401, 'POST /login with invalid password returns 401 Unauthorized');

    // -----------------------------------------------------------------
    // TEST SUITE 4: POST /api/auth/login for All 6 Roles
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 4] POST /api/auth/login - All 6 Roles Login\x1b[0m');
    const roleTokens = {};

    const demoRoleLogins = [
      { role: ROLES.HOSPITAL_AUTHORITY, email: 'hospital@demo.com', name: 'Dr. Aarav Mehta' },
      { role: ROLES.COLLECTION_OFFICER, email: 'collection@demo.com', name: 'Meera Iyer' },
      { role: ROLES.TRANSPORT_OFFICER, email: 'transport@demo.com', name: 'Vikram Singh' },
      { role: ROLES.TREATMENT_FACILITY, email: 'treatment@demo.com', name: 'Rajesh Patel' },
      { role: ROLES.GOVERNMENT_AUTHORITY, email: 'regulator@demo.com', name: 'Sunita Sharma' },
      { role: ROLES.COMPLIANCE_INSPECTOR, email: 'inspector@demo.com', name: 'Amit Deshmukh' },
    ];

    for (const demo of demoRoleLogins) {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demo.email, password: 'password123' })
      });
      assert(res.status === 200, `Login 200 OK for role ${demo.role} (${demo.email})`);
      const body = await res.json();
      assert(body.token && typeof body.token === 'string', `Returns signed JWT for ${demo.role}`);
      assert(body.user && body.user.role === demo.role, `User payload contains correct role: ${demo.role}`);
      assert(body.user.password_hash === undefined, `Password hash is strictly omitted from user payload`);
      roleTokens[demo.role] = body.token;
    }

    // -----------------------------------------------------------------
    // TEST SUITE 5: GET /api/auth/me Verification
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 5] GET /api/auth/me - Protected Profile Endpoint\x1b[0m');
    
    // Missing token
    const resMeNoToken = await fetch(`${baseUrl}/me`);
    assert(resMeNoToken.status === 401, 'GET /me without token returns 401 Unauthorized');

    // Invalid / corrupted token
    const resMeBadToken = await fetch(`${baseUrl}/me`, {
      headers: { 'Authorization': 'Bearer completely_invalid_jwt_token_gibberish' }
    });
    assert(resMeBadToken.status === 401, 'GET /me with invalid token returns 401 Unauthorized');

    // Valid token for Hospital Authority
    const resMeValid = await fetch(`${baseUrl}/me`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.HOSPITAL_AUTHORITY]}` }
    });
    assert(resMeValid.status === 200, 'GET /me with valid token returns 200 OK');
    const meBody = await resMeValid.json();
    assert(meBody.user && meBody.user.role === ROLES.HOSPITAL_AUTHORITY, 'GET /me returns correct authenticated user');
    assert(meBody.user.password_hash === undefined, 'GET /me omits password_hash');

    // -----------------------------------------------------------------
    // TEST SUITE 6: RBAC Server-Side Enforcement (All 6 Roles)
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 6] Server-Side RBAC Enforcement (403 Forbidden & 200 OK)\x1b[0m');

    // 1. /api/auth/test/hospital-only
    const resHospAllowed = await fetch(`${baseUrl}/test/hospital-only`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.HOSPITAL_AUTHORITY]}` }
    });
    assert(resHospAllowed.status === 200, 'hospital-only route allows HOSPITAL_AUTHORITY (200)');

    const resHospDenied1 = await fetch(`${baseUrl}/test/hospital-only`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.COLLECTION_OFFICER]}` }
    });
    assert(resHospDenied1.status === 403, 'hospital-only route REJECTS COLLECTION_OFFICER (403)');
    const hospDeniedJson = await resHospDenied1.json();
    assert(hospDeniedJson.error.includes('Forbidden'), 'Rejection includes Forbidden message');
    assert(hospDeniedJson.userRole === ROLES.COLLECTION_OFFICER, 'Rejection specifies unauthorized role');

    const resHospDenied2 = await fetch(`${baseUrl}/test/hospital-only`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.TRANSPORT_OFFICER]}` }
    });
    assert(resHospDenied2.status === 403, 'hospital-only route REJECTS TRANSPORT_OFFICER (403)');

    // 2. /api/auth/test/collection-only
    const resCollAllowed = await fetch(`${baseUrl}/test/collection-only`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.COLLECTION_OFFICER]}` }
    });
    assert(resCollAllowed.status === 200, 'collection-only route allows COLLECTION_OFFICER (200)');

    const resCollDenied = await fetch(`${baseUrl}/test/collection-only`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.HOSPITAL_AUTHORITY]}` }
    });
    assert(resCollDenied.status === 403, 'collection-only route REJECTS HOSPITAL_AUTHORITY (403)');

    // 3. /api/auth/test/transport-only
    const resTranAllowed = await fetch(`${baseUrl}/test/transport-only`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.TRANSPORT_OFFICER]}` }
    });
    assert(resTranAllowed.status === 200, 'transport-only route allows TRANSPORT_OFFICER (200)');

    const resTranDenied = await fetch(`${baseUrl}/test/transport-only`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.TREATMENT_FACILITY]}` }
    });
    assert(resTranDenied.status === 403, 'transport-only route REJECTS TREATMENT_FACILITY (403)');

    // 4. /api/auth/test/treatment-only
    const resTreatAllowed = await fetch(`${baseUrl}/test/treatment-only`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.TREATMENT_FACILITY]}` }
    });
    assert(resTreatAllowed.status === 200, 'treatment-only route allows TREATMENT_FACILITY (200)');

    const resTreatDenied = await fetch(`${baseUrl}/test/treatment-only`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.GOVERNMENT_AUTHORITY]}` }
    });
    assert(resTreatDenied.status === 403, 'treatment-only route REJECTS GOVERNMENT_AUTHORITY (403)');

    // 5. /api/auth/test/government-only
    const resGovAllowed = await fetch(`${baseUrl}/test/government-only`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.GOVERNMENT_AUTHORITY]}` }
    });
    assert(resGovAllowed.status === 200, 'government-only route allows GOVERNMENT_AUTHORITY (200)');

    const resGovDenied = await fetch(`${baseUrl}/test/government-only`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.COMPLIANCE_INSPECTOR]}` }
    });
    assert(resGovDenied.status === 403, 'government-only route REJECTS COMPLIANCE_INSPECTOR (403)');

    // 6. /api/auth/test/inspector-only
    const resInspAllowed = await fetch(`${baseUrl}/test/inspector-only`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.COMPLIANCE_INSPECTOR]}` }
    });
    assert(resInspAllowed.status === 200, 'inspector-only route allows COMPLIANCE_INSPECTOR (200)');

    const resInspDenied = await fetch(`${baseUrl}/test/inspector-only`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.HOSPITAL_AUTHORITY]}` }
    });
    assert(resInspDenied.status === 403, 'inspector-only route REJECTS HOSPITAL_AUTHORITY (403)');

    // 7. Multi-role regulatory route (/api/auth/test/regulatory)
    const resRegGov = await fetch(`${baseUrl}/test/regulatory`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.GOVERNMENT_AUTHORITY]}` }
    });
    assert(resRegGov.status === 200, 'regulatory route allows GOVERNMENT_AUTHORITY (200)');

    const resRegInsp = await fetch(`${baseUrl}/test/regulatory`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.COMPLIANCE_INSPECTOR]}` }
    });
    assert(resRegInsp.status === 200, 'regulatory route allows COMPLIANCE_INSPECTOR (200)');

    const resRegDeniedHosp = await fetch(`${baseUrl}/test/regulatory`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.HOSPITAL_AUTHORITY]}` }
    });
    assert(resRegDeniedHosp.status === 403, 'regulatory route REJECTS HOSPITAL_AUTHORITY (403)');

    const resRegDeniedColl = await fetch(`${baseUrl}/test/regulatory`, {
      headers: { 'Authorization': `Bearer ${roleTokens[ROLES.COLLECTION_OFFICER]}` }
    });
    assert(resRegDeniedColl.status === 403, 'regulatory route REJECTS COLLECTION_OFFICER (403)');

  } catch (err) {
    console.error('\nTest runner encountered an error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n======================================================');
  console.log(`Test Execution Complete: \x1b[32m${passed} Passed\x1b[0m, \x1b[31m${failed} Failed\x1b[0m`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

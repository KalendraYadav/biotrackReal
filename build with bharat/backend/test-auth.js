import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import authRouter from './routes/auth.js';
import { hashPassword, comparePassword, DEMO_USERS } from './services/authService.js';
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

    // -----------------------------------------------------------------
    // TEST SUITE 7: Master Identity & RBAC Integrity Verification (Tests 1 - 10)
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m[Suite 7] Master Identity & RBAC Integrity Verification (Tests 1 - 10)\x1b[0m');

    // TEST 1: Hospital Authority account logs in -> Authorized role is strictly HOSPITAL_AUTHORITY
    const loginHospRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hospital@demo.com', password: 'password123' })
    });
    assert(loginHospRes.status === 200, '[TEST 1] Hospital account logs in successfully (200)');
    const hospData = await loginHospRes.json();
    assert(hospData.user.role === ROLES.HOSPITAL_AUTHORITY, '[TEST 1] Hospital account authorized role is strictly HOSPITAL_AUTHORITY');
    assert(hospData.user.email === 'hospital@demo.com', '[TEST 1] User identity corresponds to hospital@demo.com');

    // TEST 2: Hospital account attempts to access inspector-only endpoint -> 403 Forbidden
    const hospToInspRes = await fetch(`${baseUrl}/test/inspector-only`, {
      headers: { 'Authorization': `Bearer ${hospData.token}` }
    });
    assert(hospToInspRes.status === 403, '[TEST 2] Hospital account cannot access inspector-only endpoint (403 Forbidden)');
    const hospToInspJson = await hospToInspRes.json();
    assert(hospToInspJson.error.includes('Forbidden'), '[TEST 2] Response explicitly returns Forbidden error');

    // TEST 3: Hospital account attempts to manipulate role value in request body or headers
    const manipBodyRes = await fetch(`${baseUrl}/test/inspector-only`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${hospData.token}`,
        'X-Role': ROLES.COMPLIANCE_INSPECTOR,
        'Content-Type': 'application/json'
      }
    });
    assert(manipBodyRes.status === 403, '[TEST 3] Untrusted client role header ignored; server strictly rejects with 403');

    // TEST 4: Token manipulation test (tampered JWT or forged signature)
    const forgedToken = jwt.sign(
      { id: hospData.user.id, role: ROLES.COMPLIANCE_INSPECTOR, email: hospData.user.email },
      'forged_secret_key_attacker_attempt_999'
    );
    const manipTokenRes = await fetch(`${baseUrl}/test/inspector-only`, {
      headers: { 'Authorization': `Bearer ${forgedToken}` }
    });
    assert(manipTokenRes.status === 401, '[TEST 4] Forged / tampered JWT token rejected with 401 Unauthorized');

    // Tampered token string (mutated signature)
    const tamperedTokenStr = hospData.token.slice(0, -6) + 'abcdef';
    const tamperedRes = await fetch(`${baseUrl}/test/inspector-only`, {
      headers: { 'Authorization': `Bearer ${tamperedTokenStr}` }
    });
    assert(tamperedRes.status === 401, '[TEST 4] Tampered token signature strictly rejected with 401 Unauthorized');

    // TEST 5: Collection Officer account -> COLLECTION_OFFICER only
    const collRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'collection@demo.com', password: 'password123' })
    });
    const collData = await collRes.json();
    assert(collData.user.role === ROLES.COLLECTION_OFFICER, '[TEST 5] Collection Officer receives COLLECTION_OFFICER role');
    const collToHosp = await fetch(`${baseUrl}/test/hospital-only`, {
      headers: { 'Authorization': `Bearer ${collData.token}` }
    });
    assert(collToHosp.status === 403, '[TEST 5] Collection Officer rejected from Hospital Authority route (403)');
    const collToInsp = await fetch(`${baseUrl}/test/inspector-only`, {
      headers: { 'Authorization': `Bearer ${collData.token}` }
    });
    assert(collToInsp.status === 403, '[TEST 5] Collection Officer rejected from Inspector route (403)');

    // TEST 6: Transport Officer account -> TRANSPORT_OFFICER only
    const transRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'transport@demo.com', password: 'password123' })
    });
    const transData = await transRes.json();
    assert(transData.user.role === ROLES.TRANSPORT_OFFICER, '[TEST 6] Transport Officer receives TRANSPORT_OFFICER role');
    const transToTreat = await fetch(`${baseUrl}/test/treatment-only`, {
      headers: { 'Authorization': `Bearer ${transData.token}` }
    });
    assert(transToTreat.status === 403, '[TEST 6] Transport Officer rejected from Treatment Facility route (403)');
    const transToGov = await fetch(`${baseUrl}/test/government-only`, {
      headers: { 'Authorization': `Bearer ${transData.token}` }
    });
    assert(transToGov.status === 403, '[TEST 6] Transport Officer rejected from Government Authority route (403)');

    // TEST 7: Treatment Facility account -> TREATMENT_FACILITY only
    const treatRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'treatment@demo.com', password: 'password123' })
    });
    const treatData = await treatRes.json();
    assert(treatData.user.role === ROLES.TREATMENT_FACILITY, '[TEST 7] Treatment Facility receives TREATMENT_FACILITY role');
    const treatToGov = await fetch(`${baseUrl}/test/government-only`, {
      headers: { 'Authorization': `Bearer ${treatData.token}` }
    });
    assert(treatToGov.status === 403, '[TEST 7] Treatment Facility rejected from Government Authority route (403)');
    const treatToInsp = await fetch(`${baseUrl}/test/inspector-only`, {
      headers: { 'Authorization': `Bearer ${treatData.token}` }
    });
    assert(treatToInsp.status === 403, '[TEST 7] Treatment Facility rejected from Inspector route (403)');

    // TEST 8: Government Authority account -> GOVERNMENT_AUTHORITY only
    const govRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'regulator@demo.com', password: 'password123' })
    });
    const govData = await govRes.json();
    assert(govData.user.role === ROLES.GOVERNMENT_AUTHORITY, '[TEST 8] Government Authority receives GOVERNMENT_AUTHORITY role');
    const govToHosp = await fetch(`${baseUrl}/test/hospital-only`, {
      headers: { 'Authorization': `Bearer ${govData.token}` }
    });
    assert(govToHosp.status === 403, '[TEST 8] Government Authority rejected from Hospital Authority route (403)');
    const govToColl = await fetch(`${baseUrl}/test/collection-only`, {
      headers: { 'Authorization': `Bearer ${govData.token}` }
    });
    assert(govToColl.status === 403, '[TEST 8] Government Authority rejected from Collection Officer route (403)');

    // TEST 9: Compliance Inspector account -> COMPLIANCE_INSPECTOR only
    const inspRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'inspector@demo.com', password: 'password123' })
    });
    const inspData = await inspRes.json();
    assert(inspData.user.role === ROLES.COMPLIANCE_INSPECTOR, '[TEST 9] Compliance Inspector receives COMPLIANCE_INSPECTOR role');
    const inspToHosp = await fetch(`${baseUrl}/test/hospital-only`, {
      headers: { 'Authorization': `Bearer ${inspData.token}` }
    });
    assert(inspToHosp.status === 403, '[TEST 9] Compliance Inspector rejected from Hospital Authority route (403)');
    const inspToTrans = await fetch(`${baseUrl}/test/transport-only`, {
      headers: { 'Authorization': `Bearer ${inspData.token}` }
    });
    assert(inspToTrans.status === 403, '[TEST 9] Compliance Inspector rejected from Transport Officer route (403)');

    // TEST 10: Demo account identity isolation (authenticates as distinct account, does not mutate existing user)
    const demoHosp = DEMO_USERS.find(u => u.email === 'hospital@demo.com');
    const demoInsp = DEMO_USERS.find(u => u.email === 'inspector@demo.com');
    assert(demoHosp && demoInsp, '[TEST 10] Demo user records exist for testing');
    assert(demoHosp.id !== demoInsp.id, '[TEST 10] Demo users have distinct user IDs (isolation)');
    assert(demoHosp.email !== demoInsp.email, '[TEST 10] Demo users have distinct email addresses');
    assert(demoHosp.role !== demoInsp.role, '[TEST 10] Demo users have distinct statutory roles');

    // Re-verify that hospital user identity in /me remains HOSPITAL_AUTHORITY
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { 'Authorization': `Bearer ${hospData.token}` }
    });
    const meData = await meRes.json();
    assert(meData.user.role === ROLES.HOSPITAL_AUTHORITY, '[TEST 10] Hospital Authority session identity remains strictly HOSPITAL_AUTHORITY');
    assert(meData.user.id === demoHosp.id, '[TEST 10] Hospital Authority identity ID unchanged');

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

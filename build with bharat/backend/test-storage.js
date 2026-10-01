import assert from 'assert';
import http from 'http';
import { 
  detectImageFormat, 
  validateImage, 
  parseBase64DataUrl, 
  generateObjectPath, 
  processEvidencePhoto, 
  getSignedEvidenceUrl,
  EVIDENCE_BUCKET,
  MAX_FILE_SIZE_BYTES,
  getSupabaseClient
} from './services/storageService.js';
import express from 'express';
import cors from 'cors';
import { prisma, testDbConnection } from './db.js';
import authRouter from './routes/auth.js';
import wasteBatchesRouter from './routes/wasteBatches.js';

let baseUrl = 'http://localhost:5000/api';
let testServer = null;

// Minimal valid 1x1 image buffers
const validJpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
  0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
  0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
  0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x80, 0xff, 0xd9
]);

const validPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
]);

const validWebp = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  0x56, 0x50, 0x38, 0x4c, 0x0e, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00,
  0x00, 0x07, 0x10, 0x01, 0x22, 0x00, 0x00, 0x00, 0x00, 0x00
]);

async function loginUser(email, password = 'password123') {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  return data.token;
}

async function runStorageTestSuite() {
  console.log('\x1b[1m\x1b[35m=== BIOTRACE PRODUCTION EVIDENCE STORAGE TEST SUITE ===\x1b[0m\n');
  try {
    await testDbConnection();
  } catch {
    // continue
  }
  let passed = 0;
  let failed = 0;

  function recordPass(testName) {
    passed++;
    console.log(`\x1b[32m  ✓ [PASS]\x1b[0m ${testName}`);
  }

  function recordFail(testName, err) {
    failed++;
    console.error(`\x1b[31m  ✗ [FAIL]\x1b[0m ${testName}:`, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 1: Image Format Detection & Validation Unit Tests
  // -------------------------------------------------------------
  console.log('\x1b[36m[Suite 1] Image Format & Magic Bytes Validation\x1b[0m');

  // Test 1: Valid JPEG detection
  try {
    const fmt = detectImageFormat(validJpeg);
    assert(fmt && fmt.mime === 'image/jpeg' && fmt.ext === 'jpg', 'Detects valid JPEG');
    const val = validateImage(validJpeg, 'image/jpeg');
    assert(val.valid === true, 'Validates valid JPEG buffer');
    recordPass('Valid JPEG format and magic bytes detected');
  } catch (err) { recordFail('Valid JPEG detection', err); }

  // Test 2: Valid PNG detection
  try {
    const fmt = detectImageFormat(validPng);
    assert(fmt && fmt.mime === 'image/png' && fmt.ext === 'png', 'Detects valid PNG');
    const val = validateImage(validPng, 'image/png');
    assert(val.valid === true, 'Validates valid PNG buffer');
    recordPass('Valid PNG format and magic bytes detected');
  } catch (err) { recordFail('Valid PNG detection', err); }

  // Test 3: Valid WebP detection
  try {
    const fmt = detectImageFormat(validWebp);
    assert(fmt && fmt.mime === 'image/webp' && fmt.ext === 'webp', 'Detects valid WebP');
    const val = validateImage(validWebp, 'image/webp');
    assert(val.valid === true, 'Validates valid WebP buffer');
    recordPass('Valid WebP format and magic bytes detected');
  } catch (err) { recordFail('Valid WebP detection', err); }

  // Test 4: Mismatched MIME type (declared JPEG but actual PNG)
  try {
    const val = validateImage(validPng, 'image/jpeg');
    assert(val.valid === false && val.statusCode === 400, 'Rejects MIME/bytes mismatch with 400');
    recordPass('Rejects declared MIME vs actual magic bytes mismatch');
  } catch (err) { recordFail('MIME mismatch rejection', err); }

  // Test 5: Invalid magic bytes (SVG payload)
  try {
    const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>');
    const val = validateImage(svgBuf, 'image/svg+xml');
    assert(val.valid === false && val.statusCode === 400, 'Rejects SVG payload');
    recordPass('Rejects SVG vector file payload');
  } catch (err) { recordFail('SVG rejection', err); }

  // Test 6: Invalid magic bytes (HTML payload)
  try {
    const htmlBuf = Buffer.from('<!DOCTYPE html><html><body><h1>Hacked</h1></body></html>');
    const val = validateImage(htmlBuf, 'image/jpeg');
    assert(val.valid === false && val.statusCode === 400, 'Rejects HTML disguise');
    recordPass('Rejects HTML disguised as image');
  } catch (err) { recordFail('HTML rejection', err); }

  // Test 7: Invalid magic bytes (Windows PE executable)
  try {
    const exeBuf = Buffer.concat([Buffer.from([0x4D, 0x5A, 0x90, 0x00]), Buffer.alloc(30)]);
    const val = validateImage(exeBuf, 'image/png');
    assert(val.valid === false && val.statusCode === 400, 'Rejects PE executable');
    recordPass('Rejects executable binary disguised as image');
  } catch (err) { recordFail('Executable rejection', err); }

  // Test 8: File size exceeding 5 MB limit
  try {
    const oversizedBuf = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024, 0xFF);
    const val = validateImage(oversizedBuf, 'image/jpeg');
    assert(val.valid === false && val.statusCode === 413, 'Rejects buffer > 5 MB with 413');
    recordPass('Rejects oversized image buffer (> 5 MB) with HTTP 413');
  } catch (err) { recordFail('Oversized image rejection', err); }

  // -------------------------------------------------------------
  // SUITE 2: Base64 Parsing & Path Generation
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[Suite 2] Base64 Parsing & Object Path Naming\x1b[0m');

  // Test 9: Malformed Base64 data URL
  try {
    const malformed = parseBase64DataUrl('data:image/jpeg;base64,not-valid-base64-@@@@!#$');
    assert(malformed?.error, 'Identifies malformed Base64 string');
    recordPass('Correctly flags malformed Base64 data URL');
  } catch (err) { recordFail('Malformed Base64 handling', err); }

  // Test 10: Non-image data URL (e.g. data:text/html)
  try {
    let thrown = false;
    try {
      await processEvidencePhoto('data:text/html;base64,PGgxPkhlbGxvPC9oMT4=');
    } catch (e) {
      thrown = true;
      assert(e.statusCode === 400, 'Rejects non-image data URL with 400');
    }
    assert(thrown, 'Throws on non-image data URL');
    recordPass('Rejects non-image data URL');
  } catch (err) { recordFail('Non-image data URL rejection', err); }

  // Test 11: Object path structure adheres to specification
  try {
    const path = generateObjectPath('BMW-2026-0012', 'COLLECTION', 'jpg');
    assert(path.startsWith('batches/BMW-2026-0012/collection_'), 'Path starts with batches/{batch_id}/{stage}_');
    assert(path.endsWith('.jpg'), 'Path ends with .jpg extension');
    const parts = path.split('/');
    assert(parts.length === 3, 'Path has exact 3-level folder hierarchy');
    recordPass('Generates structured object path (batches/{batchId}/{stage}_{timestamp}_{rand}.jpg)');
  } catch (err) { recordFail('Object path structure', err); }

  // -------------------------------------------------------------
  // SUITE 3: Supabase Storage Integration & Signed URLs
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[Suite 3] Supabase Storage Upload & Signed URL Operations\x1b[0m');

  let testObjectPath = null;

  // Test 12: Direct Supabase Storage upload via processEvidencePhoto
  try {
    const jpegDataUrl = `data:image/jpeg;base64,${validJpeg.toString('base64')}`;
    testObjectPath = await processEvidencePhoto(jpegDataUrl, { batchId: 'test-batch-001', stage: 'COLLECTION' });
    assert(typeof testObjectPath === 'string', 'Returns string object path');
    assert(testObjectPath.startsWith('batches/test-batch-001/collection_'), 'Returns correct object path prefix');
    assert(testObjectPath.endsWith('.jpg'), 'Returns .jpg extension');
    recordPass('Successfully uploaded Base64 JPEG to Supabase Storage and obtained stable path');
  } catch (err) { recordFail('Supabase Storage Base64 upload', err); }

  // Test 13: Supabase Storage signed URL generation
  try {
    assert(testObjectPath, 'testObjectPath must exist from previous test');
    const signedUrl = await getSignedEvidenceUrl(testObjectPath, 1800);
    assert(typeof signedUrl === 'string', 'Signed URL is string');
    assert(signedUrl.startsWith('https://') || signedUrl.startsWith('http://'), 'Signed URL is valid HTTP/HTTPS');
    assert(signedUrl.includes('token='), 'Signed URL contains access token parameter');
    recordPass('Generated short-lived signed URL for private evidence object');
  } catch (err) { recordFail('Signed URL generation', err); }

  // Test 14: Legacy photo path preservation
  try {
    const legacyPath = '/uploads/evidence/generation_batch-001.jpg';
    const result = await processEvidencePhoto(legacyPath);
    assert(result === legacyPath, 'Preserves legacy path without modification');
    recordPass('Preserves legacy relative photo_url references (/uploads/...)');
  } catch (err) { recordFail('Legacy path preservation', err); }

  // Test 15: External HTTP/HTTPS URL preservation
  try {
    const externalUrl = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500';
    const result = await processEvidencePhoto(externalUrl);
    assert(result === externalUrl, 'Preserves external URL without modification');
    recordPass('Preserves external HTTP/HTTPS photo URLs');
  } catch (err) { recordFail('External URL preservation', err); }

  // Test 16: Storage failure error handling
  try {
    const client = getSupabaseClient();
    // Simulate non-existent bucket upload failure
    const { error: mockErr } = await client.storage.from('non-existent-bucket-xyz-12345').upload('test.jpg', validJpeg);
    assert(mockErr, 'Storage returns error on non-existent bucket');
    recordPass('Cleanly captures and reports Supabase storage failure errors');
  } catch (err) { recordFail('Storage failure error handling', err); }

  // Clean up test file from Supabase Storage
  if (testObjectPath) {
    try {
      const client = getSupabaseClient();
      await client.storage.from(EVIDENCE_BUCKET).remove([testObjectPath]);
    } catch { /* cleanup best-effort */ }
  }

  // -------------------------------------------------------------
  // SUITE 4: API Endpoint Integration & RBAC Tests
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[Suite 4] API Route Integration & Storage RBAC\x1b[0m');

  // Verify if existing server on 5000 is running, otherwise boot lightweight test server
  try {
    const healthCheck = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1000) });
    if (!healthCheck.ok) throw new Error('Unhealthy');
  } catch {
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '25mb' }));
    app.use(express.urlencoded({ extended: true, limit: '25mb' }));
    app.use('/api/auth', authRouter);
    app.use('/api/waste-batches', wasteBatchesRouter);

    testServer = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const port = testServer.address().port;
    baseUrl = `http://localhost:${port}/api`;
  }

  let hospToken, collToken, transToken;
  try {
    hospToken = await loginUser('hospital@demo.com');
    collToken = await loginUser('collection@demo.com');
    transToken = await loginUser('transport@demo.com');
  } catch (err) {
    console.error('Failed to login test users:', err.message);
  }

  // Create a clean test batch for custody verification
  let testBatch = null;
  try {
    const resCreate = await fetch(`${baseUrl}/waste-batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospToken}`
      },
      body: JSON.stringify({
        generating_department: 'Storage Test Oncology',
        cpcb_waste_category: 'Yellow',
        cpcb_waste_type: 'Soiled Waste',
        quantity_kg: 14.5,
        notes: 'Test batch for storage migration suite'
      })
    });
    const createData = await resCreate.json();
    testBatch = createData.batch;
    assert(testBatch && testBatch.id, 'Test batch created successfully');
    recordPass('Created clean test batch for custody storage testing');
  } catch (err) { recordFail('Create test batch', err); }

  // Test 17: Upload Base64 evidence via POST /api/waste-batches/:id/custody-event
  let custodyEventId = null;
  let storedPhotoUrl = null;
  try {
    assert(testBatch, 'Test batch must exist');
    const jpegDataUrl = `data:image/jpeg;base64,${validJpeg.toString('base64')}`;

    const resCustody = await fetch(`${baseUrl}/waste-batches/${testBatch.id}/custody-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${collToken}`
      },
      body: JSON.stringify({
        stage: 'COLLECTION',
        quantity_at_stage_kg: 14.5,
        verified_by_scan: true,
        photo_url: jpegDataUrl,
        latitude: 28.5675,
        longitude: 77.2105,
        notes: 'Verified collection with Base64 camera photo'
      })
    });

    assert(resCustody.status === 201, `Custody event returned HTTP 201 (got ${resCustody.status})`);
    const custodyData = await resCustody.json();
    custodyEventId = custodyData.event.id;
    storedPhotoUrl = custodyData.event.photo_url;

    assert(storedPhotoUrl.startsWith(`batches/${testBatch.id}/collection_`), 'Photo URL is stable Supabase path');
    assert(!storedPhotoUrl.startsWith('data:image'), 'PostgreSQL DOES NOT store Base64');
    assert(custodyData.event.signed_photo_url, 'Response includes signed_photo_url');
    assert(custodyData.event.signed_photo_url.includes('token='), 'Signed URL contains access token');
    recordPass('POST /custody-event converts Base64 to Supabase path & returns signed_photo_url');
  } catch (err) { recordFail('Custody event Base64 upload', err); }

  // Test 18: Database verification - verify stable path stored in DB
  try {
    assert(custodyEventId, 'Custody event ID must exist');
    const dbEvent = await prisma.custodyEvent.findUnique({ where: { id: custodyEventId } });
    assert(dbEvent, 'Event found in PostgreSQL');
    assert(dbEvent.photo_url.startsWith('batches/'), 'DB contains stable object path');
    assert(!dbEvent.photo_url.startsWith('data:image'), 'DB DOES NOT contain Base64 payload');
    assert(dbEvent.photo_url.length < 200, `DB string length is compact (${dbEvent.photo_url.length} chars)`);
    recordPass('PostgreSQL verification: custody_events.photo_url holds compact stable path, not Base64');
  } catch (err) { recordFail('DB photo_url verification', err); }

  // Test 19: GET /api/waste-batches/:id/evidence/:eventId/signed-url
  try {
    assert(testBatch && custodyEventId, 'Test batch and event must exist');
    const resSign = await fetch(`${baseUrl}/waste-batches/${testBatch.id}/evidence/${custodyEventId}/signed-url`, {
      headers: { 'Authorization': `Bearer ${collToken}` }
    });
    assert(resSign.status === 200, 'Signed URL endpoint returns HTTP 200');
    const signJson = await resSign.json();
    assert(signJson.signedUrl && signJson.signedUrl.includes('token='), 'Signed URL endpoint returns tokenized URL');
    recordPass('GET /evidence/:eventId/signed-url returns valid signed URL for authenticated user');
  } catch (err) { recordFail('Signed URL endpoint', err); }

  // Test 20: Unauthenticated access to signed URL endpoint is rejected (401)
  try {
    const resNoAuth = await fetch(`${baseUrl}/waste-batches/${testBatch.id}/evidence/${custodyEventId}/signed-url`);
    assert(resNoAuth.status === 401, 'Unauthenticated request rejected with HTTP 401');
    recordPass('Unauthenticated request to signed-url endpoint is rejected (HTTP 401)');
  } catch (err) { recordFail('Unauthenticated signed-url rejection', err); }

  // Test 21: Reject invalid magic bytes in API upload (HTML disguise)
  try {
    assert(testBatch, 'Test batch must exist');
    const fakeImageDataUrl = 'data:image/jpeg;base64,' + Buffer.from('<html><body>Fake</body></html>').toString('base64');
    const resFake = await fetch(`${baseUrl}/waste-batches/${testBatch.id}/custody-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${transToken}`
      },
      body: JSON.stringify({
        stage: 'TRANSPORT_PICKUP',
        quantity_at_stage_kg: 14.5,
        photo_url: fakeImageDataUrl
      })
    });
    assert(resFake.status === 400, `Rejects fake image with HTTP 400 (got ${resFake.status})`);
    recordPass('API rejects fake image with invalid magic bytes (HTTP 400)');
  } catch (err) { recordFail('API fake image rejection', err); }

  // Test 22: Reject unauthorized role/stage combination (RBAC)
  try {
    assert(testBatch, 'Test batch must exist');
    const resRbac = await fetch(`${baseUrl}/waste-batches/${testBatch.id}/custody-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospToken}` // Hospital authority cannot log transport pickup
      },
      body: JSON.stringify({
        stage: 'TRANSPORT_PICKUP',
        quantity_at_stage_kg: 14.5,
        photo_url: '/uploads/evidence/test.jpg'
      })
    });
    assert(resRbac.status === 403, `Rejects unauthorized role/stage with HTTP 403 (got ${resRbac.status})`);
    recordPass('API enforces strict RBAC: unauthorized role/stage rejected with HTTP 403');
  } catch (err) { recordFail('RBAC stage rejection', err); }

  // Clean up uploaded test object from Supabase Storage
  if (storedPhotoUrl && storedPhotoUrl.startsWith('batches/')) {
    try {
      const client = getSupabaseClient();
      await client.storage.from(EVIDENCE_BUCKET).remove([storedPhotoUrl]);
    } catch { /* cleanup best effort */ }
  }

  if (testServer) {
    await new Promise((resolve) => testServer.close(resolve));
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log(`\n\x1b[1mTest Results: ${passed} passed, ${failed} failed\x1b[0m\n`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStorageTestSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

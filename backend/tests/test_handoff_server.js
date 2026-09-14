/**
 * FATGS Test Suite: Backend Server & TT_TRACKER Handoff Integration
 *
 * Validates:
 *  1. Server initialization and health endpoint (/api/health).
 *  2. TT_TRACKER status endpoint does not leak secrets.
 *  3. Incomplete package rejection (400).
 *  4. Missing environment configuration handling (500).
 *  5. End-to-end handoff with mock TT_TRACKER (200 success + redirectUrl).
 *  6. Mock TT_TRACKER validation rejection (400) -> returns failure, no redirect.
 *  7. Mock TT_TRACKER auth rejection (401) -> returns failure, no redirect.
 *  8. Mock TT_TRACKER internal error (500) -> returns failure, no redirect.
 *  9. Mock TT_TRACKER server down -> returns 502, no redirect.
 */

const assert = require('assert');
const http = require('http');
const {
  createServer,
  normalizeSemesterType,
  prepareTTTrackerPayload,
  handoffToTTTracker
} = require('../server.js');

console.log('===============================================================');
console.log('   FATGS BACKEND SERVER & TT_TRACKER HANDOFF INTEGRATION TESTS  ');
console.log('===============================================================');

function makeRequest(port, path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch (e) {
            data = raw;
          }
          resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function createMockTTTrackerServer(handler) {
  return new Promise(resolve => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

const samplePackage = {
  packageId: 'pkg_test_integration',
  schemaVersion: '1.0.0',
  source: 'FATGS',
  semester: 'Odd Semester',
  semesterType: 'Odd Semester',
  academicYear: '2025-2026',
  exportedAt: new Date().toISOString(),
  generationId: 'pkg_test_integration',
  sections: ['CS2', 'CD2', 'CS3', 'CD3', 'CS4', 'CD4', 'CD5', 'MT1', 'MA1'],
  totalSlots: 3,
  slots: [
    {
      section: 'CS3',
      year: '3rd Year',
      semester: '5th Semester',
      day: 'Monday',
      start: '09:00',
      end: '10:00',
      subjectCode: 'CS-311',
      facultyCode: 'AKM',
      faculty: 'AKM',
      room: 'G5',
      isLab: false,
      duration: 1,
      group: null,
      sessionId: 'CS3_CS-311_0_0',
      electiveType: null,
      basket: null,
      isReservedEmpty: false
    },
    {
      section: 'MT1',
      year: 'M.Tech 1st Year',
      semester: '1st Semester',
      day: 'Tuesday',
      start: '10:00',
      end: '11:00',
      subjectCode: 'CS-611',
      facultyCode: 'RK',
      faculty: 'RK',
      room: 'Seminar Hall - Block A',
      isLab: false,
      duration: 1,
      group: null,
      sessionId: 'MT1_CS-611_1_1',
      electiveType: null,
      basket: null,
      isReservedEmpty: false
    },
    {
      section: 'MA1',
      year: 'M.Tech 1st Year',
      semester: '1st Semester',
      day: 'Wednesday',
      start: '11:00',
      end: '13:00',
      subjectCode: 'CS-634',
      facultyCode: 'NG',
      faculty: 'NG',
      room: 'B2',
      isLab: true,
      duration: 2,
      group: 'G1',
      sessionId: 'MA1_CS-634_2_2',
      electiveType: null,
      basket: null,
      isReservedEmpty: false
    }
  ]
};
samplePackage.timetable = samplePackage.slots;

async function runTests() {
  const fatgsServer = createServer();
  await new Promise(resolve => fatgsServer.listen(0, '127.0.0.1', resolve));
  const fatgsPort = fatgsServer.address().port;
  console.log(`[INIT] FATGS test server listening on port ${fatgsPort}`);

  try {
    // --- TEST 1: Health check ---
    console.log('\n--- 1. TESTING GET /api/health ---');
    const health = await makeRequest(fatgsPort, '/api/health');
    assert.strictEqual(health.statusCode, 200);
    assert.strictEqual(health.body.status, 'ok');
    console.log('[PASS] TEST 1: /api/health returned 200 ok.');

    // --- TEST 2: Status check without secret leak ---
    console.log('\n--- 2. TESTING GET /api/tt-tracker/status ---');
    process.env.TT_TRACKER_URL = 'http://127.0.0.1:9999';
    process.env.TT_TRACKER_IMPORT_SECRET = 'super_secret_key_123';
    process.env.TT_TRACKER_IMPORT_ENDPOINT = '/api/timetable/import';
    const statusRes = await makeRequest(fatgsPort, '/api/tt-tracker/status');
    assert.strictEqual(statusRes.statusCode, 200);
    assert.strictEqual(statusRes.body.configured, true);
    assert.strictEqual(statusRes.body.ttTrackerUrl, 'http://127.0.0.1:9999');
    assert.strictEqual(statusRes.body.importEndpoint, '/api/timetable/import');
    assert.strictEqual(statusRes.body.TT_TRACKER_IMPORT_SECRET, undefined, 'Must NEVER return secret');
    assert.strictEqual(JSON.stringify(statusRes.body).includes('super_secret_key_123'), false);
    console.log('[PASS] TEST 2: Status endpoint confirms configuration without exposing secret.');

    // --- TEST 3: Incomplete package rejected with 400 ---
    console.log('\n--- 3. TESTING MALFORMED / INCOMPLETE PACKAGE REJECTION ---');
    const badPkgRes = await makeRequest(fatgsPort, '/api/handoff-timetable', 'POST', {
      package: { semester: 'Odd Semester', timetable: [] }
    });
    assert.strictEqual(badPkgRes.statusCode, 400);
    assert.strictEqual(badPkgRes.body.success, false);
    console.log('[PASS] TEST 3: Malformed package rejected with HTTP 400.');

    // --- TEST 4: Missing configuration error ---
    console.log('\n--- 4. TESTING MISSING CONFIGURATION ERROR ---');
    const originalUrl = process.env.TT_TRACKER_URL;
    delete process.env.TT_TRACKER_URL;
    const noConfigRes = await makeRequest(fatgsPort, '/api/handoff-timetable', 'POST', {
      package: samplePackage
    });
    assert.strictEqual(noConfigRes.statusCode, 500);
    assert.strictEqual(noConfigRes.body.success, false);
    assert.ok(noConfigRes.body.error.includes('TT_TRACKER_URL is not configured'));
    process.env.TT_TRACKER_URL = originalUrl;
    console.log('[PASS] TEST 4: Missing configuration returned HTTP 500 with helpful message.');

    // --- TEST 5: Successful TT_TRACKER Handoff ---
    console.log('\n--- 5. TESTING SUCCESSFUL HANDOFF WITH MOCK TT_TRACKER ---');
    let receivedPath = null;
    let receivedAuthHeader = null;
    let receivedSecretHeader = null;
    let receivedXImportSecretHeader = null;
    let receivedPayload = null;

    const mockTTSuccess = await createMockTTTrackerServer((req, res) => {
      receivedPath = req.url;
      receivedAuthHeader = req.headers['authorization'];
      receivedSecretHeader = req.headers['x-tt-tracker-secret'];
      receivedXImportSecretHeader = req.headers['x-import-secret'];
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        receivedPayload = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            message: 'Base timetable replaced successfully.',
            redirectUrl: `http://127.0.0.1:${mockTTSuccess.port}/timetable`
          })
        );
      });
    });

    process.env.TT_TRACKER_URL = `http://127.0.0.1:${mockTTSuccess.port}`;
    process.env.TT_TRACKER_IMPORT_ENDPOINT = '/api/timetable/import';
    process.env.TT_TRACKER_IMPORT_SECRET = 'authoritative_department_secret';

    const handoffSuccess = await makeRequest(fatgsPort, '/api/handoff-timetable', 'POST', {
      package: samplePackage
    });

    assert.strictEqual(handoffSuccess.statusCode, 200);
    assert.strictEqual(handoffSuccess.body.success, true);
    assert.strictEqual(handoffSuccess.body.redirectUrl, `http://127.0.0.1:${mockTTSuccess.port}/timetable`);
    assert.strictEqual(receivedPath, '/api/timetable/import', 'Must use /api/timetable/import endpoint');
    assert.strictEqual(receivedXImportSecretHeader, 'authoritative_department_secret');
    assert.strictEqual(receivedSecretHeader, 'authoritative_department_secret');
    assert.strictEqual(receivedAuthHeader, 'Bearer authoritative_department_secret');

    // Verify payload envelope matches TT_TRACKER expectations
    assert.ok(receivedPayload.packageId, 'Must include packageId');
    assert.strictEqual(receivedPayload.academicYear, '2025-2026');
    assert.strictEqual(receivedPayload.semesterType, 'Odd', 'TT_TRACKER requires canonical "Odd"');
    assert.ok(Array.isArray(receivedPayload.slots), 'Must send slots array');
    assert.strictEqual(receivedPayload.slots.length, 3);
    assert.ok(Array.isArray(receivedPayload.rooms), 'Must send rooms array');
    assert.ok(Array.isArray(receivedPayload.faculties), 'Must send faculties array');
    assert.ok(Array.isArray(receivedPayload.subjects), 'Must send subjects array');
    assert.ok(Array.isArray(receivedPayload.sections), 'Must send sections array');

    // Verify slot preservation
    const slotCS3 = receivedPayload.slots.find(s => s.subjectCode === 'CS-311');
    assert.strictEqual(slotCS3.section, 'CS3');
    assert.strictEqual(slotCS3.sessionId, 'CS3_CS-311_0_0');
    assert.strictEqual(slotCS3.duration, 1);

    // Verify M.Tech section mapping and independence
    const slotMT1 = receivedPayload.slots.find(s => s.subjectCode === 'CS-611');
    assert.strictEqual(slotMT1.section, 'MTECH-CSE', 'MT1 must map to MTECH-CSE for TT_TRACKER');
    assert.strictEqual(slotMT1.sectionId, 'Y1_S1_MTECH-CSE');
    assert.strictEqual(slotMT1.originalSection, 'MT1');
    assert.strictEqual(slotMT1.room, 'Seminar Hall - Block A');

    const slotMA1 = receivedPayload.slots.find(s => s.subjectCode === 'CS-634');
    assert.strictEqual(slotMA1.section, 'MTECH-AI', 'MA1 must map to MTECH-AI for TT_TRACKER');
    assert.strictEqual(slotMA1.sectionId, 'Y1_S1_MTECH-AI');
    assert.strictEqual(slotMA1.originalSection, 'MA1');
    assert.strictEqual(slotMA1.room, 'B2');
    assert.strictEqual(slotMA1.isLab, true);
    assert.strictEqual(slotMA1.duration, 2);
    assert.strictEqual(slotMA1.group, 'G1');
    assert.strictEqual(slotMA1.sessionId, 'MA1_CS-634_2_2');

    await new Promise(r => mockTTSuccess.server.close(r));
    console.log('[PASS] TEST 5: Successful handoff authenticated, used /api/timetable/import, sent slots envelope, and properly preserved/mapped M.Tech.');

    // --- TEST 6: Mock TT_TRACKER Validation Rejection (400/422) ---
    console.log('\n--- 6. TESTING TT_TRACKER VALIDATION REJECTION (400/422) ---');
    const mockTTReject = await createMockTTTrackerServer((req, res) => {
      res.writeHead(422, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Curriculum validation failed: section CS3 is missing.' }));
    });

    process.env.TT_TRACKER_URL = `http://127.0.0.1:${mockTTReject.port}`;
    const handoffReject = await makeRequest(fatgsPort, '/api/handoff-timetable', 'POST', {
      package: samplePackage
    });

    assert.strictEqual(handoffReject.statusCode, 422);
    assert.strictEqual(handoffReject.body.success, false);
    assert.ok(handoffReject.body.error.includes('TT_TRACKER import failed: Curriculum validation failed: section CS3 is missing.'));
    assert.strictEqual(handoffReject.body.redirectUrl, undefined, 'Must NOT provide redirectUrl on failure');
    await new Promise(r => mockTTReject.server.close(r));
    console.log('[PASS] TEST 6: TT_TRACKER rejection caught cleanly with exact failure message and zero redirect.');

    // --- TEST 7: Mock TT_TRACKER Auth Failure (401) ---
    console.log('\n--- 7. TESTING TT_TRACKER AUTHENTICATION FAILURE (401) ---');
    const mockTTAuthFail = await createMockTTTrackerServer((req, res) => {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Unauthorized secret' }));
    });

    process.env.TT_TRACKER_URL = `http://127.0.0.1:${mockTTAuthFail.port}`;
    const handoffAuthFail = await makeRequest(fatgsPort, '/api/handoff-timetable', 'POST', {
      package: samplePackage
    });

    assert.strictEqual(handoffAuthFail.statusCode, 401);
    assert.strictEqual(handoffAuthFail.body.success, false);
    assert.ok(handoffAuthFail.body.error.includes('Authentication failed'));
    assert.strictEqual(handoffAuthFail.body.redirectUrl, undefined);
    await new Promise(r => mockTTAuthFail.server.close(r));
    console.log('[PASS] TEST 7: TT_TRACKER 401 auth failure handled cleanly.');

    // --- TEST 8: Mock TT_TRACKER Internal Error (500) ---
    console.log('\n--- 8. TESTING TT_TRACKER SERVER ERROR (500) ---');
    const mockTTServerErr = await createMockTTTrackerServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Database connection failed' }));
    });

    process.env.TT_TRACKER_URL = `http://127.0.0.1:${mockTTServerErr.port}`;
    const handoffServerErr = await makeRequest(fatgsPort, '/api/handoff-timetable', 'POST', {
      package: samplePackage
    });

    assert.strictEqual(handoffServerErr.statusCode, 500);
    assert.strictEqual(handoffServerErr.body.success, false);
    assert.strictEqual(handoffServerErr.body.redirectUrl, undefined);
    await new Promise(r => mockTTServerErr.server.close(r));
    console.log('[PASS] TEST 8: TT_TRACKER 500 internal error handled cleanly.');

    // --- TEST 9: Unreachable TT_TRACKER / Connection Refused ---
    console.log('\n--- 9. TESTING UNREACHABLE TT_TRACKER SERVER ---');
    process.env.TT_TRACKER_URL = 'http://127.0.0.1:59999'; // Non-existent port
    const handoffDown = await makeRequest(fatgsPort, '/api/handoff-timetable', 'POST', {
      package: samplePackage
    });

    assert.strictEqual(handoffDown.statusCode, 502);
    assert.strictEqual(handoffDown.body.success, false);
    assert.ok(handoffDown.body.error.includes('Unable to connect to TT_TRACKER'));
    assert.strictEqual(handoffDown.body.redirectUrl, undefined);
    // --- TEST 10: Handoff by semester without passing package ---
    console.log('\n--- 10. TESTING HANDOFF INVOKED BY SEMESTER CONTEXT ---');
    let semesterReceivedPayload = null;
    const mockTTSemester = await createMockTTTrackerServer((req, res) => {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        semesterReceivedPayload = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            message: 'Odd semester imported successfully.',
            redirectUrl: `http://127.0.0.1:${mockTTSemester.port}/timetable`
          })
        );
      });
    });

    process.env.TT_TRACKER_URL = `http://127.0.0.1:${mockTTSemester.port}`;
    const semHandoffRes = await makeRequest(fatgsPort, '/api/handoff-timetable', 'POST', {
      semester: 'Odd Semester'
    });

    assert.strictEqual(semHandoffRes.statusCode, 200);
    assert.strictEqual(semHandoffRes.body.success, true);
    assert.ok(semesterReceivedPayload.slots.length > 0, 'Must load slots from generation state');
    assert.strictEqual(semesterReceivedPayload.semesterType, 'Odd', 'TT_TRACKER requires canonical "Odd"');
    await new Promise(r => mockTTSemester.server.close(r));
    console.log('[PASS] TEST 10: Handoff by semester loaded generated records from backend state and transferred cleanly.');

    // --- TEST 11: normalizeSemesterType unit tests ---
    console.log('\n--- 11. TESTING SEMESTER TYPE NORMALIZATION ---');
    assert.strictEqual(normalizeSemesterType('Odd'), 'Odd');
    assert.strictEqual(normalizeSemesterType('odd'), 'Odd');
    assert.strictEqual(normalizeSemesterType('Odd Semester'), 'Odd');
    assert.strictEqual(normalizeSemesterType('Even'), 'Even');
    assert.strictEqual(normalizeSemesterType('even'), 'Even');
    assert.strictEqual(normalizeSemesterType('Even Semester'), 'Even');
    assert.strictEqual(normalizeSemesterType('Invalid'), 'Invalid');
    console.log('[PASS] TEST 11: normalizeSemesterType maps Odd/Even variations to canonical values and preserves unknowns for validation.');

    // --- TEST 12: Even semester handoff sends canonical 'Even' ---
    console.log('\n--- 12. TESTING EVEN SEMESTER CANONICAL HANDOFF ---');
    let evenReceivedPayload = null;
    const mockTTEven = await createMockTTTrackerServer((req, res) => {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        evenReceivedPayload = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, redirectUrl: 'http://127.0.0.1/even' }));
      });
    });
    const evenHandoffRes = await handoffToTTTracker(
      { ...samplePackage, semester: 'Even Semester', semesterType: 'Even Semester' },
      { url: `http://127.0.0.1:${mockTTEven.port}`, secret: 'authoritative_department_secret' }
    );
    assert.strictEqual(evenHandoffRes.success, true);
    assert.strictEqual(evenReceivedPayload.semesterType, 'Even', 'Must pass canonical "Even" to TT_TRACKER');
    await new Promise(r => mockTTEven.server.close(r));
    console.log('[PASS] TEST 12: Even Semester handoff produces canonical semesterType "Even".');

    // --- TEST 13: Rejection of invalid semester type ---
    console.log('\n--- 13. TESTING REJECTION OF INVALID SEMESTER TYPE ---');
    const invalidSemRes = await makeRequest(fatgsPort, '/api/handoff-timetable', 'POST', {
      package: { ...samplePackage, semester: 'Invalid', semesterType: 'Invalid' }
    });
    assert.strictEqual(invalidSemRes.statusCode, 400);
    assert.strictEqual(invalidSemRes.body.success, false);
    assert.ok(invalidSemRes.body.error.includes('Invalid semesterType "Invalid": Must be "Odd" or "Even".'));
    console.log('[PASS] TEST 13: Invalid semester string rejected with HTTP 400.');

    console.log('\n===============================================================');
    console.log('FINAL RESULT: ALL 13 BACKEND & INTEGRATION TESTS PASSED!');
    console.log('===============================================================\n');
  } finally {
    await new Promise(r => fatgsServer.close(r));
  }
}

runTests().catch(err => {
  console.error('[FATAL TEST FAILURE]:', err);
  process.exit(1);
});

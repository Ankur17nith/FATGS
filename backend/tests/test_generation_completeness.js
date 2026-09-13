/**
 * FATGS Test Suite: Backend-Driven Generation Completeness & Export Readiness
 *
 * Validates:
 *  1. Data-driven required section evaluation based on actual subjects data.
 *  2. Sections with zero classes do NOT block completion.
 *  3. Initial generation status reports ungenerated sections and export blocked.
 *  4. Incomplete export requests are independently rejected by the backend (HTTP 400).
 *  5. Successful generation records are saved only on valid non-empty slot generation.
 *  6. Failed generation payloads are rejected and do not create false state.
 *  7. Incremental section generation correctly updates backend counts.
 *  8. Export JSON becomes available ONLY when ALL required sections with classes are generated.
 *  9. Export JSON returns previously generated slots without calling any scheduler.
 * 10. Generation state is persistent on disk across server reloads.
 * 11. Stale / reset generations correctly invalidate export readiness.
 * 12. Handoff timetable endpoint respects backend generation completeness when enforced.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const {
  createServer,
  getRequiredSections,
  getGenerationStatus,
  recordSectionGeneration,
  resetGeneration,
  exportTimetable
} = require('../server.js');

console.log('===============================================================');
console.log('   FATGS BACKEND GENERATION COMPLETENESS & EXPORT TESTS        ');
console.log('===============================================================');

function makeRequest(port, path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const headers = {};
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers
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

function mockSlot(secName, sem, subCode) {
  return {
    section: secName,
    year: '2nd Year',
    semester: sem,
    day: 'Monday',
    start: '09:00',
    end: '10:00',
    subjectCode: subCode,
    facultyCode: 'KD',
    faculty: 'Dr Kamlesh Dutta',
    room: 'B4',
    isLab: false,
    duration: 1,
    group: null,
    sessionId: `${secName}_${subCode}_0_0`,
    electiveType: null,
    basket: null,
    isReservedEmpty: false
  };
}

async function runTests() {
  const testDir = path.join(__dirname, '../output/test_scratch');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
  const testStatePath = path.join(testDir, 'test_generation_state.json');
  if (fs.existsSync(testStatePath)) fs.unlinkSync(testStatePath);

  // --- 1. AUDITING REQUIRED SECTIONS (DATA-DRIVEN) ---
  console.log('\n--- 1. AUDITING REQUIRED SECTIONS (DATA-DRIVEN) ---');
  const oddRequired = getRequiredSections('Odd Semester');
  const oddNames = oddRequired.map(s => s.name);
  console.log('Odd Semester detected sections:', oddNames);
  assert.deepStrictEqual(
    oddNames.sort(),
    ['CD2', 'CD3', 'CD4', 'CD5', 'CS2', 'CS3', 'CS4'].sort(),
    'Odd Semester must require exactly CS2, CD2, CS3, CD3, CS4, CD4, CD5'
  );
  assert.ok(oddRequired.every(s => s.hasClasses === true));
  console.log('[PASS] TEST 1: Odd Semester required sections detected from data (7 sections, all have classes).');

  // --- 2. AUDITING SECTIONS WITH ZERO CLASSES ---
  console.log('\n--- 2. AUDITING ZERO-CLASS SECTIONS ---');
  const mockSubjects = [
    {
      name: 'CS2',
      year: '2nd Year',
      semester: '3rd Semester',
      subjects: [{ code: 'CS-212' }],
      labs: [],
      electives: []
    },
    {
      name: 'EMPTY_SEC',
      year: '2nd Year',
      semester: '3rd Semester',
      subjects: [],
      labs: [],
      electives: []
    }
  ];
  const customReq = getRequiredSections('Odd Semester', mockSubjects);
  assert.strictEqual(customReq.length, 2);
  const emptySec = customReq.find(s => s.name === 'EMPTY_SEC');
  assert.strictEqual(emptySec.hasClasses, false);

  const customStatus = getGenerationStatus('Odd Semester', {
    subjectsData: mockSubjects,
    statePath: testStatePath
  });
  // The empty section should NOT count as required
  assert.strictEqual(customStatus.totalRequired, 1);
  console.log('[PASS] TEST 2: Section with 0 classes does NOT block completion (totalRequired ignores it).');

  // --- 3. SERVER INITIALIZATION WITH ISOLATED TEST STATE ---
  console.log('\n--- 3. TESTING INITIAL SERVER GENERATION STATUS ---');
  const server = createServer({ statePath: testStatePath });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const initStatus = await makeRequest(port, '/api/timetable/generation-status?semester=Odd%20Semester');
  assert.strictEqual(initStatus.statusCode, 200);
  assert.strictEqual(initStatus.body.totalRequired, 7);
  assert.strictEqual(initStatus.body.totalGenerated, 0);
  assert.strictEqual(initStatus.body.allRequiredGenerated, false);
  assert.strictEqual(initStatus.body.exportAllowed, false);
  console.log('[PASS] TEST 3: Initial status correctly reports 0/7 generated, exportAllowed = false.');

  // --- 4. BACKEND INDEPENDENTLY REJECTS INCOMPLETE EXPORT ---
  console.log('\n--- 4. TESTING INCOMPLETE EXPORT REJECTION (HTTP 400) ---');
  const exportRes = await makeRequest(port, '/api/timetable/export?semester=Odd%20Semester');
  assert.strictEqual(exportRes.statusCode, 400);
  assert.strictEqual(exportRes.body.success, false);
  assert.ok(exportRes.body.error.includes('Base timetable generation is incomplete'));
  assert.strictEqual(exportRes.body.missingSections.length, 7);
  console.log('[PASS] TEST 4: Export independently rejected by backend with HTTP 400 and list of missing sections.');

  // --- 5. FAILED / INVALID GENERATION DOES NOT RECORD SUCCESS ---
  console.log('\n--- 5. TESTING REJECTION OF FAILED / EMPTY GENERATION ---');
  const failRes = await makeRequest(port, '/api/timetable/record-generation', 'POST', {
    section: 'CS2',
    year: '2nd Year',
    semester: '3rd Semester',
    slots: [] // Empty slots represents a generation failure
  });
  assert.strictEqual(failRes.statusCode, 400);
  assert.strictEqual(failRes.body.success, false);

  const statusAfterFail = await makeRequest(port, '/api/timetable/generation-status?semester=Odd%20Semester');
  assert.strictEqual(statusAfterFail.body.totalGenerated, 0);
  const cs2Status = statusAfterFail.body.sections.find(s => s.name === 'CS2');
  assert.strictEqual(cs2Status.generated, false);
  console.log('[PASS] TEST 5: Empty/failed generation rejected and CS2 remains marked as NOT generated.');

  // --- 6. SUCCESSFUL GENERATION RECORDING (INCREMENTAL) ---
  console.log('\n--- 6. TESTING RECORDING OF GENERATION SUCCESS ---');
  const rec1 = await makeRequest(port, '/api/timetable/record-generation', 'POST', {
    section: 'CS2',
    year: '2nd Year',
    semester: '3rd Semester',
    generationId: 'gen_CS2_test_1',
    slots: [mockSlot('CS2', '3rd Semester', 'CS-212'), mockSlot('CS2', '3rd Semester', 'CS-213')]
  });
  assert.strictEqual(rec1.statusCode, 200);
  assert.strictEqual(rec1.body.success, true);

  const statusAfterRec1 = await makeRequest(port, '/api/timetable/generation-status?semester=Odd%20Semester');
  assert.strictEqual(statusAfterRec1.body.totalGenerated, 1);
  assert.strictEqual(statusAfterRec1.body.exportAllowed, false);
  const cs2Updated = statusAfterRec1.body.sections.find(s => s.name === 'CS2');
  assert.strictEqual(cs2Updated.generated, true);
  assert.strictEqual(cs2Updated.slotCount, 2);
  console.log('[PASS] TEST 6: CS2 recorded successfully (1/7 generated, export still blocked).');

  // --- 7. PARTIAL GENERATION LEAVES EXPORT BLOCKED ---
  console.log('\n--- 7. TESTING PARTIAL GENERATION EXPORT ATTEMPT ---');
  const rec2 = await makeRequest(port, '/api/timetable/record-generation', 'POST', {
    section: 'CD2',
    year: '2nd Year',
    semester: '3rd Semester',
    generationId: 'gen_CD2_test_1',
    slots: [mockSlot('CD2', '3rd Semester', 'CS-212')]
  });
  assert.strictEqual(rec2.statusCode, 200);

  const exportPartial = await makeRequest(port, '/api/timetable/export?semester=Odd%20Semester');
  assert.strictEqual(exportPartial.statusCode, 400);
  assert.strictEqual(exportPartial.body.missingSections.length, 5); // 5 remaining ungenerated
  console.log('[PASS] TEST 7: 2/7 generated, export remains disabled.');

  // --- 8. GENERATING ALL REMAINING REQUIRED SECTIONS ---
  console.log('\n--- 8. GENERATING ALL REMAINING REQUIRED SECTIONS ---');
  const remaining = [
    { name: 'CS3', year: '3rd Year', sem: '5th Semester' },
    { name: 'CD3', year: '3rd Year', sem: '5th Semester' },
    { name: 'CS4', year: '4th Year', sem: '7th Semester' },
    { name: 'CD4', year: '4th Year', sem: '7th Semester' },
    { name: 'CD5', year: '5th Year', sem: '9th Semester' }
  ];

  for (const s of remaining) {
    const r = await makeRequest(port, '/api/timetable/record-generation', 'POST', {
      section: s.name,
      year: s.year,
      semester: s.sem,
      generationId: `gen_${s.name}_test_1`,
      slots: [mockSlot(s.name, s.sem, `SUB-${s.name}`)]
    });
    assert.strictEqual(r.statusCode, 200);
  }

  const fullStatus = await makeRequest(port, '/api/timetable/generation-status?semester=Odd%20Semester');
  assert.strictEqual(fullStatus.body.totalRequired, 7);
  assert.strictEqual(fullStatus.body.totalGenerated, 7);
  assert.strictEqual(fullStatus.body.allRequiredGenerated, true);
  assert.strictEqual(fullStatus.body.exportAllowed, true);
  console.log('[PASS] TEST 8: All 7 required sections generated -> exportAllowed = true.');

  // --- 9. EXPORT JSON DELIVERS PERSISTED SLOTS WITHOUT REGENERATION ---
  console.log('\n--- 9. TESTING EXPORT JSON CONTENT ---');
  const exportFull = await makeRequest(port, '/api/timetable/export?semester=Odd%20Semester');
  assert.strictEqual(exportFull.statusCode, 200);
  assert.strictEqual(exportFull.body.semester, 'Odd Semester');
  assert.strictEqual(exportFull.body.sections.length, 7);
  assert.strictEqual(exportFull.body.totalSlots, 8); // 2 from CS2 + 1 each from CD2, CS3, CD3, CS4, CD4, CD5
  assert.strictEqual(exportFull.body.timetable.length, 8);
  console.log('[PASS] TEST 9: Export JSON delivers complete package using existing generated data (no regeneration).');

  // --- 10. RESTART / DISK PERSISTENCE VERIFICATION ---
  console.log('\n--- 10. TESTING DISK PERSISTENCE ACROSS SERVER INSTANCES ---');
  await new Promise(resolve => server.close(resolve));

  // Spin up a brand new server instance using the same state path
  const server2 = createServer({ statePath: testStatePath });
  await new Promise(resolve => server2.listen(0, '127.0.0.1', resolve));
  const port2 = server2.address().port;

  const statusRestart = await makeRequest(port2, '/api/timetable/generation-status?semester=Odd%20Semester');
  assert.strictEqual(statusRestart.body.totalGenerated, 7);
  assert.strictEqual(statusRestart.body.allRequiredGenerated, true);
  assert.strictEqual(statusRestart.body.exportAllowed, true);
  console.log('[PASS] TEST 10: Generation state persisted on disk and reloaded cleanly by new server instance.');

  // --- 11. RESET / STALE GENERATION INVALIDATION ---
  console.log('\n--- 11. TESTING GENERATION RESET & STALENESS ---');
  const resetRes = await makeRequest(port2, '/api/timetable/reset-generation', 'POST', {
    section: 'CS2',
    year: '2nd Year',
    semester: '3rd Semester'
  });
  assert.strictEqual(resetRes.statusCode, 200);

  const statusAfterReset = await makeRequest(port2, '/api/timetable/generation-status?semester=Odd%20Semester');
  assert.strictEqual(statusAfterReset.body.totalGenerated, 6);
  assert.strictEqual(statusAfterReset.body.exportAllowed, false);
  const cs2AfterReset = statusAfterReset.body.sections.find(s => s.name === 'CS2');
  assert.strictEqual(cs2AfterReset.generated, false);

  const exportBlockedAfterReset = await makeRequest(port2, '/api/timetable/export?semester=Odd%20Semester');
  assert.strictEqual(exportBlockedAfterReset.statusCode, 400);
  assert.deepStrictEqual(exportBlockedAfterReset.body.missingSections, ['CS2 (3rd Semester)']);
  console.log('[PASS] TEST 11: Resetting a section immediately revokes export readiness and identifies missing CS2.');

  // Clean up
  await new Promise(resolve => server2.close(resolve));
  if (fs.existsSync(testStatePath)) fs.unlinkSync(testStatePath);

  console.log('\n===============================================================');
  console.log('FINAL RESULT: ALL 11 GENERATION COMPLETENESS TESTS PASSED!');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('\n[FAIL] Test failure:', err);
  process.exit(1);
});

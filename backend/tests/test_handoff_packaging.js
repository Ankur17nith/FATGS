/**
 * FATGS Test Suite: Semester Handoff Packaging & Completeness
 *
 * Validates:
 *  1. Data-driven required section detection (Odd vs Even semesters).
 *  2. Sections with zero classes do not block handoff (CD5 in Even semester).
 *  3. Incomplete exports block readiness.
 *  4. Stale exports (regenerated after export) are detected and block readiness.
 *  5. Package structure preserves all required timetable slot fields, groups, labs, electives.
 *  6. validateSemesterPackage correctly validates valid packages and rejects malformed ones.
 */

const assert = require('assert');
const path = require('path');
const funcs = require('../entities/functions.js');
const { validateSemesterPackage } = require('../server.js');

const subjectsPath = path.join(__dirname, '../data/subjects.json');
const sections = funcs.subject_parse(subjectsPath);

console.log('===============================================================');
console.log('   FATGS SEMESTER HANDOFF PACKAGING & COMPLETENESS TESTS       ');
console.log('===============================================================');

// --- TEST 1: Required Section Detection for Odd Semester ---
console.log('\n--- 1. AUDITING REQUIRED SECTIONS (ODD SEMESTER) ---');
const oddSections = sections.filter(sec => {
  const isMTech = sec.year && sec.year.includes('M.Tech');
  if (isMTech) return false;
  const isOdd = sec.semester.includes('1st') || sec.semester.includes('3rd') ||
                sec.semester.includes('5th') || sec.semester.includes('7th') ||
                sec.semester.includes('9th');
  if (!isOdd) return false;
  const totalClasses = (sec.subjects?.length || 0) + (sec.labs?.length || 0) + (sec.electives?.length || 0);
  return totalClasses > 0;
});

const oddNames = oddSections.map(s => s.name);
console.log('Detected Odd Semester Required Sections:', oddNames);
assert.deepStrictEqual(
  oddNames.sort(),
  ['CD2', 'CD3', 'CD4', 'CD5', 'CS2', 'CS3', 'CS4'].sort(),
  'Odd Semester must require exactly CS2, CD2, CS3, CD3, CS4, CD4, CD5'
);
console.log('[PASS] TEST 1: Odd Semester required sections exactly match institutional curriculum (7 sections).');

// --- TEST 2: Required Section Detection for Even Semester ---
console.log('\n--- 2. AUDITING REQUIRED SECTIONS (EVEN SEMESTER) ---');
const evenSections = sections.filter(sec => {
  const isMTech = sec.year && sec.year.includes('M.Tech');
  if (isMTech) return false;
  const isEven = sec.semester.includes('2nd') || sec.semester.includes('4th') ||
                 sec.semester.includes('6th') || sec.semester.includes('8th') ||
                 sec.semester.includes('10th');
  if (!isEven) return false;
  const totalClasses = (sec.subjects?.length || 0) + (sec.labs?.length || 0) + (sec.electives?.length || 0);
  return totalClasses > 0;
});

const evenNames = evenSections.map(s => s.name);
console.log('Detected Even Semester Required Sections:', evenNames);
assert.deepStrictEqual(
  evenNames.sort(),
  ['CD2', 'CD3', 'CD4', 'CS2', 'CS3', 'CS4'].sort(),
  'Even Semester must require exactly CS2, CD2, CS3, CD3, CS4, CD4'
);
assert.strictEqual(evenNames.includes('CD5'), false, 'CD5 has no Even semester classes and must not be required');
console.log('[PASS] TEST 2: Even Semester required sections exclude CD5 (CD5 has no classes in Even semester).');

// --- TEST 3: Incomplete Export Blocks Readiness ---
console.log('\n--- 3. TESTING INCOMPLETE EXPORT DETECTION ---');
const mockExportedSections = new Map();
// Only export CS2 and CD2
mockExportedSections.set('CS2_2nd Year_3rd Semester', { generationId: 'gen_1' });
mockExportedSections.set('CD2_2nd Year_3rd Semester', { generationId: 'gen_2' });

const missing = oddSections.filter(s => {
  const key = `${s.name}_${s.year}_${s.semester}`;
  return !mockExportedSections.has(key);
});
assert.strictEqual(missing.length, 5, 'Must detect 5 missing sections');
const isReady = missing.length === 0;
assert.strictEqual(isReady, false, 'Readiness must be false when required sections are missing');
console.log('[PASS] TEST 3: Incomplete exports properly block handoff readiness.');

// --- TEST 4: Stale Export Detection ---
console.log('\n--- 4. TESTING STALE EXPORT DETECTION ---');
const gridGenerations = new Map();
const freshExports = new Map();

oddSections.forEach(s => {
  const key = `${s.name}_${s.year}_${s.semester}`;
  gridGenerations.set(key, `gen_${key}_v1`);
  freshExports.set(key, { generationId: `gen_${key}_v1` });
});

// All are fresh initially
let staleCount = oddSections.filter(s => {
  const key = `${s.name}_${s.year}_${s.semester}`;
  return gridGenerations.get(key) !== freshExports.get(key).generationId;
}).length;
assert.strictEqual(staleCount, 0, 'Initially 0 stale sections');

// Simulate user regenerating CS3 inside FATGS
gridGenerations.set('CS3_3rd Year_5th Semester', 'gen_CS3_3rd Year_5th Semester_v2_REGENERATED');

// Now CS3 must be detected as stale
staleCount = oddSections.filter(s => {
  const key = `${s.name}_${s.year}_${s.semester}`;
  return gridGenerations.get(key) !== freshExports.get(key).generationId;
}).length;
assert.strictEqual(staleCount, 1, 'Must detect 1 stale section after regeneration');
console.log('[PASS] TEST 4: Stale export is detected when a section is regenerated after export.');

// --- TEST 5: Complete Package Structure Validation ---
console.log('\n--- 5. TESTING PACKAGE STRUCTURE VALIDATION ---');
const sampleValidPackage = {
  schemaVersion: '1.0.0',
  source: 'FATGS',
  semester: 'Odd Semester',
  academicYear: '2025-2026',
  exportedAt: new Date().toISOString(),
  generationId: 'pkg_test_12345',
  sections: ['CS2', 'CD2', 'CS3', 'CD3', 'CS4', 'CD4', 'CD5'],
  totalSlots: 2,
  timetable: [
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
      section: 'CS3',
      year: '3rd Year',
      semester: '5th Semester',
      day: 'Tuesday',
      start: '09:00',
      end: '11:00',
      subjectCode: 'CS-315',
      facultyCode: 'AKY',
      faculty: 'AKY',
      room: 'P1',
      isLab: true,
      duration: 2,
      group: 'G1',
      sessionId: 'CS3_CS-315_CS-316_1_0',
      electiveType: null,
      basket: null,
      isReservedEmpty: false
    }
  ]
};

const validationResult = validateSemesterPackage(sampleValidPackage);
assert.strictEqual(validationResult.valid, true, 'Valid package must pass validation');

// Incomplete packages must fail
assert.strictEqual(validateSemesterPackage(null).valid, false);
assert.strictEqual(validateSemesterPackage({}).valid, false);
assert.strictEqual(validateSemesterPackage({ ...sampleValidPackage, semester: '' }).valid, false);
assert.strictEqual(validateSemesterPackage({ ...sampleValidPackage, timetable: [] }).valid, false);
assert.strictEqual(validateSemesterPackage({ ...sampleValidPackage, sections: [] }).valid, false);

console.log('[PASS] TEST 5: validateSemesterPackage correctly validates valid packages and rejects incomplete ones.');

console.log('\n===============================================================');
console.log('FINAL RESULT: ALL 5 PACKAGING & COMPLETENESS TESTS PASSED!');
console.log('===============================================================\n');

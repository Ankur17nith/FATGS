const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { generateBaseTimetable, toFlatSlotList } = require('../entities/baseTimetableGenerator.js');
const facultyData = require('../data/faculty.json');
const subjectsData = require('../data/subjects.json');

console.log('\n===============================================================');
console.log('   FATGS FINAL REQUIREMENTS & ELECTIVE SYNCHRONIZATION TESTS   ');
console.log('===============================================================\n');

const subjectsPath = path.join(__dirname, '../data/subjects.json');
const roomsPath = path.join(__dirname, '../data/rooms.json');

let allPassed = true;

function test(name, fn) {
    try {
        fn();
        console.log(`\x1b[32m[PASS]\x1b[0m ${name}`);
    } catch (err) {
        console.error(`\x1b[31m[FAIL]\x1b[0m ${name}: ${err.message}`);
        allPassed = false;
    }
}

// 1. Verify Faculty Full Name & Code Data Structure
test('Requirement 7, 8, 42: Faculty roster has full names and codes', () => {
    assert(Array.isArray(facultyData) && facultyData.length >= 33, 'Faculty roster must have at least 33 members');
    for (const f of facultyData) {
        assert(f.code && f.facultyCode, `Faculty missing code: ${JSON.stringify(f)}`);
        assert(f.name && f.facultyFullName, `Faculty missing name: ${JSON.stringify(f)}`);
    }
    const akm = facultyData.find(f => f.code === 'AKM');
    assert.strictEqual(akm.facultyFullName, 'Dr Ajay Kumar Mallick', 'AKM full name must match official Excel');
});

// 2. Verify Academic Structure Coverage
test('Requirement 5, 6, 26: Academic structure includes 3rd, 4th, 5th, 6th, 7th, 8th Sem & M.Tech', () => {
    const sems = new Set(subjectsData.map(s => `${s.year} - ${s.semester}`));
    assert(sems.has('2nd Year - 3rd Semester'), 'Missing 2nd Year 3rd Semester');
    assert(sems.has('2nd Year - 4th Semester'), 'Missing 2nd Year 4th Semester');
    assert(sems.has('3rd Year - 5th Semester'), 'Missing 3rd Year 5th Semester');
    assert(sems.has('3rd Year - 6th Semester'), 'Missing 3rd Year 6th Semester');
    assert(sems.has('4th Year - 7th Semester'), 'Missing 4th Year 7th Semester');
    assert(sems.has('4th Year - 8th Semester'), 'Missing 4th Year 8th Semester');
    assert(sems.has('M.Tech 1st Year - 1st Semester'), 'Missing M.Tech 1st Year');

    const sections = new Set(subjectsData.map(s => s.name));
    assert(!sections.has('CS5'), 'CS5 must NOT exist');
    assert(sections.has('MT1') && sections.has('MA1'), 'M.Tech sections MT1 and MA1 must exist');
});

// 3. Verify Non-scheduled Classes
test('Requirement 26 & 27: CS-416 and CS-499 are NOT scheduled in timetable', () => {
    const sections = generateBaseTimetable(subjectsPath, roomsPath, null, { includeMTech: true });
    const slots = toFlatSlotList(sections);
    const forbidden = slots.filter(s => s.subjectCode === 'CS-416' || s.subjectCode === 'CS-499');
    assert.strictEqual(forbidden.length, 0, 'CS-416 and CS-499 must never be scheduled');
});

// 4. Verify SA-201 Reservation
test('Requirement 28: SA-201 reserved slot exists for CS2 and CD2 4th Semester', () => {
    const sections = generateBaseTimetable(subjectsPath, roomsPath, s => s.semester === '4th Semester');
    const slots = toFlatSlotList(sections);
    const sa201 = slots.filter(s => s.subjectCode === 'SA-201');
    assert(sa201.length >= 2, 'SA-201 slots must exist');
    assert(sa201.every(s => s.isReservedEmpty && !s.faculty && !s.room), 'SA-201 must have no faculty and no room');
});

// 5. Verify Prompt Section 45: Conceptual Elective Test (CASE A vs CASE B)
test('Requirement 45: Elective Test CASE A (2 DE offered -> exactly 2 simultaneous classes, unassigned omitted)', () => {
    // Custom test data where CS-351 and CS-352 are assigned faculty, and CS-353 is unassigned
    const testSections = [
        {
            name: 'CS3',
            year: '3rd Year',
            semester: '5th Semester',
            subjects: [
                { code: 'CS-311', name: 'Algorithm', credits: 3, L: 3, T: 0, P: 0, type: 'Theory', faculty: 'AKM' },
                { code: 'CS-312', name: 'Compiler', credits: 3, L: 3, T: 0, P: 0, type: 'Theory', faculty: 'AKY' }
            ],
            labs: [],
            electives: [
                { code: 'CS-351', name: 'Advance Operating System', credits: 3, L: 3, T: 0, P: 0, type: 'DE', basket: 'Discipline Elective-II', faculty: 'DPM' },
                { code: 'CS-352', name: 'Graph Theory', credits: 3, L: 3, T: 0, P: 0, type: 'DE', basket: 'Discipline Elective-II', faculty: 'PRA' },
                { code: 'CS-353', name: 'Information Retrieval', credits: 3, L: 3, T: 0, P: 0, type: 'DE', basket: 'Discipline Elective-II', faculty: null } // Unassigned!
            ]
        },
        {
            name: 'CD3',
            year: '3rd Year',
            semester: '5th Semester',
            subjects: [
                { code: 'CS-311', name: 'Algorithm', credits: 3, L: 3, T: 0, P: 0, type: 'Theory', faculty: 'AKM' },
                { code: 'CS-312', name: 'Compiler', credits: 3, L: 3, T: 0, P: 0, type: 'Theory', faculty: 'AKY' }
            ],
            labs: [],
            electives: [
                { code: 'CS-351', name: 'Advance Operating System', credits: 3, L: 3, T: 0, P: 0, type: 'DE', basket: 'Discipline Elective-II', faculty: 'DPM' },
                { code: 'CS-352', name: 'Graph Theory', credits: 3, L: 3, T: 0, P: 0, type: 'DE', basket: 'Discipline Elective-II', faculty: 'PRA' },
                { code: 'CS-353', name: 'Information Retrieval', credits: 3, L: 3, T: 0, P: 0, type: 'DE', basket: 'Discipline Elective-II', faculty: null } // Unassigned!
            ]
        }
    ];

    const tempJsonPath = path.join(__dirname, 'temp_case_a.json');
    fs.writeFileSync(tempJsonPath, JSON.stringify(testSections));

    try {
        const generated = generateBaseTimetable(tempJsonPath, roomsPath, null, { usePlaceholderFaculty: false });
        const slots = toFlatSlotList(generated);

        // CS-353 must NEVER appear
        const cs353 = slots.filter(s => s.subjectCode === 'CS-353');
        assert.strictEqual(cs353.length, 0, 'CASE A: Unassigned CS-353 must NOT appear in timetable');

        // CS-351 and CS-352 must both appear
        const cs351 = slots.filter(s => s.subjectCode === 'CS-351');
        const cs352 = slots.filter(s => s.subjectCode === 'CS-352');
        assert(cs351.length > 0 && cs352.length > 0, 'CASE A: CS-351 and CS-352 must both be scheduled');

        // Each occurrence of CS-351 must be synchronized at the EXACT SAME TIME as CS-352
        for (const s1 of cs351) {
            const match = cs352.find(s2 => s2.section === s1.section && s2.day === s1.day && s2.start === s1.start);
            assert(match, `CASE A: CS-351 on ${s1.day} ${s1.start} must have simultaneous CS-352`);
            assert.notStrictEqual(s1.room, match.room, 'CASE A: Simultaneous DE classes must use distinct rooms');
        }

        // DE Groups must be DE-1 and DE-2
        const groups = new Set([...cs351.map(s => s.group), ...cs352.map(s => s.group)]);
        assert(groups.has('DE-1') && groups.has('DE-2'), 'CASE A: Groups must be DE-1 and DE-2');
        assert(!groups.has('DE-3'), 'CASE A: There must NOT be a DE-3 group');
    } finally {
        if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
    }
});

test('Requirement 45: Elective Test CASE B (3 DE offered -> exactly 3 simultaneous classes)', () => {
    // Custom test data where all 3 DE subjects are assigned faculty
    const testSections = [
        {
            name: 'CS3',
            year: '3rd Year',
            semester: '5th Semester',
            subjects: [
                { code: 'CS-311', name: 'Algorithm', credits: 3, L: 3, T: 0, P: 0, type: 'Theory', faculty: 'AKM' }
            ],
            labs: [],
            electives: [
                { code: 'CS-351', name: 'Advance Operating System', credits: 3, L: 3, T: 0, P: 0, type: 'DE', basket: 'Discipline Elective-II', faculty: 'DPM' },
                { code: 'CS-352', name: 'Graph Theory', credits: 3, L: 3, T: 0, P: 0, type: 'DE', basket: 'Discipline Elective-II', faculty: 'PRA' },
                { code: 'CS-353', name: 'Information Retrieval', credits: 3, L: 3, T: 0, P: 0, type: 'DE', basket: 'Discipline Elective-II', faculty: 'JS' }
            ]
        },
        {
            name: 'CD3',
            year: '3rd Year',
            semester: '5th Semester',
            subjects: [
                { code: 'CS-311', name: 'Algorithm', credits: 3, L: 3, T: 0, P: 0, type: 'Theory', faculty: 'AKM' }
            ],
            labs: [],
            electives: [
                { code: 'CS-351', name: 'Advance Operating System', credits: 3, L: 3, T: 0, P: 0, type: 'DE', basket: 'Discipline Elective-II', faculty: 'DPM' },
                { code: 'CS-352', name: 'Graph Theory', credits: 3, L: 3, T: 0, P: 0, type: 'DE', basket: 'Discipline Elective-II', faculty: 'PRA' },
                { code: 'CS-353', name: 'Information Retrieval', credits: 3, L: 3, T: 0, P: 0, type: 'DE', basket: 'Discipline Elective-II', faculty: 'JS' }
            ]
        }
    ];

    const tempJsonPath = path.join(__dirname, 'temp_case_b.json');
    fs.writeFileSync(tempJsonPath, JSON.stringify(testSections));

    try {
        const generated = generateBaseTimetable(tempJsonPath, roomsPath, null, { usePlaceholderFaculty: false });
        const slots = toFlatSlotList(generated);

        const cs351 = slots.filter(s => s.subjectCode === 'CS-351');
        const cs352 = slots.filter(s => s.subjectCode === 'CS-352');
        const cs353 = slots.filter(s => s.subjectCode === 'CS-353');

        assert(cs351.length > 0 && cs352.length > 0 && cs353.length > 0, 'CASE B: All 3 DE subjects must be scheduled');

        // Verify all 3 occur at the exact same time
        for (const s1 of cs351) {
            const m2 = cs352.find(s => s.section === s1.section && s.day === s1.day && s.start === s1.start);
            const m3 = cs353.find(s => s.section === s1.section && s.day === s1.day && s.start === s1.start);
            assert(m2 && m3, 'CASE B: All 3 classes must occur at the same time');
            const rooms = new Set([s1.room, m2.room, m3.room]);
            assert.strictEqual(rooms.size, 3, 'CASE B: All 3 simultaneous DE classes must be in distinct rooms');
        }

        const groups = new Set([...cs351.map(s => s.group), ...cs352.map(s => s.group), ...cs353.map(s => s.group)]);
        assert(groups.has('DE-1') && groups.has('DE-2') && groups.has('DE-3'), 'CASE B: Groups must be DE-1, DE-2, DE-3');
    } finally {
        if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
    }
});

// 6. Verify 6th Semester & 8th Semester Schedule Generation
test('Requirement 3, 4: Generate schedules for 6th and 8th semester sections', () => {
    const sections = generateBaseTimetable(subjectsPath, roomsPath, s => s.semester === '6th Semester' || s.semester === '8th Semester');
    const slots = toFlatSlotList(sections);
    assert(slots.some(s => s.semester === '6th Semester'), '6th semester slots must be generated');
    assert(slots.some(s => s.semester === '8th Semester'), '8th semester slots must be generated');
});

// 7. Verify M.Tech Schedule Generation
test('Requirement 2: Generate schedules for M.Tech sections MT1 and MA1', () => {
    const sections = generateBaseTimetable(subjectsPath, roomsPath, s => s.year.includes('M.Tech'), { includeMTech: true });
    const slots = toFlatSlotList(sections);
    const mt1 = slots.filter(s => s.section === 'MT1');
    const ma1 = slots.filter(s => s.section === 'MA1');
    assert(mt1.length > 0, 'MT1 timetable must be generated');
    assert(ma1.length > 0, 'MA1 timetable must be generated');
    assert(mt1.some(s => s.isLab && s.room === 'B1'), 'MT1 lab CS-614 must use Lab B1');
    assert(ma1.some(s => s.isLab && s.room === 'B2'), 'MA1 lab CS-634 must use Lab B2');
});

console.log('---------------------------------------------------------------');
if (allPassed) {
    console.log('\x1b[32mALL FINAL REQUIREMENTS AND ELECTIVE TESTS PASSED SUCCESSFULLY!\x1b[0m\n');
    process.exit(0);
} else {
    console.error('\x1b[31mSOME TESTS FAILED!\x1b[0m\n');
    process.exit(1);
}

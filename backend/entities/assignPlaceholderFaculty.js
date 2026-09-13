/*
 * Authoritative Faculty Allocator
 * Maps courses to authoritative faculty from official Excel roster.
 * Avoids any placeholder strings ('Faculty A..O').
 */

const { FACULTY_LIST, getAvailableFaculty, assignFaculty } = require('./facultyAllocation.js');

// Authoritative mappings from official Excel for Odd Semester
const OFFICIAL_ALLOCATIONS = {
    'CS2_3rd Semester': {
        'MA-219': 'CF-VI',
        'CS-212': 'RK',
        'CS-213': 'MN',
        'CS-214': 'NG',
        'CS-215': 'PSH',
        'EC-219': 'AMK',
        'CS-217': 'RK',
        'CS-218': 'NG',
        'CS-219': 'NC'
    },
    'CD2_3rd Semester': {
        'MA-219': 'CF-VI',
        'CS-212': 'RPS',
        'CS-213': 'PK',
        'CS-214': 'JS',
        'CS-215': 'PVE',
        'EC-219': 'CF-II',
        'CS-217': 'PK',
        'CS-218': 'JS',
        'CS-219': 'PS'
    },
    'CS3_5th Semester': {
        'CS-311': 'AKM',
        'CS-312': 'AKY',
        'CS-313': 'MM',
        'CS-314': 'SS',
        'CS-301': 'KK',
        'CS-351': 'DPM',
        'CS-352': 'PRA',
        'CS-315': 'AKY',
        'CS-316': 'MM'
    },
    'CD3_5th Semester': {
        'CS-311': 'AKM',
        'CS-312': 'AKY',
        'CS-313': 'VID',
        'CS-314': 'MM',
        'CS-301': 'KK',
        'CS-351': 'DPM',
        'CS-352': 'PRA',
        'CS-315': 'SS',
        'CS-316': 'KD'
    },
    'CS4_7th Semester': {
        'CS-411': 'TW',
        'CS-412': 'PK',
        'CS-413': 'PSH',
        'CS-431': 'GF13',
        'CS-433': 'APU',
        'CS-451': 'GF12',
        'CS-452': 'MKP',
        'CS-471': 'TW',
        'CS-472': 'SB',
        'CS-414': 'AKM',
        'CS-415': 'PSH'
    },
    'CD4_7th Semester': {
        'CS-411': 'PR',
        'CS-412': 'RSB',
        'CS-611': 'RK',
        'CS-633': 'GF12',
        'CS-736': 'PS',
        'CS-747': 'KD',
        'CS-415': 'PR'
    },
    'CD5_9th Semester': {
        'CS-611': 'NC'
    }
};

function assignPlaceholders(sections, facultyRoster = FACULTY_LIST) {
    let facIndex = 0;
    const getNextFaculty = (available) => {
        if (available.length === 0) return null;
        const fac = available[facIndex % available.length];
        facIndex++;
        return fac.code || fac;
    };

    // Track cohort-level elective assignments to ensure paired sections receive identical assignments
    const cohortElectiveAssignments = new Map();

    for (const section of sections) {
        const secKey = `${section.name}_${section.semester}`;
        const cKey = `${section.year}_${section.semester}`;
        const officialMap = OFFICIAL_ALLOCATIONS[secKey] || {};

        // 1. Subjects
        const subjectCodes = [...new Set((section.subjects || []).map(s => s.code))];
        for (const code of subjectCodes) {
            const authoritativeFac = officialMap[code];
            if (authoritativeFac) {
                assignFaculty(section, code, 'subject', authoritativeFac);
            } else {
                const available = getAvailableFaculty(facultyRoster, section, 'subject');
                const picked = getNextFaculty(available);
                if (picked) assignFaculty(section, code, 'subject', picked);
            }
        }

        // 2. Labs
        const labCodes = [...new Set((section.labs || []).map(l => l.code))];
        for (const code of labCodes) {
            const authoritativeFac = officialMap[code];
            if (authoritativeFac) {
                assignFaculty(section, code, 'lab', authoritativeFac);
            } else {
                const available = getAvailableFaculty(facultyRoster, section, 'lab');
                const picked = getNextFaculty(available);
                if (picked) assignFaculty(section, code, 'lab', picked);
            }
        }

        // 3. Electives: Synchronize at cohort level across paired sections
        const electiveCodes = [...new Set((section.electives || []).map(e => e.code))];
        for (const code of electiveCodes) {
            const authoritativeFac = officialMap[code] || cohortElectiveAssignments.get(`${cKey}_${code}`);
            if (authoritativeFac) {
                assignFaculty(section, code, 'elective', authoritativeFac);
                cohortElectiveAssignments.set(`${cKey}_${code}`, authoritativeFac);
            } else {
                const available = getAvailableFaculty(facultyRoster, section, 'elective');
                const picked = getNextFaculty(available);
                if (picked) {
                    assignFaculty(section, code, 'elective', picked);
                    cohortElectiveAssignments.set(`${cKey}_${code}`, picked);
                }
            }
        }
    }
}

module.exports = { OFFICIAL_ALLOCATIONS, assignPlaceholders };
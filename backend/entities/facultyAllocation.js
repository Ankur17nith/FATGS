const path = require('path');
const fs = require('fs');

const FACULTY_LIST = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/faculty.json'), 'utf8')
);

const CODE_TO_NAME = new Map(FACULTY_LIST.map(f => [f.code, f.name]));
const NAME_TO_CODE = new Map(FACULTY_LIST.map(f => [f.name, f.code]));

function getFacultyName(code) {
    return CODE_TO_NAME.get(code) || code;
}

function getFacultyCode(nameOrCode) {
    return NAME_TO_CODE.get(nameOrCode) || nameOrCode;
}

// type: 'subject' | 'lab' | 'elective'
const getAvailableFaculty = (facultyRoster = FACULTY_LIST, section, type) => {
    let pool = [];
    if (type === 'lab') pool = section.labs || [];
    else if (type === 'elective') pool = section.electives || [];
    else pool = section.subjects || [];

    const alreadyAssigned = new Set(
        pool
            .map(item => item.faculty)
            .filter(Boolean)
    );

    return facultyRoster.filter(f => {
        const code = typeof f === 'string' ? getFacultyCode(f) : f.code;
        return !alreadyAssigned.has(code);
    });
};

const assignFaculty = (section, itemCode, type, facultyIdentifier) => {
    let pool = [];
    if (type === 'lab') pool = section.labs || [];
    else if (type === 'elective') pool = section.electives || [];
    else pool = section.subjects || [];

    const facCode = getFacultyCode(facultyIdentifier);
    const facName = getFacultyName(facCode);

    const alreadyAssigned = pool.some(
        item => item.code !== itemCode && item.faculty === facCode
    );
    if (alreadyAssigned) {
        return {
            ok: false,
            reason: `${facName} (${facCode}) is already teaching a ${type} for section ${section.name}`
        };
    }

    let updated = 0;
    for (const item of pool) {
        if (item.code === itemCode) {
            item.faculty = facCode;
            item.facultyName = facName;
            updated++;
        }
    }

    if (updated === 0) {
        return { ok: false, reason: `No ${type} with code ${itemCode} found in section ${section.name}` };
    }

    return { ok: true, updatedInstances: updated, facultyCode: facCode, facultyName: facName };
};

module.exports = {
    FACULTY_LIST,
    CODE_TO_NAME,
    NAME_TO_CODE,
    getFacultyName,
    getFacultyCode,
    getAvailableFaculty,
    assignFaculty
};
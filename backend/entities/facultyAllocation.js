/*
* This is the assignment-time logic — separate from baseTimetableGenerator.js,
* which handles time-SLOT scheduling collisions.
*
* Rule:
*  - A faculty can teach at most ONE subject (theory) per section.
*  - A faculty can teach at most ONE lab per section.
*  - These two are independent — subjects and labs don't affect each other's
*    faculty availability.
*
* This module answers: "given this section and whether I'm assigning a
* subject or a lab, which faculty from the roster are still valid choices?"
* That's the list a GUI dropdown should be populated with, so an invalid
* faculty never even appears as an option.
*/

// type: 'subject' | 'lab'
const getAvailableFaculty = (facultyRoster, section, type) => {
    const pool = type === 'lab' ? section.labs : section.subjects;

    const alreadyAssigned = new Set(
        pool
            .map(item => item.faculty)
            .filter(Boolean) // drop nulls/undefined — unassigned slots
    );

    return facultyRoster.filter(name => !alreadyAssigned.has(name));
};

// Call this when an assignment is actually made — a safety check behind
// the filtered dropdown (in case of stale data / race conditions).
const assignFaculty = (section, itemCode, type, facultyName) => {
    const pool = type === 'lab' ? section.labs : section.subjects;

    const alreadyAssigned = pool.some(
        item => item.code !== itemCode && item.faculty === facultyName
    );
    if (alreadyAssigned) {
        return {
            ok: false,
            reason: `${facultyName} is already teaching a ${type} for section ${section.name}`
        };
    }

    // subject_parse duplicates a Subject/Lab object once per credit hour, all
    // sharing the same code — so every instance with this code needs updating,
    // not just one.
    let updated = 0;
    for (const item of pool) {
        if (item.code === itemCode) {
            item.faculty = facultyName;
            updated++;
        }
    }

    if (updated === 0) {
        return { ok: false, reason: `No ${type} with code ${itemCode} found in section ${section.name}` };
    }

    return { ok: true, updatedInstances: updated };
};

module.exports = { getAvailableFaculty, assignFaculty };
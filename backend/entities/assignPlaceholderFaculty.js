/*
* Fills in random PLACEHOLDER faculty names for testing / demo purposes,
* until the real GUI-driven "pick year -> section -> subject -> faculty"
* flow is built and real assignments come from there instead.
*
* Reuses getAvailableFaculty/assignFaculty from facultyAllocation.js, so
* the placeholder fill-in respects the exact same "one subject + one lab
* per section" rule real assignments will have to follow.
*/

const { getAvailableFaculty, assignFaculty } = require('./facultyAllocation.js');

const PLACEHOLDER_FACULTY = [
    'Faculty A', 'Faculty B', 'Faculty C', 'Faculty D', 'Faculty E',
    'Faculty F', 'Faculty G', 'Faculty H', 'Faculty I', 'Faculty J',
    'Faculty K', 'Faculty L', 'Faculty M', 'Faculty N', 'Faculty O'
];

function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Mutates the given sections in place, filling section.subjects[].faculty
// and section.labs[].faculty with placeholder names.
function assignPlaceholders(sections, facultyRoster = PLACEHOLDER_FACULTY) {
    for (const section of sections) {
        // dedupe by code first — subject_parse creates one instance per credit
        // hour, all sharing the same code, and we only want to pick/assign once
        const subjectCodes = [...new Set(section.subjects.map(s => s.code))];
        for (const code of subjectCodes) {
            const available = getAvailableFaculty(facultyRoster, section, 'subject');
            if (available.length === 0) {
                console.log(`No placeholder faculty left for subject ${code} in ${section.name} (Y${section.year} S${section.semester})`);
                continue;
            }
            assignFaculty(section, code, 'subject', randomPick(available));
        }

        const labCodes = [...new Set(section.labs.map(l => l.code))];
        for (const code of labCodes) {
            const available = getAvailableFaculty(facultyRoster, section, 'lab');
            if (available.length === 0) {
                console.log(`No placeholder faculty left for lab ${code} in ${section.name} (Y${section.year} S${section.semester})`);
                continue;
            }
            assignFaculty(section, code, 'lab', randomPick(available));
        }
    }
}

module.exports = { PLACEHOLDER_FACULTY, assignPlaceholders };
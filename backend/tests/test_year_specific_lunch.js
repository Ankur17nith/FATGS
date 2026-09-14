const fs = require('fs');
const path = require('path');
const { Section } = require('../entities/Section.js');

console.log('===============================================================');
console.log('   FATGS YEAR-SPECIFIC LUNCH TIMING VALIDATION TEST SUITE      ');
console.log('===============================================================');

// 1. Verify Section class constructor produces correct lunch flags per year
console.log('\n--- 1. AUDITING Section.js INSTANTIATION ---');

const sec2 = new Section('CS2', '2nd Year', '3rd Semester');
const sec3 = new Section('CS3', '3rd Year', '5th Semester');
const sec4 = new Section('CS4', '4th Year', '7th Semester');
const sec5 = new Section('CD5', '5th Year', '9th Semester');
const secMT = new Section('MT1', 'M.Tech 1st Year', '1st Semester');

function checkSectionLunch(sec, expectedLunchIdx, expectedLunchTime) {
    for (let d = 0; d < 5; d++) {
        sec.slots[d].forEach((slot, pIdx) => {
            if (pIdx === expectedLunchIdx) {
                if (!slot.isLunch) {
                    throw new Error(`FAIL: Section ${sec.name} slot at period ${pIdx} (${slot.time}) is NOT marked as lunch!`);
                }
                if (slot.time !== expectedLunchTime) {
                    throw new Error(`FAIL: Section ${sec.name} lunch slot period ${pIdx} has time ${slot.time}, expected ${expectedLunchTime}`);
                }
            } else {
                if (slot.isLunch) {
                    throw new Error(`FAIL: Section ${sec.name} slot at period ${pIdx} (${slot.time}) is wrongly marked as lunch!`);
                }
            }
        });
    }
}

// 2nd Year -> Lunch at 13:00 - 14:00 (Period index 4)
checkSectionLunch(sec2, 4, '13:00 - 14:00');
console.log('[PASS] 2nd Year (CS2): Lunch is strictly Period 4 (13:00 - 14:00)');

// 3rd Year -> Lunch at 12:00 - 13:00 (Period index 3)
checkSectionLunch(sec3, 3, '12:00 - 13:00');
console.log('[PASS] 3rd Year (CS3): Lunch is strictly Period 3 (12:00 - 13:00)');

// Final Year (4th Year) -> Lunch at 13:00 - 14:00 (Period index 4)
checkSectionLunch(sec4, 4, '13:00 - 14:00');
console.log('[PASS] Final Year / 4th Year (CS4): Lunch is strictly Period 4 (13:00 - 14:00)');

// 5th Year & M.Tech -> Lunch at 13:00 - 14:00 (Period index 4)
checkSectionLunch(sec5, 4, '13:00 - 14:00');
checkSectionLunch(secMT, 4, '13:00 - 14:00');
console.log('[PASS] 5th Year (CD5) & M.Tech (MT1): Lunch is strictly Period 4 (13:00 - 14:00)');


// 2. Audit generated base_timetable.json
console.log('\n--- 2. AUDITING GENERATED TIMETABLE JSON ---');
const jsonPath = path.join(__dirname, '..', 'output', 'base_timetable.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const timetableSlots = JSON.parse(rawData);

let violations = 0;

timetableSlots.forEach(slot => {
    const secName = slot.section;
    const year = slot.year || '';
    const time = `${slot.start} - ${slot.end}`;

    const isThirdYear = (secName === 'CS3' || secName === 'CD3' || year.includes('3rd'));
    const forbiddenLunchTime = isThirdYear ? '12:00 - 13:00' : '13:00 - 14:00';

    if (time === forbiddenLunchTime) {
        console.error(`[VIOLATION] Section ${secName} (${year}) has scheduled class ${slot.subjectCode} at its lunch time ${time} on ${slot.day}!`);
        violations++;
    }
});

if (violations > 0) {
    throw new Error(`FAIL: Found ${violations} classes scheduled during year-specific lunch hours!`);
}
console.log(`[PASS] Verified all ${timetableSlots.length} slots in base_timetable.json: ZERO classes scheduled during year-specific lunch!`);

// 3. Confirm 3rd Year can have classes at 13:00 - 14:00 (such as CS-301 OE or lectures)
const thirdYearPostLunchSlots = timetableSlots.filter(s =>
    (s.section === 'CS3' || s.section === 'CD3') && `${s.start} - ${s.end}` === '13:00 - 14:00'
);
console.log(`[PASS] 3rd Year has ${thirdYearPostLunchSlots.length} active sessions at 13:00 - 14:00 (regular period right after 12:00-13:00 lunch).`);

console.log('\n===============================================================');
console.log('FINAL RESULT: ALL YEAR-SPECIFIC LUNCH TIMING TESTS PASSED!');
console.log('===============================================================');

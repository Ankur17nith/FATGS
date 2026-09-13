/*
 * Base Timetable Generator (FATGS)
 * --------------------------------
 * Generates mathematically and academically conflict-free schedules
 * according to authoritative NIT Hamirpur CSE Department data and constraints.
 *
 * Constraints & Rules:
 *  - Monday to Friday only (NO Saturday).
 *  - 4 Shared Theory Rooms for CS2, CD2, CS3, CD3, CS4, CD4 (configurable).
 *  - CD5 uses CSE-III room.
 *  - Lab rooms: P1..P6, B1, B2 (configured as Lab).
 *  - Year-specific lunch: 2nd Year (12:00-13:00), 3rd/4th/5th Year (13:00-14:00).
 *  - Labs: Contiguous 2-hour practicals (P=2).
 *    Priority 1: G1 and G2 scheduled at SAME TIME in different lab rooms.
 *    Priority 2: Different-time fallback.
 *  - Open Elective (OE): Synchronized preferred slot 13:00-14:00 (Mon, Tue, Wed).
 *  - Discipline Elective (DE): Merged G1+G2 cohort, split across offered DE subjects,
 *    synchronized at the same slot, preferred after lunch.
 *  - SA-201: Reserved empty slot for 4th semester CS2/CD2.
 *  - No same subject code twice on the same day for any section.
 *  - No placeholder faculty ("Faculty A..O") in final timetable.
 *  - Theory subjects must remain THEORY (no G1/G2 labels).
 */

const fs = require('fs');
const path = require('path');
const funcs = require('./functions.js');
const { FACULTY_LIST, getFacultyCode } = require('./facultyAllocation.js');
const { assignPlaceholders } = require('./assignPlaceholderFaculty.js');

const CANDIDATE_THEORY_ROOMS = [
    'B1', 'B2', 'B3', 'B4',
    'G1', 'G2', 'G3', 'G4', 'G5', 'G6',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
    'S1', 'S2', 'S3', 'S4', 'S5', 'S6'
];

const DEFAULT_THEORY_ROOMS = ['B4', 'F4', 'G5', 'S2'];
const ALL_LAB_ROOMS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'B1', 'B2'];
const DAYS_COUNT = 5; // Monday to Friday

function slotKey(day, period) {
    return `${day}_${period}`;
}

// Resource Tracker for conflict prevention
function createTracker() {
    return new Map(); // id -> Set("day_period")
}

function isFree(tracker, id, day, period) {
    if (!id) return true;
    const booked = tracker.get(id);
    return !booked || !booked.has(slotKey(day, period));
}

function book(tracker, id, day, period) {
    if (!id) return;
    if (!tracker.has(id)) tracker.set(id, new Set());
    tracker.get(id).add(slotKey(day, period));
}

function unbook(tracker, id, day, period) {
    if (!id || !tracker.has(id)) return;
    tracker.get(id).delete(slotKey(day, period));
}

// Returns available 2-hour contiguous blocks for a section avoiding lunch
function getAvailableLabBlocks(section) {
    const isThirdYear = section.name === 'CS3' || section.name === 'CD3' || (section.year && section.year.includes('3rd'));
    // 8 periods: 0: 9-10, 1: 10-11, 2: 11-12, 3: 12-1 (3rd yr lunch), 4: 1-2 (2nd & final yr lunch), 5: 2-3, 6: 3-4, 7: 4-5
    if (isThirdYear) {
        return [[0, 1], [1, 2], [4, 5], [5, 6], [6, 7]];
    } else {
        return [[0, 1], [1, 2], [2, 3], [5, 6], [6, 7]];
    }
}

// -------------------------------------------------------------
// 1. PLACE LABS (Priority 1: Simultaneous G1 & G2, Priority 2: Fallback)
// -------------------------------------------------------------
function placeLabs(sections, labRooms, facultyBookings, roomBookings) {
    for (const section of sections) {
        if (!section.labs || section.labs.length === 0) continue;

        const labBlocks = getAvailableLabBlocks(section);

        const isMTech = section.year && section.year.includes('M.Tech');

        // Build group task items for G1 and G2 (M.Tech is single cohort)
        const g1Tasks = section.labs.map(l => ({
            code: l.code,
            name: l.name,
            group: isMTech ? null : 'G1',
            faculty: l.faculty,
            preferredRoom: l.preferredRoom || null,
            duration: 2
        }));

        const g2Tasks = isMTech ? [] : section.labs.map(l => ({
            code: l.code,
            name: l.name,
            group: 'G2',
            faculty: l.faculty,
            preferredRoom: l.preferredRoom || null,
            duration: 2
        }));

        // Shuffle tasks to balance placements
        const unplacedG1 = [...g1Tasks].sort(() => Math.random() - 0.5);
        const unplacedG2 = [...g2Tasks].sort(() => Math.random() - 0.5);

        const isThirdYear = section.name === 'CS3' || section.name === 'CD3' || (section.year && section.year.includes('3rd'));
        const preLunchLimit = isThirdYear ? 3 : 4;

        // PRIORITY 1: Try to pair unplaced G1 and G2 at the SAME TIME
        for (let i = unplacedG1.length - 1; i >= 0; i--) {
            const task1 = unplacedG1[i];
            let paired = false;

            for (let j = unplacedG2.length - 1; j >= 0; j--) {
                const task2 = unplacedG2[j];

                // Attempt all days & blocks for simultaneous scheduling (prioritize morning blocks)
                const comboAttempts = [];
                for (let d = 0; d < DAYS_COUNT; d++) {
                    for (let b = 0; b < labBlocks.length; b++) {
                        comboAttempts.push({ day: d, block: labBlocks[b] });
                    }
                }
                comboAttempts.sort((a, b) => {
                    const isPreA = a.block[1] < preLunchLimit;
                    const isPreB = b.block[1] < preLunchLimit;
                    if (isPreA && !isPreB) return -1;
                    if (!isPreA && isPreB) return 1;
                    return Math.random() - 0.5;
                });

                for (const { day, block } of comboAttempts) {
                    const [p1, p2] = block;
                    const slotA = section.slots[day][p1];
                    const slotB = section.slots[day][p2];

                    if (slotA.isLunch || slotB.isLunch) continue;
                    if (slotA.booked && slotA.entries && slotA.entries.some(e => !e.isLab)) continue;
                    if (slotB.booked && slotB.entries && slotB.entries.some(e => !e.isLab)) continue;

                    // Group slot availability
                    const g1Busy = (slotA.entries && slotA.entries.some(e => e.group === 'G1')) ||
                                   (slotB.entries && slotB.entries.some(e => e.group === 'G1'));
                    const g2Busy = (slotA.entries && slotA.entries.some(e => e.group === 'G2')) ||
                                   (slotB.entries && slotB.entries.some(e => e.group === 'G2'));
                    if (g1Busy || g2Busy) continue;

                    // Faculty availability
                    if (task1.faculty && (!isFree(facultyBookings, task1.faculty, day, p1) || !isFree(facultyBookings, task1.faculty, day, p2))) continue;
                    if (task2.faculty && (!isFree(facultyBookings, task2.faculty, day, p1) || !isFree(facultyBookings, task2.faculty, day, p2))) continue;

                    if (task1.faculty && task2.faculty && task1.faculty === task2.faculty) continue; // Same faculty cannot teach both groups at once

                    // Room availability: Find 2 distinct free lab rooms
                    const freeRooms = labRooms.filter(r =>
                        isFree(roomBookings, r.roomno, day, p1) &&
                        isFree(roomBookings, r.roomno, day, p2)
                    );
                    if (freeRooms.length < 2) continue;

                    const room1 = freeRooms[0].roomno;
                    const room2 = freeRooms[1].roomno;

                    // Book G1 & G2 simultaneously
                    const sessionId = `${section.name}_${task1.code}_${task2.code}_${day}_${p1}`;

                    const bookingG1 = {
                        subject: task1.code,
                        faculty: task1.faculty,
                        facultyCode: task1.faculty,
                        room: room1,
                        isLab: true,
                        duration: 2,
                        group: 'G1',
                        sessionId: sessionId,
                        electiveType: null
                    };

                    const bookingG2 = {
                        subject: task2.code,
                        faculty: task2.faculty,
                        facultyCode: task2.faculty,
                        room: room2,
                        isLab: true,
                        duration: 2,
                        group: 'G2',
                        sessionId: sessionId,
                        electiveType: null
                    };

                    for (const slot of [slotA, slotB]) {
                        slot.booked = true;
                        if (!slot.entries) slot.entries = [];
                        slot.entries.push(bookingG1, bookingG2);
                    }

                    book(facultyBookings, task1.faculty, day, p1);
                    book(facultyBookings, task1.faculty, day, p2);
                    book(facultyBookings, task2.faculty, day, p1);
                    book(facultyBookings, task2.faculty, day, p2);

                    book(roomBookings, room1, day, p1);
                    book(roomBookings, room1, day, p2);
                    book(roomBookings, room2, day, p1);
                    book(roomBookings, room2, day, p2);

                    unplacedG1.splice(i, 1);
                    unplacedG2.splice(j, 1);
                    paired = true;
                    break;
                }
                if (paired) break;
            }
        }

        // PRIORITY 2: Fallback to schedule remaining G1 / G2 tasks at different valid times
        const remainingTasks = [...unplacedG1, ...unplacedG2];
        for (const task of remainingTasks) {
            const comboAttempts = [];
            for (let d = 0; d < DAYS_COUNT; d++) {
                for (let b = 0; b < labBlocks.length; b++) {
                    comboAttempts.push({ day: d, block: labBlocks[b] });
                }
            }
            comboAttempts.sort((a, b) => {
                const isPreA = a.block[1] < preLunchLimit;
                const isPreB = b.block[1] < preLunchLimit;
                if (isPreA && !isPreB) return -1;
                if (!isPreA && isPreB) return 1;
                return Math.random() - 0.5;
            });

            for (const { day, block } of comboAttempts) {
                const [p1, p2] = block;
                const slotA = section.slots[day][p1];
                const slotB = section.slots[day][p2];

                if (slotA.isLunch || slotB.isLunch) continue;
                if (slotA.booked && slotA.entries && slotA.entries.some(e => !e.isLab)) continue;
                if (slotB.booked && slotB.entries && slotB.entries.some(e => !e.isLab)) continue;

                const groupBusy = (slotA.entries && slotA.entries.some(e => e.group === task.group)) ||
                                  (slotB.entries && slotB.entries.some(e => e.group === task.group));
                if (groupBusy) continue;

                if (task.faculty && (!isFree(facultyBookings, task.faculty, day, p1) || !isFree(facultyBookings, task.faculty, day, p2))) continue;

                let candidateLabRooms = labRooms;
                if (task.preferredRoom) {
                    const pref = labRooms.find(r => r.roomno === task.preferredRoom);
                    if (pref) candidateLabRooms = [pref, ...labRooms.filter(r => r.roomno !== task.preferredRoom)];
                }

                const freeRoom = candidateLabRooms.find(r =>
                    isFree(roomBookings, r.roomno, day, p1) &&
                    isFree(roomBookings, r.roomno, day, p2)
                );
                if (!freeRoom) continue;

                const sessionId = `${section.name}_${task.code}_${task.group}_${day}_${p1}`;
                const booking = {
                    subject: task.code,
                    faculty: task.faculty,
                    facultyCode: task.faculty,
                    room: freeRoom.roomno,
                    isLab: true,
                    duration: 2,
                    group: task.group,
                    sessionId: sessionId,
                    electiveType: null
                };

                for (const slot of [slotA, slotB]) {
                    slot.booked = true;
                    if (!slot.entries) slot.entries = [];
                    slot.entries.push(booking);
                }

                book(facultyBookings, task.faculty, day, p1);
                book(facultyBookings, task.faculty, day, p2);
                book(roomBookings, freeRoom.roomno, day, p1);
                book(roomBookings, freeRoom.roomno, day, p2);
                break;
            }
        }
    }
}

// -------------------------------------------------------------
// 2. PLACE OPEN ELECTIVES (OE) — Synchronized slot 13:00 - 14:00 (Mon, Tue, Wed)
// -------------------------------------------------------------
function placeOpenElectives(sections, classRooms, facultyBookings, roomBookings) {
    const oeSections = sections.filter(s =>
        s.electives && s.electives.some(e =>
            (e.basket === 'Open Elective' || e.electiveType === 'OE' || e.code.startsWith('CS-30')) && e.faculty
        )
    );
    if (oeSections.length === 0) return;

    // Collect all offered OE subjects
    const offeredOESubjects = [];
    oeSections.forEach(sec => {
        (sec.electives || []).forEach(e => {
            if ((e.basket === 'Open Elective' || e.electiveType === 'OE' || e.code.startsWith('CS-30')) && e.faculty) {
                if (!offeredOESubjects.some(o => o.code === e.code)) {
                    offeredOESubjects.push(e);
                }
            }
        });
    });

    if (offeredOESubjects.length === 0) return;

    // Determine the required number of timetable periods from authoritative course data
    const oePeriodsNeeded = Math.max(
        ...offeredOESubjects.map(oe => (oe.L !== undefined ? (oe.L + (oe.T || 0)) : (oe.credits || 3)))
    );

    // OE fixed candidate slots: Monday through Friday at 13:00 - 14:00 (period 4)
    const FIXED_OE_SLOTS = [
        { day: 0, period: 4 }, // Monday 13:00 - 14:00
        { day: 1, period: 4 }, // Tuesday 13:00 - 14:00
        { day: 2, period: 4 }, // Wednesday 13:00 - 14:00
        { day: 3, period: 4 }, // Thursday 13:00 - 14:00
        { day: 4, period: 4 }  // Friday 13:00 - 14:00
    ];

    let placedOECount = 0;
    for (const { day, period } of FIXED_OE_SLOTS) {
        if (placedOECount >= oePeriodsNeeded) break;

        const freeRooms = classRooms.filter(r => isFree(roomBookings, r.roomno, day, period));
        if (freeRooms.length < offeredOESubjects.length) continue;

        // Check faculties are free
        const allFacsFree = offeredOESubjects.every(o => isFree(facultyBookings, o.faculty, day, period));
        if (!allFacsFree) continue;

        const oeBookings = offeredOESubjects.map((oe, idx) => {
            const room = freeRooms[idx].roomno;
            book(facultyBookings, oe.faculty, day, period);
            book(roomBookings, room, day, period);
            return {
                subject: oe.code,
                faculty: oe.faculty,
                facultyCode: oe.faculty,
                room: room,
                isLab: false,
                duration: 1,
                group: offeredOESubjects.length > 1 ? `Choice ${idx + 1}` : null,
                sessionId: `OE_${oe.code}_${day}_${period}`,
                electiveType: 'OE',
                basket: 'Open Elective'
            };
        });

        oeSections.forEach(sec => {
            const slot = sec.slots[day][period];
            slot.booked = true;
            slot.isLunch = false; // Synchronized elective activity replaces default lunch on those days
            if (!slot.entries) slot.entries = [];
            slot.entries.push(...oeBookings);
        });

        placedOECount++;
    }
}

// -------------------------------------------------------------
// 3. PLACE DISCIPLINE ELECTIVES (DE) — Common Slot Preferred If Feasible, Flexible Otherwise
// -------------------------------------------------------------
function placeDisciplineElectives(sections, classRooms, facultyBookings, roomBookings) {
    // Group sections by cohort key: year + semester
    const cohortGroups = new Map();
    for (const sec of sections) {
        const cKey = `${sec.year}_${sec.semester}`;
        if (!cohortGroups.has(cKey)) {
            cohortGroups.set(cKey, { year: sec.year, semester: sec.semester, sections: [], electives: [] });
        }
        cohortGroups.get(cKey).sections.push(sec);
        (sec.electives || []).forEach(e => {
            if (e.basket === 'Open Elective' || e.electiveType === 'OE' || e.code.startsWith('CS-30')) return;
            if (!cohortGroups.get(cKey).electives.some(x => x.code === e.code)) {
                cohortGroups.get(cKey).electives.push(e);
            }
        });
    }

    cohortGroups.forEach(({ year, semester, sections: secGroup, electives }, cKey) => {
        if (electives.length === 0) return;

        // Group electives by basket
        const basketMap = new Map();
        electives.forEach(e => {
            const bName = e.basket || 'Discipline Elective';
            if (!basketMap.has(bName)) basketMap.set(bName, []);
            basketMap.get(bName).push(e);
        });

        const isThirdYear = year && year.includes('3rd');
        // Preference: After lunch first, but allow morning if needed
        // 3rd Year: lunch 12:00-13:00 (period 3), after-lunch periods are 4, 5, 6, 7 (13:00-17:00)
        // 2nd Year & Final Year: lunch 13:00-14:00 (period 4), after-lunch periods are 5, 6, 7 (14:00-17:00)
        const preferredPeriods = isThirdYear ? [4, 5, 6, 7, 0, 1, 2] : [5, 6, 7, 0, 1, 2, 3];

        basketMap.forEach((basketSubjects, bName) => {
            // ONLY schedule OFFERED subjects (assigned faculty)
            const offered = basketSubjects.filter(s => s.faculty);
            if (offered.length === 0) return; // Unassigned electives are NOT scheduled!

            // Determine periods needed from course data
            const dePeriodsNeeded = Math.max(
                ...offered.map(de => (de.L !== undefined ? (de.L + (de.T || 0)) : (de.credits || 3)))
            );
            let placedCount = 0;
            const days = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);

            // Phase 1: Try common synchronized slot across paired cohort sections
            for (const day of days) {
                if (placedCount >= dePeriodsNeeded) break;

                for (const p of preferredPeriods) {
                    // Check all sections in this cohort have (day, p) free
                    const allSecsFree = secGroup.every(sec => {
                        const slot = sec.slots[day][p];
                        return !slot.booked && !slot.isLunch;
                    });
                    if (!allSecsFree) continue;

                    // Check all offered DE faculties are free
                    const allFacsFree = offered.every(de =>
                        !de.faculty || isFree(facultyBookings, de.faculty, day, p)
                    );
                    if (!allFacsFree) continue;

                    // Check distinct classrooms are available for all offered DE subjects
                    const freeRooms = classRooms.filter(r => isFree(roomBookings, r.roomno, day, p));
                    if (freeRooms.length < offered.length) continue;

                    // Book all offered DE subjects simultaneously
                    const sessionId = `ELECTIVE_${bName.replace(/\s+/g, '_')}_${day}_${p}`;

                    const deBookings = offered.map((de, idx) => {
                        const room = freeRooms[idx].roomno;
                        book(facultyBookings, de.faculty, day, p);
                        book(roomBookings, room, day, p);

                        const typeStr = de.type || de.electiveType || (bName.includes('Stream Core') ? 'SC' : (bName.includes('Stream Elective') ? 'SE' : 'DE'));

                        return {
                            subject: de.code,
                            faculty: de.faculty,
                            facultyCode: de.faculty,
                            room: room,
                            isLab: false,
                            duration: 1,
                            group: offered.length > 1 ? (bName.includes('Discipline') ? `DE-${idx + 1}` : `Choice ${idx + 1}`) : null,
                            sessionId: sessionId,
                            electiveType: typeStr,
                            basket: bName
                        };
                    });

                    secGroup.forEach(sec => {
                        const slot = sec.slots[day][p];
                        slot.booked = true;
                        if (!slot.entries) slot.entries = [];
                        slot.entries.push(...deBookings);
                    });

                    placedCount++;
                    break;
                }
            }

            // Phase 2: If common cohort placement could not place all needed periods, fallback flexibly per section
            if (placedCount < dePeriodsNeeded) {
                secGroup.forEach(sec => {
                    const existingCount = sec.slots.flat().filter(sl => sl.booked && sl.entries && sl.entries.some(e => e.basket === bName)).length;
                    let secPlaced = existingCount;
                    for (const day of [0, 1, 2, 3, 4]) {
                        if (secPlaced >= dePeriodsNeeded) break;
                        for (const p of preferredPeriods) {
                            const slot = sec.slots[day][p];
                            if (slot.booked || slot.isLunch) continue;

                            const allFacsFree = offered.every(de => !de.faculty || isFree(facultyBookings, de.faculty, day, p));
                            if (!allFacsFree) continue;

                            const freeRooms = classRooms.filter(r => isFree(roomBookings, r.roomno, day, p));
                            if (freeRooms.length < offered.length) continue;

                            const sessionId = `ELECTIVE_${bName.replace(/\s+/g, '_')}_${sec.name}_${day}_${p}`;
                            const deBookings = offered.map((de, idx) => {
                                const room = freeRooms[idx].roomno;
                                book(facultyBookings, de.faculty, day, p);
                                book(roomBookings, room, day, p);
                                return {
                                    subject: de.code,
                                    faculty: de.faculty,
                                    facultyCode: de.faculty,
                                    room: room,
                                    isLab: false,
                                    duration: 1,
                                    group: offered.length > 1 ? (bName.includes('Discipline') ? `DE-${idx + 1}` : `Choice ${idx + 1}`) : null,
                                    sessionId: sessionId,
                                    electiveType: de.type || de.electiveType || (bName.includes('Stream Core') ? 'SC' : (bName.includes('Stream Elective') ? 'SE' : 'DE')),
                                    basket: bName
                                };
                            });

                            slot.booked = true;
                            if (!slot.entries) slot.entries = [];
                            slot.entries.push(...deBookings);
                            secPlaced++;
                            break;
                        }
                    }
                });
            }
        });
    });
}

// -------------------------------------------------------------
// 4. PLACE SA-201 SPECIAL RULE (Reserved Empty Slot for CS2/CD2 4th Sem)
// -------------------------------------------------------------
function placeSA201(sections) {
    const targetSections = sections.filter(s =>
        (s.name === 'CS2' || s.name === 'CD2') && s.semester && s.semester.includes('4th')
    );
    if (targetSections.length === 0) return;

    // Find an open 2-period slot for both sections (e.g. Friday 15:00-17:00 or open block)
    const candidateBlocks = [[5, 6], [6, 7], [0, 1]];
    const candidateDays = [4, 3, 2, 1, 0]; // Prefer Friday

    let placed = false;
    for (const day of candidateDays) {
        for (const [p1, p2] of candidateBlocks) {
            const allFree = targetSections.every(sec => {
                const s1 = sec.slots[day][p1];
                const s2 = sec.slots[day][p2];
                return !s1.booked && !s2.booked && !s1.isLunch && !s2.isLunch;
            });
            if (!allFree) continue;

            for (const sec of targetSections) {
                for (const p of [p1, p2]) {
                    const slot = sec.slots[day][p];
                    slot.booked = true;
                    if (!slot.entries) slot.entries = [];
                    slot.entries.push({
                        subject: 'SA-201',
                        faculty: null,
                        facultyCode: null,
                        room: null,
                        isLab: false,
                        duration: 2,
                        group: null,
                        sessionId: `SA201_${day}_${p1}`,
                        electiveType: 'Activity',
                        isReservedEmpty: true
                    });
                }
            }
            placed = true;
            break;
        }
        if (placed) break;
    }
}

// -------------------------------------------------------------
// 5. PLACE NORMAL THEORY SUBJECTS (Section-wide, No G1/G2, Shared 4 Rooms)
// -------------------------------------------------------------
function getRoomStabilityScore(section, day, p, dur, roomNo, candidateRooms, roomBookings) {
    let score = 0;

    // 1. Immediate previous consecutive period (p - 1): Absolute Top Soft Priority (+2000)
    if (p > 0) {
        const prevSlot = section.slots[day][p - 1];
        if (prevSlot && prevSlot.booked && prevSlot.entries && prevSlot.entries.length > 0) {
            const prevRoom = prevSlot.entries[0].room;
            if (prevRoom === roomNo) {
                score += 2000;
            }
        }
    }

    // 2. Immediate next consecutive period (p + dur): High Priority (+1000)
    if (p + dur < 8) {
        const nextSlot = section.slots[day][p + dur];
        if (nextSlot && nextSlot.booked && nextSlot.entries && nextSlot.entries.length > 0) {
            const nextRoom = nextSlot.entries[0].room;
            if (nextRoom === roomNo) {
                score += 1000;
            }
        }
    }

    // 3. Pre-lunch / post-lunch continuity (+500 / +400)
    if (p > 1 && section.slots[day][p - 1].isLunch) {
        const preLunchSlot = section.slots[day][p - 2];
        if (preLunchSlot && preLunchSlot.booked && preLunchSlot.entries && preLunchSlot.entries.length > 0) {
            if (preLunchSlot.entries[0].room === roomNo) {
                score += 500;
            }
        }
    }
    if (p + dur < 7 && section.slots[day][p + dur].isLunch) {
        const postLunchSlot = section.slots[day][p + dur + 1];
        if (postLunchSlot && postLunchSlot.booked && postLunchSlot.entries && postLunchSlot.entries.length > 0) {
            if (postLunchSlot.entries[0].room === roomNo) {
                score += 400;
            }
        }
    }

    // 4. Same day room affinity: prefer rooms already used by this section on this day (+200 per class)
    for (let k = 0; k < 8; k++) {
        if (k >= p && k < p + dur) continue;
        const s = section.slots[day][k];
        if (s && s.booked && s.entries) {
            if (s.entries.some(e => e.room === roomNo)) {
                score += 200;
            }
        }
    }

    // 5. Prefer longer continuous room runs: forward lookahead (+80 per consecutive free slot)
    let runLength = 0;
    for (let k = p + dur; k < 8; k++) {
        const s = section.slots[day][k];
        if (s && !s.booked && !s.isLunch && isFree(roomBookings, roomNo, day, k)) {
            runLength++;
        } else {
            break;
        }
    }
    score += runLength * 80;

    // 6. Section's preferred base classroom (+50)
    if (section.preferredRoom && roomNo === section.preferredRoom) {
        score += 50;
    }

    return score;
}

function placeTheorySubjects(sections, classRooms, facultyBookings, roomBookings, selectedTheoryRooms = DEFAULT_THEORY_ROOMS) {
    const defaultPreferred = {
        'CS2': selectedTheoryRooms[0] || 'B4',
        'CD2': selectedTheoryRooms[1] || 'F4',
        'CS3': selectedTheoryRooms[2 % selectedTheoryRooms.length] || 'G5',
        'CD3': selectedTheoryRooms[3 % selectedTheoryRooms.length] || 'S2',
        'CS4': selectedTheoryRooms[0] || 'B4',
        'CD4': selectedTheoryRooms[1] || 'F4',
        'CD5': 'CSE-III',
        'MT1': 'Seminar Hall - Block A',
        'MA1': 'Conference Hall - Block B'
    };

    for (const section of sections) {
        section.preferredRoom = defaultPreferred[section.name] || selectedTheoryRooms[0];

        const isCD5 = section.name === 'CD5';
        const isCD4 = section.name === 'CD4';
        const isMTechCSE = section.name === 'MT1';
        const isMTechAI = section.name === 'MA1';

        // Dedicated department room for CD5 and CD4 and M.Tech when applicable
        let allowedRooms = classRooms;
        if (isCD5) {
            allowedRooms = classRooms.filter(r => r.roomno === 'CSE-III');
        } else if (isMTechCSE) {
            allowedRooms = classRooms.filter(r => r.roomno === 'Seminar Hall - Block A').concat(classRooms);
        } else if (isMTechAI) {
            allowedRooms = classRooms.filter(r => r.roomno === 'Conference Hall - Block B').concat(classRooms);
        } else if (isCD4) {
            allowedRooms = classRooms.filter(r => r.roomno === 'CSE-III').concat(classRooms);
        } else {
            allowedRooms = classRooms.filter(r => r.roomno !== 'CSE-III');
        }

        const isThirdYear = section.name === 'CS3' || section.name === 'CD3' || (section.year && section.year.includes('3rd'));
        const preLunchLimit = isThirdYear ? 3 : 4;

        // Pool of theory items (already expanded by L+T periods in functions.js), skipping nonScheduled
        const subjectsPool = [...section.subjects].filter(s => !s.isNonScheduled).sort(() => Math.random() - 0.5);

        for (const subject of subjectsPool) {
            let placed = false;
            const dur = subject.duration || 1;

            // Load balancing across 5 weekdays
            const balancedDays = Array.from({ length: DAYS_COUNT }, (_, d) => d)
                .sort((a, b) => {
                    const countA = section.slots[a].filter(s => s.booked).length;
                    const countB = section.slots[b].filter(s => s.booked).length;
                    return countA - countB;
                });

            // CASE 1: Multi-period continuous lecture session (duration >= 2)
            if (dur >= 2) {
                for (const day of balancedDays) {
                    const alreadyToday = section.slots[day].some(s =>
                        s.booked && s.entries && s.entries.some(e => e.subject === subject.code)
                    );
                    if (alreadyToday) continue;

                    // Check all possible starting periods p, prioritizing pre-lunch blocks
                    const candidateStarts = Array.from({ length: 8 - dur + 1 }, (_, i) => i).sort((a, b) => {
                        const isPreA = (a + dur <= preLunchLimit);
                        const isPreB = (b + dur <= preLunchLimit);
                        if (isPreA && !isPreB) return -1;
                        if (!isPreA && isPreB) return 1;
                        return a - b;
                    });

                    for (const p of candidateStarts) {
                        let validBlock = true;
                        for (let k = p; k < p + dur; k++) {
                            const slot = section.slots[day][k];
                            if (slot.booked || slot.isLunch) { validBlock = false; break; }
                            if (subject.faculty && !isFree(facultyBookings, subject.faculty, day, k)) { validBlock = false; break; }
                        }
                        if (!validBlock) continue;

                        // STEP 1 & 2: Candidate rooms must be free across ALL consecutive periods of the session
                        const freeRooms = allowedRooms.filter(r => {
                            for (let k = p; k < p + dur; k++) {
                                if (!isFree(roomBookings, r.roomno, day, k)) return false;
                            }
                            return true;
                        });

                        // STEP 3 & 4: Rank free rooms using room-stability score to minimize student movement
                        if (freeRooms.length > 0) {
                            freeRooms.sort((a, b) => {
                                const scoreA = getRoomStabilityScore(section, day, p, dur, a.roomno, allowedRooms, roomBookings);
                                const scoreB = getRoomStabilityScore(section, day, p, dur, b.roomno, allowedRooms, roomBookings);
                                return scoreB - scoreA;
                            });

                            const chosenRoom = freeRooms[0];
                            const sessionId = `${section.name}_${subject.code}_${day}_${p}`;
                            for (let k = p; k < p + dur; k++) {
                                const slot = section.slots[day][k];
                                slot.booked = true;
                                if (!slot.entries) slot.entries = [];
                                slot.entries.push({
                                    subject: subject.code,
                                    faculty: subject.faculty,
                                    facultyCode: subject.faculty,
                                    room: chosenRoom.roomno,
                                    isLab: false,
                                    duration: dur,
                                    group: null, // Normal theory subjects must NEVER have G1/G2
                                    sessionId: sessionId,
                                    electiveType: null
                                });
                                book(facultyBookings, subject.faculty, day, k);
                                book(roomBookings, chosenRoom.roomno, day, k);
                            }
                            placed = true;
                            break;
                        }
                    }
                    if (placed) break;
                }
            } else {
                // CASE 2: Single-period session (duration == 1)
                for (const day of balancedDays) {
                    // Prefer days where subject is not already scheduled
                    const alreadyToday = section.slots[day].some(s =>
                        s.booked && s.entries && s.entries.some(e => e.subject === subject.code)
                    );
                    if (alreadyToday) continue;

                    // Order candidate periods on this day: prioritize morning (09:00 -> lunch) over post-lunch, and cluster adjacently within each zone
                    const orderedPeriods = Array.from({ length: 8 }, (_, i) => i).sort((pA, pB) => {
                        const slotA = section.slots[day][pA];
                        const slotB = section.slots[day][pB];
                        if (slotA.isLunch) return 1;
                        if (slotB.isLunch) return -1;

                        // Morning priority: periods before lunch are strictly preferred
                        const isPreA = pA < preLunchLimit;
                        const isPreB = pB < preLunchLimit;
                        if (isPreA && !isPreB) return -1;
                        if (!isPreA && isPreB) return 1;

                        // Within the same zone (pre-lunch or post-lunch), prefer periods adjacent to already scheduled classes
                        const adjA = (pA > 0 && section.slots[day][pA - 1].booked && !section.slots[day][pA - 1].isLunch) ||
                                     (pA < 7 && section.slots[day][pA + 1].booked && !section.slots[day][pA + 1].isLunch);
                        const adjB = (pB > 0 && section.slots[day][pB - 1].booked && !section.slots[day][pB - 1].isLunch) ||
                                     (pB < 7 && section.slots[day][pB + 1].booked && !section.slots[day][pB + 1].isLunch);
                        if (adjA && !adjB) return -1;
                        if (!adjA && adjB) return 1;
                        return pA - pB;
                    });

                    for (const p of orderedPeriods) {
                        const slot = section.slots[day][p];
                        if (slot.booked || slot.isLunch) continue;

                        // Check faculty conflict
                        if (subject.faculty && !isFree(facultyBookings, subject.faculty, day, p)) continue;

                        // SAME ROOM CONSTRAINT: If adjacent period on the same day has the same subject, require the same room
                        let chosenRoomNo = null;
                        let requiredSameSubjectRoom = null;
                        if (p > 0 && section.slots[day][p - 1].booked && section.slots[day][p - 1].entries && section.slots[day][p - 1].entries.some(e => e.subject === subject.code)) {
                            const prevEntry = section.slots[day][p - 1].entries.find(e => e.subject === subject.code);
                            if (prevEntry && prevEntry.room) requiredSameSubjectRoom = prevEntry.room;
                        } else if (p < 7 && section.slots[day][p + 1].booked && section.slots[day][p + 1].entries && section.slots[day][p + 1].entries.some(e => e.subject === subject.code)) {
                            const nextEntry = section.slots[day][p + 1].entries.find(e => e.subject === subject.code);
                            if (nextEntry && nextEntry.room) requiredSameSubjectRoom = nextEntry.room;
                        }

                        if (requiredSameSubjectRoom) {
                            if (isFree(roomBookings, requiredSameSubjectRoom, day, p)) {
                                chosenRoomNo = requiredSameSubjectRoom;
                            } else {
                                continue; // Hard constraint: same subject contiguous must use same room
                            }
                        } else {
                            // Soft room-stability optimization across different consecutive classes
                            const freeRooms = allowedRooms.filter(r => isFree(roomBookings, r.roomno, day, p));
                            if (freeRooms.length > 0) {
                                freeRooms.sort((a, b) => {
                                    const scoreA = getRoomStabilityScore(section, day, p, 1, a.roomno, allowedRooms, roomBookings);
                                    const scoreB = getRoomStabilityScore(section, day, p, 1, b.roomno, allowedRooms, roomBookings);
                                    return scoreB - scoreA;
                                });
                                chosenRoomNo = freeRooms[0].roomno;
                            }
                        }

                        if (!chosenRoomNo) continue;

                        slot.booked = true;
                        if (!slot.entries) slot.entries = [];
                        slot.entries.push({
                            subject: subject.code,
                            faculty: subject.faculty,
                            facultyCode: subject.faculty,
                            room: chosenRoomNo,
                            isLab: false,
                            duration: 1,
                            group: null,
                            sessionId: `${section.name}_${subject.code}_${day}_${p}`,
                            electiveType: null
                        });

                        book(facultyBookings, subject.faculty, day, p);
                        book(roomBookings, chosenRoomNo, day, p);
                        placed = true;
                        break;
                    }
                    if (placed) break;
                }

                // Fallback: If strictly non-scheduled days are full, schedule on any available slot with room stability
                if (!placed) {
                    for (let day = 0; day < DAYS_COUNT; day++) {
                        const alreadyToday = section.slots[day].some(s =>
                            s.booked && s.entries && s.entries.some(e => e.subject === subject.code)
                        );
                        if (alreadyToday) continue;

                        for (let p = 0; p < 8; p++) {
                            const slot = section.slots[day][p];
                            if (slot.booked || slot.isLunch) continue;

                            if (subject.faculty && !isFree(facultyBookings, subject.faculty, day, p)) continue;

                            const freeRooms = allowedRooms.filter(r => isFree(roomBookings, r.roomno, day, p));
                            if (freeRooms.length === 0) continue;

                            freeRooms.sort((a, b) => {
                                const scoreA = getRoomStabilityScore(section, day, p, 1, a.roomno, allowedRooms, roomBookings);
                                const scoreB = getRoomStabilityScore(section, day, p, 1, b.roomno, allowedRooms, roomBookings);
                                return scoreB - scoreA;
                            });

                            const chosenRoomNo = freeRooms[0].roomno;

                            slot.booked = true;
                            if (!slot.entries) slot.entries = [];
                            slot.entries.push({
                                subject: subject.code,
                                faculty: subject.faculty,
                                facultyCode: subject.faculty,
                                room: chosenRoomNo,
                                isLab: false,
                                duration: 1,
                                group: null,
                                sessionId: `${section.name}_${subject.code}_${day}_${p}`,
                                electiveType: null
                            });

                            book(facultyBookings, subject.faculty, day, p);
                            book(roomBookings, chosenRoomNo, day, p);
                            placed = true;
                            break;
                        }
                        if (placed) break;
                    }
                }
            }
        }
    }
}

// -------------------------------------------------------------
// TOP-LEVEL GENERATOR
// -------------------------------------------------------------
function generateBaseTimetable(subjectsJsonPath, roomsJsonPath, sectionFilterFn = null, options = {}) {
    let sections = funcs.subject_parse(subjectsJsonPath);
    if (sectionFilterFn) sections = sections.filter(sectionFilterFn);

    // Filter out M.Tech only if not requested
    if (options.includeMTech === false) {
        sections = sections.filter(s => !s.year.includes('M.Tech'));
    }

    // Apply faculty allocations
    if (options.usePlaceholderFaculty !== false) {
        assignPlaceholders(sections, options.facultyRoster || FACULTY_LIST);
    }

    // Configure Theory Rooms: User selects 4 from CANDIDATE_THEORY_ROOMS
    let selectedTheoryRooms = options.selectedTheoryRooms || DEFAULT_THEORY_ROOMS;
    if (!Array.isArray(selectedTheoryRooms) || selectedTheoryRooms.length !== 4) {
        selectedTheoryRooms = DEFAULT_THEORY_ROOMS;
    }

    const allRoomsData = funcs.room_parse(roomsJsonPath);

    // Theory classrooms: The 4 selected + CSE-III for CD5 + Seminar Hall / Conference Hall for M.Tech
    const classRooms = [
        ...selectedTheoryRooms.map(rNo => {
            const found = allRoomsData.find(r => r.roomno === rNo);
            return found || { roomno: rNo, type: 'Class' };
        }),
        { roomno: 'CSE-III', type: 'Class' },
        { roomno: 'Seminar Hall - Block A', type: 'Class' },
        { roomno: 'Conference Hall - Block B', type: 'Class' }
    ];

    // Lab rooms: Valid lab rooms excluding any room currently active as a classroom
    const labRooms = ALL_LAB_ROOMS
        .filter(rNo => !selectedTheoryRooms.includes(rNo))
        .map(rNo => {
            const found = allRoomsData.find(r => r.roomno === rNo);
            return found || { roomno: rNo, type: 'Lab' };
        });

    const facultyBookings = createTracker();
    const roomBookings = createTracker();

    // 1. Open Electives
    placeOpenElectives(sections, classRooms, facultyBookings, roomBookings);

    // 2. Discipline Electives (Merged cohort)
    placeDisciplineElectives(sections, classRooms, facultyBookings, roomBookings);

    // 3. SA-201 Special Rule
    placeSA201(sections);

    // 4. Contiguous Labs (G1/G2 priority simultaneous)
    placeLabs(sections, labRooms, facultyBookings, roomBookings);

    // 5. Normal Theory Subjects
    placeTheorySubjects(sections, classRooms, facultyBookings, roomBookings, selectedTheoryRooms);

    return sections;
}

// Converts generated section slots to flat exportable JSON format
function toFlatSlotList(sections) {
    const out = [];
    for (const section of sections) {
        section.days.slice(0, DAYS_COUNT).forEach((dayName, dayIdx) => {
            section.slots[dayIdx].forEach((slot, periodIdx) => {
                if (!slot.booked || !slot.entries) return;
                const interval = section.timeIntervals[periodIdx];

                for (const entry of slot.entries) {
                    out.push({
                        section: section.name,
                        year: section.year,
                        semester: section.semester,
                        day: dayName,
                        start: interval.start,
                        end: interval.end,
                        subjectCode: entry.subject,
                        facultyCode: entry.facultyCode || entry.faculty || null,
                        faculty: entry.faculty || null,
                        room: entry.room || null,
                        isLab: entry.isLab === true,
                        duration: entry.duration || 1,
                        group: entry.group || null,
                        sessionId: entry.sessionId || null,
                        electiveType: entry.electiveType || null,
                        basket: entry.basket || null,
                        isReservedEmpty: entry.isReservedEmpty || false
                    });
                }
            });
        });
    }
    return out;
}

module.exports = {
    CANDIDATE_THEORY_ROOMS,
    DEFAULT_THEORY_ROOMS,
    ALL_LAB_ROOMS,
    generateBaseTimetable,
    toFlatSlotList
};

if (require.main === module) {
    const [, , subjectsArg, roomsArg, outDirArg] = process.argv;
    const subjectsJsonPath = subjectsArg || path.join(__dirname, '../data/subjects.json');
    const roomsJsonPath = roomsArg || path.join(__dirname, '../data/rooms.json');
    const outDir = outDirArg || path.join(__dirname, '../output');

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const sections = generateBaseTimetable(
        subjectsJsonPath,
        roomsJsonPath,
        s => !s.year.includes('M.Tech')
    );

    const flat = toFlatSlotList(sections);
    const outFile = path.join(outDir, 'base_timetable.json');
    fs.writeFileSync(outFile, JSON.stringify(flat, null, 2));
    console.log(`Successfully generated and wrote ${flat.length} slots to ${outFile}`);
}
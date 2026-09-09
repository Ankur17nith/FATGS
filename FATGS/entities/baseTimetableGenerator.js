/*
* Base Timetable Generator
* -------------------------
* One-shot batch script.
* Scope: 2nd and 3rd year CSE sections (CS2/CD2/CS3/CD3).
*
* Rules:
*  - Monday to Friday only (Saturday is OFF).
*  - Transposed visual grid: Days as Rows, Time intervals as Columns.
*  - Even load balancing across all 5 weekdays.
*  - Labs placed as contiguous 2-period blocks.
*  - Periods fill leftmost-first (compact clustering, mornings first).
*  - Live room & faculty conflict checking with preferred room fallback.
*/

const fs = require('fs');
const path = require('path');
const funcs = require('./functions.js');
const { assignPlaceholders } = require('./assignPlaceholderFaculty.js');

const PRE_LUNCH = [0, 1, 2, 3];
const POST_LUNCH = [5, 6, 7];
const ORDERED_PERIODS = [...PRE_LUNCH, ...POST_LUNCH]; // index 4 = lunch (13:00 - 14:00)
const LAB_BLOCKS = [[0, 1], [2, 3], [5, 6], [6, 7]];
const DAYS_COUNT = 5; // Monday to Friday (Saturday excluded)

function slotKey(day, period) {
    return `${day}_${period}`;
}

// ---- Resource Tracker ----

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

// ---- Room Assignment ----

function assignPreferredRooms(sections, rooms) {
    const classRooms = rooms.filter(r => r.type === 'Class');
    if (classRooms.length === 0) {
        throw new Error('No classrooms (labOrClass: "Class") found in room data.');
    }
    sections.forEach((section, i) => {
        section.preferredRoom = classRooms[i % classRooms.length].roomno;
    });
    return classRooms;
}

function pickClassroom(section, day, period, classRooms, classRoomBookings) {
    if (isFree(classRoomBookings, section.preferredRoom, day, period)) {
        return section.preferredRoom;
    }
    const fallback = classRooms.find(r => isFree(classRoomBookings, r.roomno, day, period));
    return fallback ? fallback.roomno : null;
}

// ---- Placement Logic ----

function placeLabs(sections, labRooms, facultyBookings, labRoomBookings) {
    for (const section of sections) {
        const shuffledLabs = [...section.labs].sort(() => Math.random() - 0.5);

        for (const lab of shuffledLabs) {
            let placed = false;
            const triedCombos = new Set();
            const totalCombos = DAYS_COUNT * LAB_BLOCKS.length;

            while (!placed && triedCombos.size < totalCombos) {
                const day = Math.floor(Math.random() * DAYS_COUNT);
                const blockIdx = Math.floor(Math.random() * LAB_BLOCKS.length);
                const comboKey = `${day}_${blockIdx}`;
                if (triedCombos.has(comboKey)) continue;
                triedCombos.add(comboKey);

                const [p1, p2] = LAB_BLOCKS[blockIdx];
                const slotA = section.slots[day][p1];
                const slotB = section.slots[day][p2];

                if (slotA.booked || slotB.booked || slotA.isLunch || slotB.isLunch) continue;
                if (!isFree(facultyBookings, lab.faculty, day, p1)) continue;
                if (!isFree(facultyBookings, lab.faculty, day, p2)) continue;

                const freeLabRoom = labRooms.find(r =>
                    isFree(labRoomBookings, r.roomno, day, p1) &&
                    isFree(labRoomBookings, r.roomno, day, p2)
                );
                if (!freeLabRoom) continue;

                slotA.booked = true; slotA.subject = lab.code; slotA.faculty = lab.faculty; slotA.room = freeLabRoom.roomno;
                slotB.booked = true; slotB.subject = lab.code; slotB.faculty = lab.faculty; slotB.room = freeLabRoom.roomno;

                book(facultyBookings, lab.faculty, day, p1);
                book(facultyBookings, lab.faculty, day, p2);
                book(labRoomBookings, freeLabRoom.roomno, day, p1);
                book(labRoomBookings, freeLabRoom.roomno, day, p2);

                placed = true;
            }

            if (!placed) {
                console.log(`Could not place lab ${lab.code} for section ${section.name} (Y${section.year} S${section.semester})`);
            }
        }
    }
}

function firstOpenPeriod(section, day) {
    for (const p of ORDERED_PERIODS) {
        if (!section.slots[day][p].booked) return p;
    }
    return null;
}

// Counts total booked classes on a day for load balancing
function getDayLoad(section, day) {
    return section.slots[day].filter(s => s.booked).length;
}

function placeSubjects(sections, classRooms, facultyBookings, classRoomBookings) {
    for (const section of sections) {
        // Group and shuffle subjects
        const subjectsPool = [...section.subjects].sort(() => Math.random() - 0.5);

        for (const subject of subjectsPool) {
            let placed = false;

            // Sort days 0..4 by lowest existing load to distribute classes evenly
            const balancedDays = Array.from({ length: DAYS_COUNT }, (_, d) => d)
                .sort((a, b) => getDayLoad(section, a) - getDayLoad(section, b));

            for (const day of balancedDays) {
                // Keep max 1 slot of the same course code per day
                const alreadyToday = section.slots[day].some(s => s.subject === subject.code);
                if (alreadyToday) continue;

                const p = firstOpenPeriod(section, day);
                if (p === null) continue;

                if (!isFree(facultyBookings, subject.faculty, day, p)) continue;

                const room = pickClassroom(section, day, p, classRooms, classRoomBookings);
                if (!room) continue;

                const slot = section.slots[day][p];
                slot.booked = true;
                slot.subject = subject.code;
                slot.faculty = subject.faculty;
                slot.room = room;

                book(facultyBookings, subject.faculty, day, p);
                book(classRoomBookings, room, day, p);
                placed = true;
                break;
            }

            // Fallback: If strictly balanced days are locked, take any open slot
            if (!placed) {
                for (let day = 0; day < DAYS_COUNT; day++) {
                    const p = firstOpenPeriod(section, day);
                    if (p === null) continue;
                    if (!isFree(facultyBookings, subject.faculty, day, p)) continue;

                    const room = pickClassroom(section, day, p, classRooms, classRoomBookings);
                    if (!room) continue;

                    const slot = section.slots[day][p];
                    slot.booked = true;
                    slot.subject = subject.code;
                    slot.faculty = subject.faculty;
                    slot.room = room;

                    book(facultyBookings, subject.faculty, day, p);
                    book(classRoomBookings, room, day, p);
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                console.log(`Could not place subject ${subject.code} for section ${section.name} (Y${section.year} S${section.semester})`);
            }
        }
    }
}

// ---- Top-level Execution ----

function generateBaseTimetable(subjectsJsonPath, roomsJsonPath, sectionFilterFn = null, options = {}) {
    let sections = funcs.subject_parse(subjectsJsonPath);
    if (sectionFilterFn) sections = sections.filter(sectionFilterFn);

    // Limit days to Monday–Friday on each Section instance
    sections.forEach(sec => {
        sec.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        sec.slots = sec.slots.slice(0, 5);
    });

    if (options.usePlaceholderFaculty) {
        assignPlaceholders(sections, options.facultyRoster);
    }

    const rooms = funcs.room_parse(roomsJsonPath);
    const classRooms = assignPreferredRooms(sections, rooms);
    const labRooms = rooms.filter(r => r.type === 'Lab');

    const facultyBookings = createTracker();
    const classRoomBookings = createTracker();
    const labRoomBookings = createTracker();

    placeLabs(sections, labRooms, facultyBookings, labRoomBookings);
    placeSubjects(sections, classRooms, facultyBookings, classRoomBookings);

    return sections;
}

function toFlatSlotList(sections) {
    const out = [];
    for (const section of sections) {
        section.days.slice(0, DAYS_COUNT).forEach((dayName, dayIdx) => {
            section.slots[dayIdx].forEach((slot, periodIdx) => {
                if (!slot.booked) return;
                out.push({
                    section: section.name,
                    year: section.year,
                    semester: section.semester,
                    day: dayName,
                    start: section.timeIntervals[periodIdx].start,
                    end: section.timeIntervals[periodIdx].end,
                    subjectCode: slot.subject,
                    faculty: slot.faculty,
                    room: slot.room
                });
            });
        });
    }
    return out;
}

// Built-in transposed viewer template (Rows: Days, Columns: Time)
function getTransposedViewerHtml(flatData) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Base Timetable — Transposed Viewer</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 20px; background: #0f172a; color: #f8fafc; }
        h1 { margin-bottom: 4px; font-size: 20px; }
        .note { color: #94a3b8; font-size: 13px; margin-bottom: 16px; }
        select { background: #1e293b; color: white; border: 1px solid #475569; padding: 6px 12px; font-size: 14px; border-radius: 6px; margin-bottom: 16px; }
        table { border-collapse: collapse; width: 100%; background: #1e293b; border-radius: 8px; overflow: hidden; }
        th, td { border: 1px solid #334155; padding: 10px; text-align: center; font-size: 12px; }
        th { background: #0b1120; color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 11px; }
        th.day-col { width: 110px; background: #111c2e; color: #38bdf8; font-weight: bold; font-size: 13px; }
        td.lunch { background: #141f33; color: #64748b; font-weight: 600; }
        td.empty { color: #475569; }
        td.booked { background: #1e3a5f; }
        .code { font-weight: bold; color: #60a5fa; }
        .fac { color: #cbd5e1; font-size: 11px; margin-top: 2px; }
        .room { color: #34d399; font-size: 11px; margin-top: 2px; }
    </style>
</head>
<body>
<h1>Base Timetable (Transposed View)</h1>
<div class="note">Monday–Friday 5-Day Academic Week. Saturday is OFF.</div>
<label>Select Section: <select id="sectionPicker"></select></label>
<div id="grid"></div>

<script>
    const DATA = ${JSON.stringify(flatData)};
    const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
    const TIMES = [
        '09:00 - 10:00','10:00 - 11:00','11:00 - 12:00','12:00 - 13:00',
        '13:00 - 14:00','14:00 - 15:00','15:00 - 16:00','16:00 - 17:00'
    ];

    const sectionKeys = [...new Set(DATA.map(d => \`\${d.section} — Y\${d.year} S\${d.semester}\`))].sort();
    const picker = document.getElementById('sectionPicker');
    sectionKeys.forEach(k => {
        const opt = document.createElement('option');
        opt.value = k; opt.textContent = k;
        picker.appendChild(opt);
    });

    function render(sectionKey) {
        const rows = DATA.filter(d => \`\${d.section} — Y\${d.year} S\${d.semester}\` === sectionKey);
        const map = {};
        rows.forEach(r => { map[\`\${r.day}_\${r.start} - \${r.end}\`] = r; });

        let html = '<table><thead><tr><th class="day-col">Day</th>';
        TIMES.forEach(t => { html += \`<th>\${t}</th>\`; });
        html += '</tr></thead><tbody>';

        DAYS.forEach(day => {
            html += \`<tr><th class="day-col">\${day}</th>\`;
            TIMES.forEach(time => {
                if (time === '13:00 - 14:00') {
                    html += '<td class="lunch">Lunch</td>';
                    return;
                }
                const cell = map[\`\${day}_\${time}\`];
                if (!cell) {
                    html += '<td class="empty">—</td>';
                } else {
                    html += \`<td class="booked"><div class="code">\${cell.subjectCode}</div><div class="fac">\${cell.faculty || ''}</div><div class="room">\${cell.room}</div></td>\`;
                }
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        document.getElementById('grid').innerHTML = html;
    }

    picker.addEventListener('change', () => render(picker.value));
    if (sectionKeys.length) { picker.value = sectionKeys[0]; render(sectionKeys[0]); }
</script>
</body>
</html>`;
}

module.exports = { generateBaseTimetable, toFlatSlotList };

if (require.main === module) {
    const [, , subjectsArg, roomsArg, outDirArg] = process.argv;
    const subjectsJsonPath = subjectsArg || path.join(__dirname, '../data/subjects_new_format.json');
    const roomsJsonPath = roomsArg || path.join(__dirname, '../data/rooms_data.json');
    const outDir = outDirArg || path.join(__dirname, '../output');

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const usePlaceholderFaculty = !process.argv.includes('--no-placeholder-faculty');

    const sections = generateBaseTimetable(
        subjectsJsonPath,
        roomsJsonPath,
        s => !s.year.includes('M.Tech'),
        { usePlaceholderFaculty }
    );
    const flat = toFlatSlotList(sections);

    fs.writeFileSync(path.join(outDir, 'base_timetable.json'), JSON.stringify(flat, null, 2));
    console.log(`Wrote ${flat.length} scheduled sessions to ${path.join(outDir, 'base_timetable.json')}`);

    const htmlOutput = getTransposedViewerHtml(flat);
    fs.writeFileSync(path.join(outDir, 'viewer.html'), htmlOutput);
    console.log(`Wrote transposed viewer to ${path.join(outDir, 'viewer.html')}`);
}
export const FACULTY_ROSTER = [
  'Faculty A', 'Faculty B', 'Faculty C', 'Faculty D', 'Faculty E',
  'Faculty F', 'Faculty G', 'Faculty H', 'Faculty I', 'Faculty J',
  'Faculty K', 'Faculty L', 'Faculty M', 'Faculty N', 'Faculty O'
];

export const RAW_SECTIONS = [
  {
    name: 'CS2', year: '2nd Year', semester: '3rd Semester',
    labs: [
      { code: 'CS-217', name: 'Object Oriented Programming Lab', credits: 1 },
      { code: 'CS-218', name: 'Data Structures Lab', credits: 1 },
      { code: 'CS-219', name: 'Computational Tools and Workshop', credits: 1 }
    ],
    subjects: [
      { code: 'MA-219', name: 'Probability and Applied Statistics', credits: 3 },
      { code: 'CS-212', name: 'Discrete Structures', credits: 3 },
      { code: 'CS-213', name: 'Object Oriented Programming', credits: 3 },
      { code: 'CS-214', name: 'Data Structures', credits: 3 },
      { code: 'CS-215', name: 'Computer Graphics', credits: 3 },
      { code: 'EC-219', name: 'Digital Electronics', credits: 2 }
    ]
  },
  {
    name: 'CD2', year: '2nd Year', semester: '3rd Semester',
    labs: [
      { code: 'CS-217', name: 'Object Oriented Programming Lab', credits: 1 },
      { code: 'CS-218', name: 'Data Structures Lab', credits: 1 },
      { code: 'CS-219', name: 'Computational Tools and Workshop', credits: 1 }
    ],
    subjects: [
      { code: 'MA-219', name: 'Probability and Applied Statistics', credits: 3 },
      { code: 'CS-212', name: 'Discrete Structures', credits: 3 },
      { code: 'CS-213', name: 'Object Oriented Programming', credits: 3 },
      { code: 'CS-214', name: 'Data Structures', credits: 3 },
      { code: 'CS-215', name: 'Computer Graphics', credits: 3 },
      { code: 'EC-219', name: 'Digital Electronics', credits: 2 }
    ]
  },
  {
    name: 'CS2', year: '2nd Year', semester: '4th Semester',
    labs: [
      { code: 'CS-225', name: 'Microprocessor & Interfacing Lab', credits: 1 },
      { code: 'CS-226', name: 'Operating Systems Lab', credits: 1 },
      { code: 'CS-227', name: 'Computer Organization & Architecture Lab', credits: 1 }
    ],
    subjects: [
      { code: 'CS-221', name: 'Microprocessor & Interfacing', credits: 3 },
      { code: 'CS-222', name: 'Operating Systems', credits: 3 },
      { code: 'CS-223', name: 'Computer Organization and Architecture', credits: 3 },
      { code: 'CS-224', name: 'Theory of Computation', credits: 4 },
      { code: 'SA-201', name: 'LA/CA (NSS/NCC/Prayas etc.)', credits: 1 }
    ]
  },
  {
    name: 'CD2', year: '2nd Year', semester: '4th Semester',
    labs: [
      { code: 'CS-225', name: 'Microprocessor & Interfacing Lab', credits: 1 },
      { code: 'CS-226', name: 'Operating Systems Lab', credits: 1 },
      { code: 'CS-227', name: 'Computer Organization & Architecture Lab', credits: 1 }
    ],
    subjects: [
      { code: 'CS-221', name: 'Microprocessor & Interfacing', credits: 3 },
      { code: 'CS-222', name: 'Operating Systems', credits: 3 },
      { code: 'CS-223', name: 'Computer Organization and Architecture', credits: 3 },
      { code: 'CS-224', name: 'Theory of Computation', credits: 4 },
      { code: 'SA-201', name: 'LA/CA (NSS/NCC/Prayas etc.)', credits: 1 }
    ]
  },
  {
    name: 'CS3', year: '3rd Year', semester: '5th Semester',
    labs: [
      { code: 'CS-315', name: 'Compiler Design Lab', credits: 1 },
      { code: 'CS-316', name: 'Computer Networks Lab', credits: 1 }
    ],
    subjects: [
      { code: 'CS-311', name: 'Analysis & Design of Algorithm', credits: 3 },
      { code: 'CS-312', name: 'Compiler Design', credits: 3 },
      { code: 'CS-313', name: 'Computer Networks', credits: 3 },
      { code: 'CS-314', name: 'Artificial Intelligence', credits: 3 }
    ]
  },
  {
    name: 'CD3', year: '3rd Year', semester: '5th Semester',
    labs: [
      { code: 'CS-315', name: 'Compiler Design Lab', credits: 1 },
      { code: 'CS-316', name: 'Computer Networks Lab', credits: 1 }
    ],
    subjects: [
      { code: 'CS-311', name: 'Analysis & Design of Algorithm', credits: 3 },
      { code: 'CS-312', name: 'Compiler Design', credits: 3 },
      { code: 'CS-313', name: 'Computer Networks', credits: 3 },
      { code: 'CS-314', name: 'Artificial Intelligence', credits: 3 }
    ]
  },
  {
    name: 'CS3', year: '3rd Year', semester: '6th Semester',
    labs: [
      { code: 'CS-324', name: 'Digital Image Processing Lab', credits: 1 },
      { code: 'CS-325', name: 'Database Management Systems Lab', credits: 1 }
    ],
    subjects: [
      { code: 'CS-321', name: 'Digital Image Processing', credits: 3 },
      { code: 'CS-322', name: 'Database Management Systems', credits: 3 },
      { code: 'CS-323', name: 'Software Engineering', credits: 2 },
      { code: 'HS-321', name: 'Engineering Economics and Accountancy', credits: 2 }
    ]
  },
  {
    name: 'CD3', year: '3rd Year', semester: '6th Semester',
    labs: [
      { code: 'CS-324', name: 'Digital Image Processing Lab', credits: 1 },
      { code: 'CS-325', name: 'Database Management Systems Lab', credits: 1 }
    ],
    subjects: [
      { code: 'CS-321', name: 'Digital Image Processing', credits: 3 },
      { code: 'CS-322', name: 'Database Management Systems', credits: 3 },
      { code: 'CS-323', name: 'Software Engineering', credits: 2 },
      { code: 'HS-321', name: 'Engineering Economics and Accountancy', credits: 2 }
    ]
  }
];

export const ROOMS = [
  { roomNo: 'B1', type: 'Class' },
  { roomNo: 'B2', type: 'Class' },
  { roomNo: 'B4', type: 'Class' },
  { roomNo: 'G5', type: 'Class' },
  { roomNo: 'F4', type: 'Class' },
  { roomNo: 'F6', type: 'Class' },
  { roomNo: 'S2', type: 'Class' },
  { roomNo: 'CSE-III', type: 'Class' },
  { roomNo: 'LAB B1', type: 'Lab' },
  { roomNo: 'LAB B2', type: 'Lab' },
  { roomNo: 'P1', type: 'Lab' },
  { roomNo: 'P4', type: 'Lab' },
  { roomNo: 'P5', type: 'Lab' }
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const INTERVALS = [
  { start: '09:00', end: '10:00', label: '09:00 - 10:00', isLunch: false },
  { start: '10:00', end: '11:00', label: '10:00 - 11:00', isLunch: false },
  { start: '11:00', end: '12:00', label: '11:00 - 12:00', isLunch: false },
  { start: '12:00', end: '13:00', label: '12:00 - 13:00', isLunch: false },
  { start: '13:00', end: '14:00', label: '13:00 - 14:00', isLunch: true  },
  { start: '14:00', end: '15:00', label: '14:00 - 15:00', isLunch: false },
  { start: '15:00', end: '16:00', label: '15:00 - 16:00', isLunch: false },
  { start: '16:00', end: '17:00', label: '16:00 - 17:00', isLunch: false }
];

export const ORDERED_PERIODS = [0, 1, 2, 3, 5, 6, 7];

export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createInitialStore() {
  return RAW_SECTIONS.map(s => ({
    ...s,
    subjects: s.subjects.map(sub => ({ ...sub, faculty: null })),
    labs: s.labs.map(lab => ({ ...lab, faculty: null }))
  }));
}

export function generateTimetableForSection({
  section,
  globalFacBookings,
  globalRoomBookings,
  persistedGrids
}) {
  const secKey = `${section.name}_${section.year}_${section.semester}`;

  // Release old bookings for this section if any
  if (persistedGrids.has(secKey)) {
    const oldGrid = persistedGrids.get(secKey);
    for (let d = 0; d < 5; d++) {
      for (let p = 0; p < 8; p++) {
        const cell = oldGrid[d][p];
        if (cell) {
          if (cell.room) globalRoomBookings.delete(`${cell.room}_${d}_${p}`);
          if (cell.faculty && cell.faculty !== '(Unassigned)') {
            globalFacBookings.delete(`${cell.faculty}_${d}_${p}`);
          }
        }
      }
    }
  }

  const classRooms = ROOMS.filter(r => r.type === 'Class');
  const labRooms = ROOMS.filter(r => r.type === 'Lab');
  const LAB_BLOCKS = [[0, 1], [2, 3], [5, 6], [6, 7]];

  const grid = Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => null));

  function isSlotAvailable(fac, room, day, period) {
    if (room && globalRoomBookings.has(`${room}_${day}_${period}`)) return false;
    if (fac && fac !== '(Unassigned)' && globalFacBookings.has(`${fac}_${day}_${period}`)) return false;
    return true;
  }

  function reserveSlot(fac, room, day, period) {
    if (room) globalRoomBookings.add(`${room}_${day}_${period}`);
    if (fac && fac !== '(Unassigned)') globalFacBookings.add(`${fac}_${day}_${period}`);
  }

  function firstOpenPeriod(g, day) {
    for (const p of ORDERED_PERIODS) {
      if (!g[day][p]) return p;
    }
    return null;
  }

  function getDayLoad(g, day) {
    return g[day].filter(Boolean).length;
  }

  function resolveSafeFaculty(candidateFac, sec, type, day, p1, p2 = null) {
    if (candidateFac) {
      const valid = p2 !== null
        ? isSlotAvailable(candidateFac, null, day, p1) && isSlotAvailable(candidateFac, null, day, p2)
        : isSlotAvailable(candidateFac, null, day, p1);
      return valid ? candidateFac : null;
    }
    const pool = type === 'lab' ? sec.labs : sec.subjects;
    const takenInSec = new Set(pool.map(i => i.faculty).filter(Boolean));
    const available = FACULTY_ROSTER.filter(f => !takenInSec.has(f));
    for (const fac of shuffle(available)) {
      const isFree = p2 !== null
        ? isSlotAvailable(fac, null, day, p1) && isSlotAvailable(fac, null, day, p2)
        : isSlotAvailable(fac, null, day, p1);
      if (isFree) return fac;
    }
    return '(Unassigned)';
  }

  // Place Labs first (2 consecutive periods)
  const shuffledLabs = shuffle(section.labs);
  shuffledLabs.forEach(lab => {
    const attempts = [];
    for (let d = 0; d < 5; d++) {
      for (let b = 0; b < LAB_BLOCKS.length; b++) {
        attempts.push({ day: d, block: LAB_BLOCKS[b] });
      }
    }
    const shuffledAttempts = shuffle(attempts);

    for (const { day, block } of shuffledAttempts) {
      const [p1, p2] = block;
      if (grid[day][p1] || grid[day][p2]) continue;

      const effectiveFaculty = resolveSafeFaculty(lab.faculty, section, 'lab', day, p1, p2);
      if (!effectiveFaculty) continue;

      const freeLab = shuffle(labRooms).find(r =>
        isSlotAvailable(effectiveFaculty, r.roomNo, day, p1) &&
        isSlotAvailable(effectiveFaculty, r.roomNo, day, p2)
      );
      if (!freeLab) continue;

      const cellData = {
        code: lab.code,
        faculty: effectiveFaculty,
        room: freeLab.roomNo,
        section: section.name,
        year: section.year,
        semester: section.semester,
        isLab: true
      };
      grid[day][p1] = cellData;
      grid[day][p2] = cellData;

      reserveSlot(effectiveFaculty, freeLab.roomNo, day, p1);
      reserveSlot(effectiveFaculty, freeLab.roomNo, day, p2);
      break;
    }
  });

  // Expand subjects by credits
  const expanded = [];
  section.subjects.forEach(sub => {
    for (let i = 0; i < sub.credits; i++) expanded.push(sub);
  });
  const shuffledSubs = shuffle(expanded);

  const sIdx = RAW_SECTIONS.findIndex(s => s.name === section.name && s.year === section.year && s.semester === section.semester);
  const preferredRoom = classRooms[sIdx >= 0 ? sIdx % classRooms.length : 0].roomNo;

  shuffledSubs.forEach(sub => {
    let placed = false;
    const balancedDays = [0, 1, 2, 3, 4].sort((a, b) => getDayLoad(grid, a) - getDayLoad(grid, b));

    for (const day of balancedDays) {
      const alreadyToday = grid[day].some(c => c && c.code === sub.code);
      if (alreadyToday) continue;

      const p = firstOpenPeriod(grid, day);
      if (p === null) continue;

      const effectiveFaculty = resolveSafeFaculty(sub.faculty, section, 'subject', day, p);
      if (!effectiveFaculty) continue;

      let chosenRoom = isSlotAvailable(effectiveFaculty, preferredRoom, day, p) ? preferredRoom : null;
      if (!chosenRoom) {
        const fallback = shuffle(classRooms).find(r => isSlotAvailable(effectiveFaculty, r.roomNo, day, p));
        if (fallback) chosenRoom = fallback.roomNo;
      }

      if (chosenRoom) {
        grid[day][p] = {
          code: sub.code,
          faculty: effectiveFaculty,
          room: chosenRoom,
          section: section.name,
          year: section.year,
          semester: section.semester,
          isLab: false
        };
        reserveSlot(effectiveFaculty, chosenRoom, day, p);
        placed = true;
        break;
      }
    }

    if (!placed) {
      for (let day = 0; day < 5; day++) {
        const p = firstOpenPeriod(grid, day);
        if (p === null) continue;
        const effectiveFaculty = resolveSafeFaculty(sub.faculty, section, 'subject', day, p);
        if (!effectiveFaculty) continue;

        let chosenRoom = isSlotAvailable(effectiveFaculty, preferredRoom, day, p) ? preferredRoom : null;
        if (!chosenRoom) {
          const fb = classRooms.find(r => isSlotAvailable(effectiveFaculty, r.roomNo, day, p));
          if (fb) chosenRoom = fb.roomNo;
        }

        if (chosenRoom) {
          grid[day][p] = {
            code: sub.code,
            faculty: effectiveFaculty,
            room: chosenRoom,
            section: section.name,
            year: section.year,
            semester: section.semester,
            isLab: false
          };
          reserveSlot(effectiveFaculty, chosenRoom, day, p);
          placed = true;
          break;
        }
      }
    }
  });

  persistedGrids.set(secKey, grid);
  return grid;
}

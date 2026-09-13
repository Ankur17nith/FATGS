export const FACULTY_ROSTER = [
  { code: 'KD', name: 'Dr Kamlesh Dutta', facultyCode: 'KD', facultyFullName: 'Dr Kamlesh Dutta' },
  { code: 'TPS', name: 'Dr T P Sharma', facultyCode: 'TPS', facultyFullName: 'Dr T P Sharma' },
  { code: 'SC', name: 'Dr Siddhartha Chauhan', facultyCode: 'SC', facultyFullName: 'Dr Siddhartha Chauhan' },
  { code: 'NC', name: 'Dr Naveen Chauhan', facultyCode: 'NC', facultyFullName: 'Dr Naveen Chauhan' },
  { code: 'PS', name: 'Dr Pardeep Singh', facultyCode: 'PS', facultyFullName: 'Dr Pardeep Singh' },
  { code: 'RK', name: 'Dr Rajeev Kumar', facultyCode: 'RK', facultyFullName: 'Dr Rajeev Kumar' },
  { code: 'NG', name: 'Dr Nitin Gupta', facultyCode: 'NG', facultyFullName: 'Dr Nitin Gupta' },
  { code: 'DPM', name: 'Dr Dharmendra P Mahato', facultyCode: 'DPM', facultyFullName: 'Dr Dharmendra P Mahato' },
  { code: 'AKY', name: 'Dr Arun Kumar Yadav', facultyCode: 'AKY', facultyFullName: 'Dr Arun Kumar Yadav' },
  { code: 'PR', name: 'Dr Priyanka', facultyCode: 'PR', facultyFullName: 'Dr Priyanka' },
  { code: 'JS', name: 'Dr Jyoti Srivastava', facultyCode: 'JS', facultyFullName: 'Dr Jyoti Srivastava' },
  { code: 'SS', name: 'Dr Sangeeta Sharma', facultyCode: 'SS', facultyFullName: 'Dr Sangeeta Sharma' },
  { code: 'MK', name: 'Dr Mohit Kumar', facultyCode: 'MK', facultyFullName: 'Dr Mohit Kumar' },
  { code: 'MKP', name: 'Dr Md Khalid Pandit', facultyCode: 'MKP', facultyFullName: 'Dr Md Khalid Pandit' },
  { code: 'AKM', name: 'Dr Ajay Kumar Mallick', facultyCode: 'AKM', facultyFullName: 'Dr Ajay Kumar Mallick' },
  { code: 'RPS', name: 'Dr Ram Prakash Sharma', facultyCode: 'RPS', facultyFullName: 'Dr Ram Prakash Sharma' },
  { code: 'RSB', name: 'Dr Robin Singh Bhadoria', facultyCode: 'RSB', facultyFullName: 'Dr Robin Singh Bhadoria' },
  { code: 'PRA', name: 'Ms Pratibha', facultyCode: 'PRA', facultyFullName: 'Ms Pratibha' },
  { code: 'KK', name: 'Mr Keshav Kaundal', facultyCode: 'KK', facultyFullName: 'Mr Keshav Kaundal' },
  { code: 'MN', name: 'Ms Meenakshi Nayyer', facultyCode: 'MN', facultyFullName: 'Ms Meenakshi Nayyer' },
  { code: 'PK', name: 'Dr Pushpender Kumar', facultyCode: 'PK', facultyFullName: 'Dr Pushpender Kumar' },
  { code: 'TW', name: 'Dr Tanuj', facultyCode: 'TW', facultyFullName: 'Dr Tanuj' },
  { code: 'MM', name: 'Dr Mukul Majhi', facultyCode: 'MM', facultyFullName: 'Dr Mukul Majhi' },
  { code: 'PVE', name: 'Ms Priyanka Verma', facultyCode: 'PVE', facultyFullName: 'Ms Priyanka Verma' },
  { code: 'APU', name: 'Ms Akanksha Puri', facultyCode: 'APU', facultyFullName: 'Ms Akanksha Puri' },
  { code: 'SB', name: 'Ms Shobhna', facultyCode: 'SB', facultyFullName: 'Ms Shobhna' },
  { code: 'VID', name: 'Ms Vidyotma', facultyCode: 'VID', facultyFullName: 'Ms Vidyotma' },
  { code: 'PSH', name: 'Dr Pooja Sharma', facultyCode: 'PSH', facultyFullName: 'Dr Pooja Sharma' },
  { code: 'AMK', name: 'Dr Aman Kumar', facultyCode: 'AMK', facultyFullName: 'Dr Aman Kumar' },
  { code: 'CF-II', name: 'CF-II', facultyCode: 'CF-II', facultyFullName: 'CF-II' },
  { code: 'CF-VI', name: 'CF-VI', facultyCode: 'CF-VI', facultyFullName: 'CF-VI' },
  { code: 'GF12', name: 'GF12', facultyCode: 'GF12', facultyFullName: 'GF12' },
  { code: 'GF13', name: 'GF13', facultyCode: 'GF13', facultyFullName: 'GF13' }
];

export const CANDIDATE_THEORY_ROOMS = [
  'B1', 'B2', 'B3', 'B4',
  'G1', 'G2', 'G3', 'G4', 'G5', 'G6',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6'
];

export const DEFAULT_THEORY_ROOMS = ['B4', 'F4', 'G5', 'S2'];

export const ALL_LAB_ROOMS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'B1', 'B2'];

export const RAW_SECTIONS = [
  // ------------------ 2nd Year, 3rd Semester ------------------
  {
    name: 'CS2', year: '2nd Year', semester: '3rd Semester',
    labs: [
      { code: 'CS-217', name: 'Object Oriented Programming Lab', credits: 1, duration: 2, isLab: true },
      { code: 'CS-218', name: 'Data Structures Lab', credits: 1, duration: 2, isLab: true },
      { code: 'CS-219', name: 'Computational Tools and Workshop', credits: 1, duration: 2, isLab: true }
    ],
    subjects: [
      { code: 'MA-219', name: 'Probability and Applied Statistics', credits: 3, isLab: false },
      { code: 'CS-212', name: 'Discrete Structures', credits: 3, isLab: false },
      { code: 'CS-213', name: 'Object Oriented Programming', credits: 3, isLab: false },
      { code: 'CS-214', name: 'Data Structures', credits: 3, isLab: false },
      { code: 'CS-215', name: 'Computer Graphics', credits: 3, isLab: false },
      { code: 'EC-219', name: 'Digital Electronics', credits: 2, isLab: false }
    ],
    electives: []
  },
  {
    name: 'CD2', year: '2nd Year', semester: '3rd Semester',
    labs: [
      { code: 'CS-217', name: 'Object Oriented Programming Lab', credits: 1, duration: 2, isLab: true },
      { code: 'CS-218', name: 'Data Structures Lab', credits: 1, duration: 2, isLab: true },
      { code: 'CS-219', name: 'Computational Tools and Workshop', credits: 1, duration: 2, isLab: true }
    ],
    subjects: [
      { code: 'MA-219', name: 'Probability and Applied Statistics', credits: 3, isLab: false },
      { code: 'CS-212', name: 'Discrete Structures', credits: 3, isLab: false },
      { code: 'CS-213', name: 'Object Oriented Programming', credits: 3, isLab: false },
      { code: 'CS-214', name: 'Data Structures', credits: 3, isLab: false },
      { code: 'CS-215', name: 'Computer Graphics', credits: 3, isLab: false },
      { code: 'EC-219', name: 'Digital Electronics', credits: 2, isLab: false }
    ],
    electives: []
  },

  // ------------------ 2nd Year, 4th Semester ------------------
  {
    name: 'CS2', year: '2nd Year', semester: '4th Semester',
    labs: [
      { code: 'CS-225', name: 'Microprocessor & Interfacing Lab', credits: 1, duration: 2, isLab: true },
      { code: 'CS-226', name: 'Operating Systems Lab', credits: 1, duration: 2, isLab: true },
      { code: 'CS-227', name: 'Computer Organization & Architecture Lab', credits: 1, duration: 2, isLab: true }
    ],
    subjects: [
      { code: 'CS-221', name: 'Microprocessor & Interfacing', credits: 3, isLab: false },
      { code: 'CS-222', name: 'Operating Systems', credits: 3, isLab: false },
      { code: 'CS-223', name: 'Computer Organization and Architecture', credits: 3, isLab: false },
      { code: 'CS-224', name: 'Theory of Computation', credits: 4, duration: 2, isLab: false }
    ],
    electives: [
      { code: 'CS-241', name: 'Data Communication', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-I' },
      { code: 'CS-242', name: 'Optimization Techniques', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-I' },
      { code: 'CS-243', name: 'Simulation & Modelling', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-I' }
    ],
    activities: [
      { code: 'SA-201', name: 'LA/CA (NSS/NCC/Prayas etc)', credits: 1, duration: 2, isReservedEmpty: true }
    ]
  },
  {
    name: 'CD2', year: '2nd Year', semester: '4th Semester',
    labs: [
      { code: 'CS-225', name: 'Microprocessor & Interfacing Lab', credits: 1, duration: 2, isLab: true },
      { code: 'CS-226', name: 'Operating Systems Lab', credits: 1, duration: 2, isLab: true },
      { code: 'CS-227', name: 'Computer Organization & Architecture Lab', credits: 1, duration: 2, isLab: true }
    ],
    subjects: [
      { code: 'CS-221', name: 'Microprocessor & Interfacing', credits: 3, isLab: false },
      { code: 'CS-222', name: 'Operating Systems', credits: 3, isLab: false },
      { code: 'CS-223', name: 'Computer Organization and Architecture', credits: 3, isLab: false },
      { code: 'CS-224', name: 'Theory of Computation', credits: 4, duration: 2, isLab: false }
    ],
    electives: [
      { code: 'CS-241', name: 'Data Communication', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-I' },
      { code: 'CS-242', name: 'Optimization Techniques', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-I' },
      { code: 'CS-243', name: 'Simulation & Modelling', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-I' }
    ],
    activities: [
      { code: 'SA-201', name: 'LA/CA (NSS/NCC/Prayas etc)', credits: 1, duration: 2, isReservedEmpty: true }
    ]
  },

  // ------------------ 3rd Year, 5th Semester ------------------
  {
    name: 'CS3', year: '3rd Year', semester: '5th Semester',
    labs: [
      { code: 'CS-315', name: 'Compiler Design Lab', credits: 1, duration: 2, isLab: true },
      { code: 'CS-316', name: 'Computer Networks Lab', credits: 1, duration: 2, isLab: true }
    ],
    subjects: [
      { code: 'CS-311', name: 'Analysis & Design of Algorithm', credits: 3, isLab: false },
      { code: 'CS-312', name: 'Compiler Design', credits: 3, isLab: false },
      { code: 'CS-313', name: 'Computer Networks', credits: 3, isLab: false },
      { code: 'CS-314', name: 'Artificial Intelligence', credits: 3, isLab: false }
    ],
    electives: [
      { code: 'CS-301', name: 'Data Structures', credits: 3, isLab: false, electiveType: 'OE', basket: 'Open Elective' },
      { code: 'CS-302', name: 'Computer Networks', credits: 3, isLab: false, electiveType: 'OE', basket: 'Open Elective' },
      { code: 'CS-303', name: 'Artificial Intelligence', credits: 3, isLab: false, electiveType: 'OE', basket: 'Open Elective' },
      { code: 'CS-351', name: 'Advance Operating System', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-II' },
      { code: 'CS-352', name: 'Graph Theory', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-II' },
      { code: 'CS-353', name: 'Information Retrieval', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-II' }
    ]
  },
  {
    name: 'CD3', year: '3rd Year', semester: '5th Semester',
    labs: [
      { code: 'CS-315', name: 'Compiler Design Lab', credits: 1, duration: 2, isLab: true },
      { code: 'CS-316', name: 'Computer Networks Lab', credits: 1, duration: 2, isLab: true }
    ],
    subjects: [
      { code: 'CS-311', name: 'Analysis & Design of Algorithm', credits: 3, isLab: false },
      { code: 'CS-312', name: 'Compiler Design', credits: 3, isLab: false },
      { code: 'CS-313', name: 'Computer Networks', credits: 3, isLab: false },
      { code: 'CS-314', name: 'Artificial Intelligence', credits: 3, isLab: false }
    ],
    electives: [
      { code: 'CS-301', name: 'Data Structures', credits: 3, isLab: false, electiveType: 'OE', basket: 'Open Elective' },
      { code: 'CS-302', name: 'Computer Networks', credits: 3, isLab: false, electiveType: 'OE', basket: 'Open Elective' },
      { code: 'CS-303', name: 'Artificial Intelligence', credits: 3, isLab: false, electiveType: 'OE', basket: 'Open Elective' },
      { code: 'CS-351', name: 'Advance Operating System', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-II' },
      { code: 'CS-352', name: 'Graph Theory', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-II' },
      { code: 'CS-353', name: 'Information Retrieval', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-II' }
    ]
  },

  // ------------------ 3rd Year, 6th Semester ------------------
  {
    name: 'CS3', year: '3rd Year', semester: '6th Semester',
    labs: [
      { code: 'CS-324', name: 'Digital Image Processing Lab', credits: 1, duration: 2, isLab: true },
      { code: 'CS-325', name: 'Database Management Systems Lab', credits: 1, duration: 2, isLab: true }
    ],
    subjects: [
      { code: 'CS-321', name: 'Digital Image Processing', credits: 3, isLab: false },
      { code: 'CS-322', name: 'Database Management Systems', credits: 3, isLab: false },
      { code: 'CS-323', name: 'Software Engineering', credits: 2, isLab: false },
      { code: 'HS-321', name: 'Engineering Economics and Accountancy', credits: 2, isLab: false }
    ],
    electives: [
      { code: 'CS-341', name: 'Game Theory', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-III' },
      { code: 'CS-342', name: 'Computer Vision', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-III' },
      { code: 'CS-343', name: 'Natural Language Processing', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-III' },
      { code: 'CS-361', name: 'Cloud Computing', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-IV' },
      { code: 'CS-362', name: 'Statistical Computing', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-IV' },
      { code: 'CS-363', name: 'Neural Network', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-IV' },
      { code: 'CS-381', name: 'Distributed Systems', credits: 2, isLab: false, electiveType: 'SC', basket: 'Stream Core-I' },
      { code: 'CS-382', name: 'Machine Learning', credits: 2, isLab: false, electiveType: 'SC', basket: 'Stream Core-I' }
    ]
  },
  {
    name: 'CD3', year: '3rd Year', semester: '6th Semester',
    labs: [
      { code: 'CS-324', name: 'Digital Image Processing Lab', credits: 1, duration: 2, isLab: true },
      { code: 'CS-325', name: 'Database Management Systems Lab', credits: 1, duration: 2, isLab: true }
    ],
    subjects: [
      { code: 'CS-321', name: 'Digital Image Processing', credits: 3, isLab: false },
      { code: 'CS-322', name: 'Database Management Systems', credits: 3, isLab: false },
      { code: 'CS-323', name: 'Software Engineering', credits: 2, isLab: false },
      { code: 'HS-321', name: 'Engineering Economics and Accountancy', credits: 2, isLab: false }
    ],
    electives: [
      { code: 'CS-341', name: 'Game Theory', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-III' },
      { code: 'CS-342', name: 'Computer Vision', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-III' },
      { code: 'CS-343', name: 'Natural Language Processing', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-III' },
      { code: 'CS-361', name: 'Cloud Computing', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-IV' },
      { code: 'CS-362', name: 'Statistical Computing', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-IV' },
      { code: 'CS-363', name: 'Neural Network', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-IV' },
      { code: 'CS-381', name: 'Distributed Systems', credits: 2, isLab: false, electiveType: 'SC', basket: 'Stream Core-I' },
      { code: 'CS-382', name: 'Machine Learning', credits: 2, isLab: false, electiveType: 'SC', basket: 'Stream Core-I' }
    ]
  },

  // ------------------ 4th Year, 7th Semester ------------------
  {
    name: 'CS4', year: '4th Year', semester: '7th Semester',
    labs: [
      { code: 'CS-414', name: 'Information Security & Privacy Lab', credits: 1, duration: 2, isLab: true },
      { code: 'CS-415', name: 'Data Warehousing & Data Mining Lab', credits: 1, duration: 2, isLab: true }
    ],
    subjects: [
      { code: 'CS-411', name: 'Advance Computer Architecture', credits: 3, isLab: false },
      { code: 'CS-412', name: 'Information Security & Privacy', credits: 3, isLab: false },
      { code: 'CS-413', name: 'Data Warehousing & Data Mining', credits: 3, isLab: false }
    ],
    electives: [
      { code: 'CS-431', name: 'Information Theory and Coding', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-V' },
      { code: 'CS-432', name: 'Soft Computing', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-V' },
      { code: 'CS-433', name: 'Big Data Analytics', credits: 3, isLab: false, electiveType: 'DE', basket: 'Discipline Elective-V' },
      { code: 'CS-451', name: 'Advance Mobile Communication', credits: 2, isLab: false, electiveType: 'SC', basket: 'Stream Core-II' },
      { code: 'CS-452', name: 'Deep Learning', credits: 2, isLab: false, electiveType: 'SC', basket: 'Stream Core-II' },
      { code: 'CS-471', name: 'Internet of Things', credits: 2, isLab: false, electiveType: 'SC', basket: 'Stream Core-III' },
      { code: 'CS-472', name: 'Pattern Recognition', credits: 2, isLab: false, electiveType: 'SC', basket: 'Stream Core-III' }
    ],
    nonScheduled: [
      { code: 'CS-416', name: 'Summer Training', credits: 2, isNonScheduled: true }
    ]
  },
  {
    name: 'CD4', year: '4th Year', semester: '7th Semester',
    labs: [
      { code: 'CS-415', name: 'Data Warehousing & Data Mining Lab', credits: 1, duration: 2, isLab: true }
    ],
    subjects: [
      { code: 'CS-411', name: 'Advance Computer Architecture', credits: 3, isLab: false },
      { code: 'CS-412', name: 'Information Security & Privacy', credits: 3, isLab: false },
      { code: 'CS-611', name: 'Advance Topics in Software Engineering', credits: 4, isLab: false },
      { code: 'CS-633', name: 'Applied Optimization', credits: 4, isLab: false },
      { code: 'CS-736', name: 'CS-736', credits: 4, isLab: false },
      { code: 'CS-747', name: 'CS-747', credits: 4, isLab: false }
    ],
    electives: [],
    nonScheduled: [
      { code: 'CS-416', name: 'Summer Training', credits: 2, isNonScheduled: true }
    ]
  },

  // ------------------ 4th Year, 8th Semester ------------------
  {
    name: 'CS4', year: '4th Year', semester: '8th Semester',
    labs: [],
    subjects: [
      { code: 'CS-498', name: 'General Proficiency', credits: 2, isLab: false }
    ],
    electives: [
      { code: 'CS-461', name: 'Reinforcement Learning', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-I' },
      { code: 'CS-462', name: 'Cyber Security', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-I' },
      { code: 'CS-463', name: 'Quantum Computing', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-I' },
      { code: 'CS-464', name: 'Networked Wireless System', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-I' },
      { code: 'CS-481', name: 'Blockchain Technology', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-II' },
      { code: 'CS-482', name: 'Approximation Algorithms', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-II' },
      { code: 'CS-483', name: 'Parallel Computing', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-II' },
      { code: 'CS-484', name: 'Topics in Theoretical Computer Science', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-II' }
    ],
    nonScheduled: [
      { code: 'CS-499', name: 'UG Project', credits: 12, isNonScheduled: true }
    ]
  },
  {
    name: 'CD4', year: '4th Year', semester: '8th Semester',
    labs: [],
    subjects: [
      { code: 'CS-498', name: 'General Proficiency', credits: 2, isLab: false }
    ],
    electives: [
      { code: 'CS-461', name: 'Reinforcement Learning', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-I' },
      { code: 'CS-462', name: 'Cyber Security', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-I' },
      { code: 'CS-463', name: 'Quantum Computing', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-I' },
      { code: 'CS-464', name: 'Networked Wireless System', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-I' },
      { code: 'CS-481', name: 'Blockchain Technology', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-II' },
      { code: 'CS-482', name: 'Approximation Algorithms', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-II' },
      { code: 'CS-483', name: 'Parallel Computing', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-II' },
      { code: 'CS-484', name: 'Topics in Theoretical Computer Science', credits: 3, isLab: false, electiveType: 'SE', basket: 'Stream Elective-II' }
    ],
    nonScheduled: [
      { code: 'CS-499', name: 'UG Project', credits: 12, isNonScheduled: true }
    ]
  },

  // ------------------ 5th Year, 9th Semester ------------------
  {
    name: 'CD5', year: '5th Year', semester: '9th Semester',
    labs: [],
    subjects: [
      { code: 'CS-611', name: 'Advance Topics in Software Engineering', credits: 4, isLab: false }
    ],
    electives: []
  },

  // ------------------ M.Tech 1st Year, 1st Semester ------------------
  {
    name: 'MT1', year: 'M.Tech 1st Year', semester: '1st Semester',
    labs: [
      { code: 'CS-614', name: 'Computational Lab–I', credits: 2, duration: 2, isLab: true, preferredRoom: 'B1' }
    ],
    subjects: [
      { code: 'CS-611', name: 'Advance Topics in Software Engineering', credits: 4, isLab: false },
      { code: 'CS-612', name: 'Theoretical Computer Science', credits: 4, isLab: false },
      { code: 'CS-613', name: 'Computer Systems', credits: 4, isLab: false },
      { code: 'CS-736', name: 'CS-736', credits: 4, isLab: false },
      { code: 'CS-740', name: 'CS-740', credits: 4, isLab: false }
    ],
    electives: []
  },
  {
    name: 'MA1', year: 'M.Tech 1st Year', semester: '1st Semester',
    labs: [
      { code: 'CS-634', name: 'AI based Programming Lab', credits: 2, duration: 2, isLab: true, preferredRoom: 'B2' }
    ],
    subjects: [
      { code: 'CS-621', name: 'Data Structures & Algorithms', credits: 4, isLab: false },
      { code: 'CS-631', name: 'Artificial Intelligence and Intelligent Systems', credits: 4, isLab: false },
      { code: 'CS-632', name: 'Mathematics for Machine Learning', credits: 4, isLab: false },
      { code: 'CS-633', name: 'Applied Optimization', credits: 4, isLab: false },
      { code: 'CS-754', name: 'CS-754', credits: 4, isLab: false }
    ],
    electives: []
  }
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const INTERVALS = [
  { start: '09:00', end: '10:00', label: '09:00 - 10:00', isLunch: false },
  { start: '10:00', end: '11:00', label: '10:00 - 11:00', isLunch: false },
  { start: '11:00', end: '12:00', label: '11:00 - 12:00', isLunch: false },
  { start: '12:00', end: '13:00', label: '12:00 - 13:00', isLunch: false },
  { start: '13:00', end: '14:00', label: '13:00 - 14:00', isLunch: false },
  { start: '14:00', end: '15:00', label: '14:00 - 15:00', isLunch: false },
  { start: '15:00', end: '16:00', label: '15:00 - 16:00', isLunch: false },
  { start: '16:00', end: '17:00', label: '16:00 - 17:00', isLunch: false }
];

export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const OFFICIAL_ALLOCATIONS = {
  'CS2_3rd Semester': {
    'MA-219': 'CF-VI', 'CS-212': 'RK', 'CS-213': 'MN', 'CS-214': 'NG', 'CS-215': 'PSH',
    'EC-219': 'AMK', 'CS-217': 'RK', 'CS-218': 'NG', 'CS-219': 'NC'
  },
  'CD2_3rd Semester': {
    'MA-219': 'CF-VI', 'CS-212': 'RPS', 'CS-213': 'PK', 'CS-214': 'JS', 'CS-215': 'PVE',
    'EC-219': 'CF-II', 'CS-217': 'PK', 'CS-218': 'JS', 'CS-219': 'PS'
  },
  'CS3_5th Semester': {
    'CS-311': 'AKM', 'CS-312': 'AKY', 'CS-313': 'MM', 'CS-314': 'SS',
    'CS-301': 'KK', 'CS-351': 'DPM', 'CS-352': 'PRA',
    'CS-315': 'AKY', 'CS-316': 'MM'
  },
  'CD3_5th Semester': {
    'CS-311': 'AKM', 'CS-312': 'AKY', 'CS-313': 'VID', 'CS-314': 'MM',
    'CS-301': 'KK', 'CS-351': 'DPM', 'CS-352': 'PRA',
    'CS-315': 'SS', 'CS-316': 'KD'
  },
  'CS4_7th Semester': {
    'CS-411': 'TW', 'CS-412': 'PK', 'CS-413': 'PSH',
    'CS-431': 'GF13', 'CS-433': 'APU', 'CS-451': 'GF12', 'CS-452': 'MKP',
    'CS-471': 'TW', 'CS-472': 'SB', 'CS-414': 'AKM', 'CS-415': 'PSH'
  },
  'CD4_7th Semester': {
    'CS-411': 'PR', 'CS-412': 'RSB', 'CS-611': 'RK', 'CS-633': 'GF12',
    'CS-736': 'PS', 'CS-747': 'KD', 'CS-415': 'PR'
  },
  'CD5_9th Semester': {
    'CS-611': 'NC'
  }
};

export function createInitialStore() {
  const facMap = new Map(FACULTY_ROSTER.map(f => [f.code, f.name]));
  return RAW_SECTIONS.map(s => {
    const secKey = `${s.name}_${s.semester}`;
    const alloc = OFFICIAL_ALLOCATIONS[secKey] || {};
    return {
      ...s,
      subjects: (s.subjects || []).map(sub => {
        const facCode = alloc[sub.code] || null;
        return { ...sub, faculty: facCode, facultyName: facCode ? (facMap.get(facCode) || facCode) : null };
      }),
      labs: (s.labs || []).map(lab => {
        const facCode = alloc[lab.code] || null;
        return { ...lab, faculty: facCode, facultyName: facCode ? (facMap.get(facCode) || facCode) : null };
      }),
      electives: (s.electives || []).map(el => {
        const facCode = alloc[el.code] || null;
        return { ...el, faculty: facCode, facultyName: facCode ? (facMap.get(facCode) || facCode) : null };
      })
    };
  });
}

export function generateTimetableForSection({
  section,
  selectedTheoryRooms = DEFAULT_THEORY_ROOMS,
  globalFacBookings,
  globalRoomBookings,
  persistedGrids,
  cohortElectiveBookings = new Map()
}) {
  const secKey = `${section.name}_${section.year}_${section.semester}`;
  const cohortKey = `${section.year}_${section.semester}`;

  // Release old bookings for this section (preserve shared cohort electives across paired sections)
  if (persistedGrids && persistedGrids.has(secKey)) {
    const oldGrid = persistedGrids.get(secKey);
    for (let d = 0; d < 5; d++) {
      for (let p = 0; p < 8; p++) {
        const cell = oldGrid[d][p];
        if (cell) {
          const entries = Array.isArray(cell) ? cell : [cell];
          entries.forEach(e => {
            // Elective bookings are shared across paired sections in the cohort; do not delete if cohort shared
            if (e.basket || e.electiveType) return;
            if (e.room) globalRoomBookings.delete(`${e.room}_${d}_${p}`);
            if (e.faculty) globalFacBookings.delete(`${e.faculty}_${d}_${p}`);
            if (e.facultyCode) globalFacBookings.delete(`${e.facultyCode}_${d}_${p}`);
          });
        }
      }
    }
  }

  // Year-specific lunch timings:
  // 2nd Year: Lunch = 13:00 - 14:00 (period 4)
  // 3rd Year: Lunch = 12:00 - 13:00 (period 3)
  // Final Year: Lunch = 13:00 - 14:00 (period 4)
  const isThirdYear = section.name === 'CS3' || section.name === 'CD3' || (section.year && section.year.includes('3rd'));
  const lunchPeriodIdx = isThirdYear ? 3 : 4; // 12-1 for 3rd yr, 1-2 for 2nd/4th/5th/M.Tech

  const isCD5 = section.name === 'CD5';
  const isMTechCSE = section.name === 'MT1';
  const isMTechAI = section.name === 'MA1';

  let theoryRooms = selectedTheoryRooms;
  if (isCD5) {
    theoryRooms = ['CSE-III'];
  } else if (isMTechCSE) {
    theoryRooms = ['Seminar Hall - Block A', ...selectedTheoryRooms];
  } else if (isMTechAI) {
    theoryRooms = ['Conference Hall - Block B', ...selectedTheoryRooms];
  }

  const labRooms = ALL_LAB_ROOMS.filter(r => !selectedTheoryRooms.includes(r));

  const grid = Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => null));

  function isAvailable(fac, room, day, p, allowLunch = false) {
    if (!allowLunch && p === lunchPeriodIdx) return false;
    if (room && globalRoomBookings.has(`${room}_${day}_${p}`)) return false;
    if (fac && globalFacBookings.has(`${fac}_${day}_${p}`)) return false;
    return true;
  }

  function reserve(fac, room, day, p) {
    if (room) globalRoomBookings.add(`${room}_${day}_${p}`);
    if (fac) globalFacBookings.add(`${fac}_${day}_${p}`);
  }

  // 1. SA-201 Special Reserved Slot (CS2/CD2 4th Semester)
  const is4thSem = section.semester && section.semester.includes('4th');
  if ((section.name === 'CS2' || section.name === 'CD2') && is4thSem) {
    // Reserve Friday periods 6-7 (15:00-17:00) as reserved empty slot
    const day = 4; // Friday
    const p1 = 6;
    const p2 = 7;
    const saEntry = {
      code: 'SA-201', subjectCode: 'SA-201', faculty: null, facultyCode: null,
      room: null, isLab: false, duration: 2, group: null,
      sessionId: `SA201_${section.name}_${day}_${p1}`, electiveType: 'Activity',
      isReservedEmpty: true
    };
    grid[day][p1] = saEntry;
    grid[day][p2] = saEntry;
  }

  // 2. Labs (Priority 1: G1 & G2 same time, Priority 2: fallback different times)
  const labBlocks = isThirdYear ? [[0, 1], [1, 2], [4, 5], [5, 6], [6, 7]] : [[0, 1], [1, 2], [2, 3], [5, 6], [6, 7]];
  const g1Tasks = (section.labs || []).map(l => ({ ...l, group: 'G1' }));
  const g2Tasks = (section.labs || []).map(l => ({ ...l, group: 'G2' }));

  const unplacedG1 = shuffle(g1Tasks);
  const unplacedG2 = shuffle(g2Tasks);

  for (let i = unplacedG1.length - 1; i >= 0; i--) {
    const t1 = unplacedG1[i];
    let paired = false;

    for (let j = unplacedG2.length - 1; j >= 0; j--) {
      const t2 = unplacedG2[j];

      const attempts = [];
      for (let d = 0; d < 5; d++) {
        for (const block of labBlocks) attempts.push({ day: d, block });
      }
      const sortedAttempts = shuffle(attempts).sort((a, b) => {
        const isPreA = a.block[1] < lunchPeriodIdx;
        const isPreB = b.block[1] < lunchPeriodIdx;
        if (isPreA && !isPreB) return -1;
        if (!isPreA && isPreB) return 1;
        return 0;
      });
      for (const { day, block } of sortedAttempts) {
        const [p1, p2] = block;
        if (grid[day][p1] || grid[day][p2]) continue;

        const fac1 = t1.faculty || 'RK';
        const fac2 = t2.faculty || (t1.faculty === 'RK' ? 'NG' : 'RK');
        if (fac1 === fac2) continue;

        if (!isAvailable(fac1, null, day, p1) || !isAvailable(fac1, null, day, p2)) continue;
        if (!isAvailable(fac2, null, day, p1) || !isAvailable(fac2, null, day, p2)) continue;

        const freeRooms = shuffle(labRooms).filter(r =>
          isAvailable(null, r, day, p1) && isAvailable(null, r, day, p2)
        );
        if (freeRooms.length < 2) continue;

        const r1 = freeRooms[0];
        const r2 = freeRooms[1];

        const sessId = `${section.name}_${t1.code}_${t2.code}_${day}_${p1}`;
        const entry1 = { code: t1.code, subjectCode: t1.code, faculty: fac1, facultyCode: fac1, room: r1, isLab: true, duration: 2, group: 'G1', sessionId: sessId };
        const entry2 = { code: t2.code, subjectCode: t2.code, faculty: fac2, facultyCode: fac2, room: r2, isLab: true, duration: 2, group: 'G2', sessionId: sessId };

        grid[day][p1] = [entry1, entry2];
        grid[day][p2] = [entry1, entry2];

        reserve(fac1, r1, day, p1); reserve(fac1, r1, day, p2);
        reserve(fac2, r2, day, p1); reserve(fac2, r2, day, p2);

        unplacedG1.splice(i, 1);
        unplacedG2.splice(j, 1);
        paired = true;
        break;
      }
      if (paired) break;
    }
  }

  // Fallback single group labs
  for (const task of [...unplacedG1, ...unplacedG2]) {
    const attempts = [];
    for (let d = 0; d < 5; d++) {
      for (const block of labBlocks) attempts.push({ day: d, block });
    }
    const sortedAttempts = shuffle(attempts).sort((a, b) => {
      const isPreA = a.block[1] < lunchPeriodIdx;
      const isPreB = b.block[1] < lunchPeriodIdx;
      if (isPreA && !isPreB) return -1;
      if (!isPreA && isPreB) return 1;
      return 0;
    });
    for (const { day, block } of sortedAttempts) {
      const [p1, p2] = block;
      if (grid[day][p1] || grid[day][p2]) continue;

      const fac = task.faculty || 'RK';
      if (!isAvailable(fac, null, day, p1) || !isAvailable(fac, null, day, p2)) continue;

      let candidateRooms = labRooms;
      if (task.preferredRoom) candidateRooms = [task.preferredRoom, ...labRooms];

      const freeRoom = candidateRooms.find(r => isAvailable(null, r, day, p1) && isAvailable(null, r, day, p2));
      if (!freeRoom) continue;

      const sessId = `${section.name}_${task.code}_${task.group}_${day}_${p1}`;
      const entry = { code: task.code, subjectCode: task.code, faculty: fac, facultyCode: fac, room: freeRoom, isLab: true, duration: 2, group: task.group, sessionId: sessId };

      grid[day][p1] = entry;
      grid[day][p2] = entry;

      reserve(fac, freeRoom, day, p1);
      reserve(fac, freeRoom, day, p2);
      break;
    }
  }

  // 3. Open Electives Basket (Fixed Elective Slot: e.g. 13:00 - 14:00)
  // Only schedule offered OE subjects (assigned faculty)
  const oeOffered = (section.electives || []).filter(e =>
    (e.basket === 'Open Elective' || e.electiveType === 'OE' || e.code.startsWith('CS-30')) && e.faculty
  );

  let cohortBookings = cohortElectiveBookings.get(cohortKey);
  if (!cohortBookings) {
    cohortBookings = {};
    cohortElectiveBookings.set(cohortKey, cohortBookings);
  }

  if (cohortBookings['Open Elective']) {
    // Reuse identical OE slots already established for this paired cohort
    cohortBookings['Open Elective'].forEach(({ day, p, entries }) => {
      grid[day][p] = entries.length === 1 ? entries[0] : entries;
    });
  } else if (oeOffered.length > 0) {
    // Determine the required number of timetable periods from authoritative course data
    const oePeriodsNeeded = Math.max(
      ...oeOffered.map(oe => (oe.L !== undefined ? (oe.L + (oe.T || 0)) : (oe.credits || 3)))
    );

    // Fixed candidate Open Elective slots: 13:00 - 14:00 (Mon, Tue, Wed, Thu, Fri)
    const FIXED_OE_SLOTS = [
      { day: 0, p: 4 }, // Monday 13:00 - 14:00
      { day: 1, p: 4 }, // Tuesday 13:00 - 14:00
      { day: 2, p: 4 }, // Wednesday 13:00 - 14:00
      { day: 3, p: 4 }, // Thursday 13:00 - 14:00
      { day: 4, p: 4 }  // Friday 13:00 - 14:00
    ];

    const oePlaced = [];
    for (const { day, p } of FIXED_OE_SLOTS) {
      if (oePlaced.length >= oePeriodsNeeded) break;

      // allowLunch = true because institutional Open Elective runs at 13:00 - 14:00
      const freeRooms = theoryRooms.filter(r => isAvailable(null, r, day, p, true));
      if (freeRooms.length < oeOffered.length) continue;

      const allFacsFree = oeOffered.every(oe => isAvailable(oe.faculty, null, day, p, true));
      if (!allFacsFree) continue;

      const oeEntries = oeOffered.map((oe, idx) => {
        const fac = oe.faculty;
        const room = freeRooms[idx];
        reserve(fac, room, day, p);
        return {
          code: oe.code,
          subjectCode: oe.code,
          faculty: fac,
          facultyCode: fac,
          room: room,
          isLab: false,
          duration: 1,
          group: oeOffered.length > 1 ? `Choice ${idx + 1}` : null,
          sessionId: `OE_${oe.code}_${day}_${p}`,
          electiveType: 'OE',
          basket: 'Open Elective'
        };
      });

      grid[day][p] = oeEntries.length === 1 ? oeEntries[0] : oeEntries;
      oePlaced.push({ day, p, entries: oeEntries });
    }
    cohortBookings['Open Elective'] = oePlaced;
  }

  // 4. Discipline Electives & Stream Electives Baskets
  // Group electives strictly by basket — each basket is an independent rotation/choice domain
  const basketMap = new Map();
  (section.electives || []).forEach(e => {
    if (e.basket === 'Open Elective' || e.electiveType === 'OE' || e.code.startsWith('CS-30')) return;
    const bName = e.basket || 'Discipline Elective';
    if (!basketMap.has(bName)) basketMap.set(bName, []);
    basketMap.get(bName).push(e);
  });

  basketMap.forEach((basketSubjects, bName) => {
    // Check if this basket has already been scheduled for this paired cohort
    if (cohortBookings[bName]) {
      cohortBookings[bName].forEach(({ day, p, entries }) => {
        grid[day][p] = entries.length === 1 ? entries[0] : entries;
      });
      return;
    }

    // Only schedule OFFERED subjects (assigned faculty)
    const offered = basketSubjects.filter(s => s.faculty);
    if (offered.length === 0) return; // Do NOT schedule unoffered subjects!

    // Determine periods needed from course data
    const dePeriodsNeeded = Math.max(
      ...offered.map(de => (de.L !== undefined ? (de.L + (de.T || 0)) : (de.credits || 3)))
    );

    // DE: Preferred if feasible across cohort, but flexible if needed
    const prefPeriods = isThirdYear ? [4, 5, 6, 7, 0, 1, 2] : [5, 6, 7, 0, 1, 2, 3];
    let placedCount = 0;
    const days = shuffle([0, 1, 2, 3, 4]);
    const basketPlaced = [];

    for (const day of days) {
      if (placedCount >= dePeriodsNeeded) break;

      for (const p of prefPeriods) {
        if (p === lunchPeriodIdx) continue;
        if (grid[day][p]) continue;

        // Check faculties of all offered subjects in this basket are free
        const allFacsFree = offered.every(s => isAvailable(s.faculty, null, day, p));
        if (!allFacsFree) continue;

        // Check enough distinct theory rooms are free for each parallel offered subject
        const freeRooms = theoryRooms.filter(r => isAvailable(null, r, day, p));
        if (freeRooms.length < offered.length) continue;

        // Schedule all offered subjects in this basket simultaneously
        const sessId = `ELECTIVE_${bName.replace(/\s+/g, '_')}_${day}_${p}`;
        const deEntries = offered.map((s, idx) => {
          const room = freeRooms[idx];
          reserve(s.faculty, room, day, p);
          const typeStr = s.electiveType || s.type || (bName.includes('Stream Core') ? 'SC' : (bName.includes('Stream Elective') ? 'SE' : 'DE'));
          return {
            code: s.code,
            subjectCode: s.code,
            faculty: s.faculty,
            facultyCode: s.faculty,
            room: room,
            isLab: false,
            duration: 1,
            group: offered.length > 1 ? (bName.includes('Discipline') ? `DE-${idx + 1}` : `Choice ${idx + 1}`) : null,
            sessionId: sessId,
            electiveType: typeStr,
            basket: bName
          };
        });

        grid[day][p] = deEntries.length === 1 ? deEntries[0] : deEntries;
        basketPlaced.push({ day, p, entries: deEntries });
        placedCount++;
        break;
      }
    }
    cohortBookings[bName] = basketPlaced;
  });

  cohortElectiveBookings.set(cohortKey, cohortBookings);

  // 5. Normal Theory Subjects (Continuous multi-period support + Same Room constraint + Room Stability Optimization, no G1/G2)
  const defaultPreferred = {
    'CS2': theoryRooms[0] || 'B4',
    'CD2': theoryRooms[1] || 'F4',
    'CS3': theoryRooms[2 % theoryRooms.length] || 'G5',
    'CD3': theoryRooms[3 % theoryRooms.length] || 'S2',
    'CS4': theoryRooms[0] || 'B4',
    'CD4': theoryRooms[1] || 'F4',
    'CD5': 'CSE-III',
    'MT1': 'Seminar Hall - Block A',
    'MA1': 'Conference Hall - Block B'
  };
  const sectionPreferredRoom = defaultPreferred[section.name] || theoryRooms[0];

  function getRoomStabilityScore(day, p, dur, roomNo) {
    let score = 0;

    // 1. Immediate previous consecutive period (p - 1): Absolute Top Soft Priority (+2000)
    if (p > 0 && grid[day][p - 1]) {
      const prevCell = grid[day][p - 1];
      const prevEntry = Array.isArray(prevCell) ? prevCell[0] : prevCell;
      if (prevEntry && prevEntry.room === roomNo) {
        score += 2000;
      }
    }

    // 2. Immediate next consecutive period (p + dur): High Priority (+1000)
    if (p + dur < 8 && grid[day][p + dur]) {
      const nextCell = grid[day][p + dur];
      const nextEntry = Array.isArray(nextCell) ? nextCell[0] : nextCell;
      if (nextEntry && nextEntry.room === roomNo) {
        score += 1000;
      }
    }

    // 3. Pre-lunch / post-lunch continuity (+500 / +400)
    if (p > 1 && p - 1 === lunchPeriodIdx && grid[day][p - 2]) {
      const preLunchCell = grid[day][p - 2];
      const preLunchEntry = Array.isArray(preLunchCell) ? preLunchCell[0] : preLunchCell;
      if (preLunchEntry && preLunchEntry.room === roomNo) {
        score += 500;
      }
    }
    if (p + dur < 7 && p + dur === lunchPeriodIdx && grid[day][p + dur + 1]) {
      const postLunchCell = grid[day][p + dur + 1];
      const postLunchEntry = Array.isArray(postLunchCell) ? postLunchCell[0] : postLunchCell;
      if (postLunchEntry && postLunchEntry.room === roomNo) {
        score += 400;
      }
    }

    // 4. Same day room affinity: prefer rooms already used by this section on this day (+200 per class)
    for (let k = 0; k < 8; k++) {
      if (k >= p && k < p + dur) continue;
      const c = grid[day][k];
      if (c) {
        const entries = Array.isArray(c) ? c : [c];
        if (entries.some(e => e.room === roomNo)) {
          score += 200;
        }
      }
    }

    // 5. Prefer longer continuous room runs: forward lookahead (+80 per consecutive free slot)
    let runLength = 0;
    for (let k = p + dur; k < 8; k++) {
      if (k !== lunchPeriodIdx && !grid[day][k] && isAvailable(null, roomNo, day, k)) {
        runLength++;
      } else {
        break;
      }
    }
    score += runLength * 80;

    // 6. Section's preferred base classroom (+50)
    if (sectionPreferredRoom && roomNo === sectionPreferredRoom) {
      score += 50;
    }

    return score;
  }

  const expandedSubjects = [];
  (section.subjects || []).forEach(sub => {
    if (sub.isNonScheduled) return;
    const count = sub.credits || 3;
    const dur = sub.duration || 1;
    let rem = count;
    if (dur > 1 && rem >= dur) {
      expandedSubjects.push({ ...sub, duration: dur });
      rem -= dur;
    }
    while (rem > 0) {
      expandedSubjects.push({ ...sub, duration: 1 });
      rem -= 1;
    }
  });

  const shuffledSubs = shuffle(expandedSubjects);
  shuffledSubs.forEach(sub => {
    let placed = false;
    const dur = sub.duration || 1;
    const daysByLoad = [0, 1, 2, 3, 4].sort((a, b) => grid[a].filter(Boolean).length - grid[b].filter(Boolean).length);

    // CASE 1: Multi-period continuous lecture session (duration >= 2)
    if (dur >= 2) {
      for (const day of daysByLoad) {
        // Check all possible starting periods p, prioritizing pre-lunch blocks
        const candidateStarts = Array.from({ length: 8 - dur + 1 }, (_, i) => i).sort((a, b) => {
          const isPreA = (a + dur <= lunchPeriodIdx);
          const isPreB = (b + dur <= lunchPeriodIdx);
          if (isPreA && !isPreB) return -1;
          if (!isPreA && isPreB) return 1;
          return a - b;
        });

        for (const p of candidateStarts) {
          let validBlock = true;
          for (let k = p; k < p + dur; k++) {
            if (k === lunchPeriodIdx || grid[day][k]) { validBlock = false; break; }
            const fac = sub.faculty || 'RK';
            if (!isAvailable(fac, null, day, k)) { validBlock = false; break; }
          }
          if (!validBlock) continue;

          const fac = sub.faculty || 'RK';
          // Candidate room must be available across all consecutive periods of the session
          const freeRooms = theoryRooms.filter(r => {
            for (let k = p; k < p + dur; k++) {
              if (!isAvailable(fac, r, day, k)) return false;
            }
            return true;
          });

          // Rank available rooms by stability score to minimize room changes between consecutive classes
          if (freeRooms.length > 0) {
            freeRooms.sort((a, b) => {
              const scoreA = getRoomStabilityScore(day, p, dur, a);
              const scoreB = getRoomStabilityScore(day, p, dur, b);
              return scoreB - scoreA;
            });

            const freeRoom = freeRooms[0];
            const sessId = `${section.name}_${sub.code}_${day}_${p}`;
            for (let k = p; k < p + dur; k++) {
              grid[day][k] = {
                code: sub.code,
                subjectCode: sub.code,
                faculty: fac,
                facultyCode: fac,
                room: freeRoom,
                isLab: false,
                duration: dur,
                group: null,
                sessionId: sessId,
                electiveType: null
              };
              reserve(fac, freeRoom, day, k);
            }
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    } else {
      // CASE 2: Single-period session (duration == 1)
      for (const day of daysByLoad) {
        const alreadyToday = grid[day].some(c => {
          if (!c) return false;
          if (Array.isArray(c)) return c.some(e => e.code === sub.code);
          return c.code === sub.code;
        });
        if (alreadyToday) continue;

        // Order candidate periods on this day: prioritize morning (09:00 -> lunch) over post-lunch, and cluster adjacently within each zone
        const orderedPeriods = Array.from({ length: 8 }, (_, i) => i).sort((pA, pB) => {
          if (pA === lunchPeriodIdx) return 1;
          if (pB === lunchPeriodIdx) return -1;

          const isPreA = pA < lunchPeriodIdx;
          const isPreB = pB < lunchPeriodIdx;
          if (isPreA && !isPreB) return -1;
          if (!isPreA && isPreB) return 1;

          const adjA = (pA > 0 && grid[day][pA - 1] && pA - 1 !== lunchPeriodIdx) ||
                       (pA < 7 && grid[day][pA + 1] && pA + 1 !== lunchPeriodIdx);
          const adjB = (pB > 0 && grid[day][pB - 1] && pB - 1 !== lunchPeriodIdx) ||
                       (pB < 7 && grid[day][pB + 1] && pB + 1 !== lunchPeriodIdx);
          if (adjA && !adjB) return -1;
          if (!adjA && adjB) return 1;
          return pA - pB;
        });

        for (const p of orderedPeriods) {
          if (p === lunchPeriodIdx) continue;
          if (grid[day][p]) continue;

          const fac = sub.faculty || 'RK';
          if (!isAvailable(fac, null, day, p)) continue;

          // SAME ROOM CONSTRAINT: If adjacent period on the same day has the same subject, require the same room
          let chosenRoom = null;
          let requiredSameSubjectRoom = null;
          if (p > 0 && grid[day][p - 1]) {
            const prevCell = grid[day][p - 1];
            const prevEntry = Array.isArray(prevCell) ? prevCell.find(e => e.code === sub.code) : (prevCell.code === sub.code ? prevCell : null);
            if (prevEntry && prevEntry.room) requiredSameSubjectRoom = prevEntry.room;
          } else if (p < 7 && grid[day][p + 1]) {
            const nextCell = grid[day][p + 1];
            const nextEntry = Array.isArray(nextCell) ? nextCell.find(e => e.code === sub.code) : (nextCell.code === sub.code ? nextCell : null);
            if (nextEntry && nextEntry.room) requiredSameSubjectRoom = nextEntry.room;
          }

          if (requiredSameSubjectRoom) {
            if (isAvailable(fac, requiredSameSubjectRoom, day, p)) {
              chosenRoom = requiredSameSubjectRoom;
            } else {
              continue; // Hard constraint: must use same room for same subject
            }
          } else {
            // Soft room-stability optimization across different consecutive classes
            const freeRooms = theoryRooms.filter(r => isAvailable(fac, r, day, p));
            if (freeRooms.length > 0) {
              freeRooms.sort((a, b) => {
                const scoreA = getRoomStabilityScore(day, p, 1, a);
                const scoreB = getRoomStabilityScore(day, p, 1, b);
                return scoreB - scoreA;
              });
              chosenRoom = freeRooms[0];
            }
          }

          if (!chosenRoom) continue;

          grid[day][p] = {
            code: sub.code,
            subjectCode: sub.code,
            faculty: fac,
            facultyCode: fac,
            room: chosenRoom,
            isLab: false,
            duration: 1,
            group: null,
            sessionId: `${section.name}_${sub.code}_${day}_${p}`,
            electiveType: null
          };

          reserve(fac, chosenRoom, day, p);
          placed = true;
          break;
        }
        if (placed) break;
      }

      // Fallback: If non-scheduled days are full, schedule on any available slot strictly enforcing same room if contiguous
      if (!placed) {
        for (let day = 0; day < 5; day++) {
          for (let p = 0; p < 8; p++) {
            if (p === lunchPeriodIdx) continue;
            if (grid[day][p]) continue;

            const fac = sub.faculty || 'RK';
            if (!isAvailable(fac, null, day, p)) continue;

            const freeRooms = theoryRooms.filter(r => isAvailable(fac, r, day, p));
            if (freeRooms.length === 0) continue;

            freeRooms.sort((a, b) => {
              const scoreA = getRoomStabilityScore(day, p, 1, a);
              const scoreB = getRoomStabilityScore(day, p, 1, b);
              return scoreB - scoreA;
            });

            const chosenRoom = freeRooms[0];

            grid[day][p] = {
              code: sub.code,
              subjectCode: sub.code,
              faculty: fac,
              facultyCode: fac,
              room: chosenRoom,
              isLab: false,
              duration: 1,
              group: null,
              sessionId: `${section.name}_${sub.code}_${day}_${p}`,
              electiveType: null
            };

            reserve(fac, chosenRoom, day, p);
            placed = true;
            break;
          }
          if (placed) break;
        }
      }
    }
  });

  persistedGrids.set(secKey, grid);
  return grid;
}

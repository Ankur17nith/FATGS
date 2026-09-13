const { Subject, Lab, Elective } = require('./Subject.js');

class Section {
    constructor(name, year, semester) {
        this.name = name;
        this.year = year;
        this.semester = semester;

        this.labs = [];
        this.subjects = [];
        this.electives = [];
        this.activities = [];

        // Monday to Friday only (No Saturday)
        this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        // Year-specific lunch timings:
        // 2nd Year: Lunch = 13:00 - 14:00 (period 4)
        // 3rd Year: Lunch = 12:00 - 13:00 (period 3)
        // Final Year: Lunch = 13:00 - 14:00 (period 4)
        const isThirdYear = (year && year.includes('3rd')) ||
            (name && (name === 'CS3' || name === 'CD3')) ||
            (semester && (semester.includes('5th') || semester.includes('6th')));

        this.timeIntervals = [
            { start: '09:00', end: '10:00', isLunch: false },
            { start: '10:00', end: '11:00', isLunch: false },
            { start: '11:00', end: '12:00', isLunch: false },
            { start: '12:00', end: '13:00', isLunch: isThirdYear },
            { start: '13:00', end: '14:00', isLunch: !isThirdYear },
            { start: '14:00', end: '15:00', isLunch: false },
            { start: '15:00', end: '16:00', isLunch: false },
            { start: '16:00', end: '17:00', isLunch: false }
        ];

        this.slots = this.days.map(day => 
            this.timeIntervals.map(interval => ({
                day: day,
                time: `${interval.start} - ${interval.end}`,
                isLunch: interval.isLunch,
                booked: false, 
                subject: null,
                faculty: null,
                room: null
            }))
        );
    }
}

module.exports = { Section };
/*
* class will group data
* name year and sem are enough to identify
* list of labs(highest priority)
* list of subjects(med prior)
* list of elective aka options
*/


//the 2d array one is same as previous project

const {Subject,Lab,Elective}=require('./Subject.js');

class Section {
    constructor(name,year,semester) {
        this.name = name;
        this.year = year;
        this.semester = semester;

        this.labs=[];
        this.subjects=[];
        this.electives=[];

        //a place not sure what to do with it
        this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        this.timeIntervals = [
            { start: '09:00', end: '10:00', isLunch: false },
            { start: '10:00', end: '11:00', isLunch: false },
            { start: '11:00', end: '12:00', isLunch: false },
            { start: '12:00', end: '13:00', isLunch: false },
            { start: '13:00', end: '14:00', isLunch: true  },
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
           faculty:null
  }))
);

    }
        
}


module.exports={Section};
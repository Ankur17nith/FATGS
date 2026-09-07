/*
* small classes till how i have not added any functionality
* the json will be read and the subject[] etc all be filled with appropriate
* types later during implementation they can change
* fill lab slots first then class then electives
* labs are diff as they there slots are bigger so fill them first
*/

class Subject{
    constructor(code,name,credit,type="Theory"){
        this.code=code;
        this.name=name;
        this.credit=credit;
        this.type=type;
        this.faculty;
    }
}

class Lab extends Subject{
    constructor(code,name,credit) {
        super(code,name,credit,"Lab");
    }
}

class Elective extends Subject{
    constructor(code,name,credit) {
        super(code,name,credit,"Elective");
    }
}

module.exports = {Subject, Lab, Elective};
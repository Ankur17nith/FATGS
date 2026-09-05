//room parser
const fs=require('fs');
const Room=require('./Room.js');
const {Subject,Lab,Elective}=require('./Subject.js');
const {Section}=require('./Section.js');

function room_parse(room_json){
    const file=fs.readFileSync(room_json);
    const data=JSON.parse(file);
    //data is array of obj from json
    //may need to return a map iam guessing but future
    const rooms = data.map(roomData =>
        new Room(
            roomData.roomNo,
            roomData.labOrClass,
            roomData.building
        )
    );
    return rooms;
}

//returns an array of Section objects that have the appropriate lists updated
function subject_parse(subject_json){
    const file=fs.readFileSync(subject_json);
    const data=JSON.parse(file);

    //assuming json has uniue names of sections or else undefined beh

    let sections=[];
    for(let item of data){
        let curr=new Section(item.name,item.year,item.semester);
        for(let subject of item.subjects){
            for(let i=0;i<subject.credits;i++){
                curr.subjects.push(new Subject(subject.code,subject.name,subject.credits));
            }
        }

        for(let lab of item.labs){
            for(let i=0;i<lab.credits;i++){
                curr.labs.push(new Lab(lab.code,lab.name,lab.credits));
            }
        }

        for(let elective of item.electives){
            for(let i=0;i<elective.credits;i++){
                curr.electives.push(new Elective(elective.code,elective.name,elective.credits));
            }
        }
        sections.push(curr);
    }
    return sections;
}



module.exports = {room_parse,subject_parse};

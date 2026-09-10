class Room{
    constructor(roomno,type,building){
        this.roomno = roomno;// eg"B4"
        this.type = type;// only do types class or lab
        this.building = building;//vvk etc

        //place holder
        this.table= new Map();
    }
    
}

module.exports=Room;
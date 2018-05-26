var FieldObject = function(){
};

FieldObject.prototype = {
    "update": function (process) {
        this.mc.x = Cood.localToWorld(this.position.x);
        this.mc.y = Cood.localToWorld(this.position.y);
    },
    "spawn":function(){
        this.mc.gotoAndStop("spawn");
    },
    "hitTest":function(p){
        return this.position.equals(p);
    },
}
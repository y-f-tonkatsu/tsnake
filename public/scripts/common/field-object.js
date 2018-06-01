var FieldObject = function(stage, pos, id){
    if(stage){
        this.init(stage, pos, id);
    }
};

FieldObject.prototype = {
    "init": function (stage, pos, id) {
        this.stage = stage;
        this.id = id;
        this.position = pos.clone();
        this.mc = cjsUtil.createMc(id);
        this.mc.x = this.position.x;
        this.mc.y = this.position.y;
        stage.addChild(this.mc);
        this.spawn();
    },
    "update": function (process) {
        this.mc.x = Cood.localToWorld(this.position.x);
        this.mc.y = Cood.localToWorld(this.position.y);
    },
    "spawn":function(){
        this.state = "spawn";
        this.mc.gotoAndStop("spawn");

        this.onSpawnEndListener = _.bind(function (e) {
            if (this.mc[this.state].currentFrame == this.mc[this.state].totalFrames - 1) {
                this.mc.gotoAndStop("normal");
                this.mc.removeEventListener("tick", this.onSpawnEndListener);
                this.state = "normal"
            }
        }, this);

        this.mc[this.state].addEventListener("tick", this.onSpawnEndListener);
    },
    "hitTest":function(p){
        if(this.state == "spawn"){
            return false;
        }
        return this.position.equals(p);
    },
    "remove":function(){
        this.mc.stop();
        this.stage.removeChild(this.mc);
        this.mc = null;
        this.state = "removed";
    }
}
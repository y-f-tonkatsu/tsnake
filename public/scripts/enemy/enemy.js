var Enemy = function (stage, pos, mcName) {
    this.position = pos.clone();
    this.mc = cjsUtil.createMc(mcName);
    this.mc.x = this.position.x;
    this.mc.y = this.position.y;
    stage.addChild(this.mc);
    this.spawn();
}

Enemy.prototype = new FieldObject();


Enemy.prototype.spawn = function () {
    this.state = "spawn";
    this.mc.gotoAndStop("spawn");

    this.onSpawnEndListener = _.bind(function (e) {
        console.log(this.mc[this.state].currentFrame);
        if (this.mc[this.state].currentFrame == this.mc[this.state].totalFrames - 1) {
            this.mc.gotoAndStop("normal");
            this.mc.removeEventListener("tick", this.onSpawnEndListener);
        }
    }, this);

    this.mc[this.state].addEventListener("tick", this.onSpawnEndListener);
};

Enemy.prototype.attackedTest = function (p) {
    return false;
};



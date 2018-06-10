var FieldObject;

(function () {

    FieldObject = function (map, pos, id) {
        if (map) {
            this.init(map, pos, id);
        }
    };

    FieldObject.prototype = {
        "init": function (map, pos, id) {
            this.map = map;
            this.id = id;
            this.position = pos.clone();
            this.mc = cjsUtil.createMc(id);
            this.mc.x = this.position.x;
            this.mc.y = this.position.y;
            this.map.addChild(this.mc);
            this.spawn();
        },
        "update": function (process) {
            this.mc.x = Cood.localToWorld(this.position.x);
            this.mc.y = Cood.localToWorld(this.position.y);
        },
        "setState": function (state, endListener) {
            this.state = state;
            this.mc.gotoAndStop(state);
            if (endListener) {
                this.onEndListener = _.bind(function (e) {
                    if (this.mc[this.state].currentFrame == this.mc[this.state].totalFrames - 1) {
                        this.mc.removeEventListener("tick", this.onEndListener);
                        endListener();
                    }
                }, this);
                this.mc[this.state].addEventListener("tick", this.onEndListener);
            }

        },
        "spawn": function () {
            this.setState("spawn", _.bind(function (e) {
                this.setState("normal");
            }, this));
        },
        "hitTest": function (p) {
            if (this.state == "spawn") {
                return false;
            }
            return this.position.equals(p);
        },
        "remove": function () {
            this.mc.stop();
            this.map.removeChild(this.mc);
            this.mc = null;
            this.state = "removed";
        }
    };

})();
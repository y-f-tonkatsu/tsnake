var SnakeBody;

(function () {

    SnakeBody = function (map, position, isHead) {
        this.map = map;
        this.direction = new Vector(0, 0);
        if (isHead) {
            this.mc = cjsUtil.createMc("SnakeHead");
            this.dir(DIRECTION.s.clone());
        } else {
            this.mc = cjsUtil.createMc("SnakeBody");
        }
        this.setState("normal");
        this.mc.body.gotoAndPlay(Math.floor(Math.random() * 60));
        this.map.addChildAt(this.mc, this.map.numChildren);
        this.position = position.clone();
        this.update(new Vector(0, 0));
    };

    SnakeBody.prototype = {
        "setState": function (label) {
            this.state = label;
            this.mc.gotoAndStop(label);
        },
        "die": function (speed) {
            var dieX = Math.random() - 0.5;
            var dieY = (0.5 - Math.abs(dieX)) * (Math.random() > 0.5 ? 1 : -1);
            this.dieDir = new Vector(dieX * speed, dieY * speed);
        },
        "remove": function () {
            this.map.removeChild(this.mc);
            this.mc = null;
        },
        "effect": function () {
        },
        "pos": function (p) {
            this.position.x = p.x;
            this.position.y = p.y;
        },
        "isStopped": function () {
            return this.direction.x == 0 &&
                this.direction.y == 0;
        },
        "setRotation": function (v) {
            _.forEach([this.mc.body, this.mc.bodyVmax, this.mc.bodyVmaxWeak, this.mc.bodyWeak], _.bind(function (b) {
                if (b) {
                    b.rotation = v;
                }
            }, this));
        },
        "dir": function (d) {

            if (d.x == this.direction.x &&
                d.y == this.direction.y) {
                return;
            }

            this.direction.x = d.x;
            this.direction.y = d.y;
            if (d.x == -1) {
                this.setRotation(180);
            } else if (d.x == 1) {
                this.setRotation(0);
            } else {
                if (d.y == 1) {
                    this.setRotation(90);
                } else {
                    this.setRotation(270);
                }
            }
            this.mc.body.gotoAndPlay(Math.floor(Math.random() * 60));
        },
        "update": function (process) {
            this.mc.x = Cood.localToWorld(this.position.x) + process.x;
            this.mc.y = Cood.localToWorld(this.position.y) + process.y;
        },
        "dieUpdate": function () {
            this.mc.x += this.dieDir.x;
            this.mc.y += this.dieDir.y;
        }
    };

})();
var SnakeBody;

(function () {

    SnakeBody = function (map, position, isHead) {
        this.map = map;
        if (isHead) {
            this.mc = cjsUtil.createMc("SnakeHead");
        } else {
            this.mc = cjsUtil.createMc("SnakeBody");
        }
        this.mc.body.gotoAndPlay(Math.floor(Math.random() * 60));
        this.map.addChildAt(this.mc, this.map.numChildren);
        this.position = position.clone();
        this.direction = DIRECTION.s.clone();
    };

    SnakeBody.prototype = {
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
        "dir": function (d) {

            if (d.x == this.direction.x &&
                d.y == this.direction.y) {
                return;
            }

            this.direction.x = d.x;
            this.direction.y = d.y;
            if (d.x == -1) {
                this.mc.body.rotation = 180;
            } else if (d.x == 1) {
                this.mc.body.rotation = 0;
            } else {
                if (d.y == 1) {
                    this.mc.body.rotation = 90;
                } else {
                    this.mc.body.rotation = 270;
                }
            }
            this.mc.body.gotoAndPlay(Math.floor(Math.random() * 60));
        },
        "update": function (process) {
            this.mc.x = Cood.localToWorld(this.position.x) + process.x;
            this.mc.y = Cood.localToWorld(this.position.y) + process.y;
        }
    };

})();
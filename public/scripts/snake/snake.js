var Snake;

(function () {

    Snake = function (stage, position) {
        this.stage = stage;
        this.bodies = [];
        this.addBody(position);
        this.addBody(position);
        this.addBody(position);
        this.addBody(position);
        this.addBody(position);
        this.addBody(position);
        this.direction = DIRECTION.s.clone();
        this.power = 10000;
    };

    Snake.prototype = {
        "POWER_MAX": 100000,
        "addBody": function (v) {
            var b = new SnakeBody(this.stage, v, this.bodies.length == 0);
            this.bodies.push(b);
        },
        "move": function (process) {
            _.forEach(this.bodies, _.bind(function (b) {
                b.update(b.direction.mult(process));
            }, this));
        },
        "powerUp": function (v) {
            this.power += v;
            if(this.power >= this.POWER_MAX){
                this.power = this.POWER_MAX;
            }
        },
        "powerDown": function (v, onDead) {
            this.power -= v;
            if(this.power <= 0){
                onDead();
            }
        },
        "update": function () {

            var prevDir;
            var prevPos;
            var i = 0;
            _.forEach(this.bodies, _.bind(function (b) {
                if (i == 0) {
                    prevDir = b.direction.clone();
                    prevPos = b.position.clone();
                    b.position.add(b.direction);
                    b.dir(this.direction);
                } else {
                    var nextDir = b.direction.clone();
                    var nextPos = b.position.clone();
                    b.dir(prevDir);
                    b.pos(prevPos);
                    prevDir.isCopyOf(nextDir);
                    prevPos.isCopyOf(nextPos);
                }

                while (b.position.x >= Cood.MAX_X) {
                    b.position.x -= Cood.MAX_X
                }
                while (b.position.y >= Cood.MAX_Y) {
                    b.position.y -= Cood.MAX_Y
                }
                while (b.position.x < 0) {
                    b.position.x += Cood.MAX_X
                }
                while (b.position.y < 0) {
                    b.position.y += Cood.MAX_Y
                }

                b.update(new Vector(0, 0));
                i++;
            }, this));

        },
        "hitTest": function () {

            var i = 0;
            var headPos;
            var flag = false;

            _.forEach(this.bodies, _.bind(function (b) {
                if (i == 0) {
                    headPos = b.position;
                } else {
                    if (b.position.equals(headPos)) {
                        flag = true;
                    }
                }
                i++;
            }, this));

            return flag;

        },
        "getHead": function () {
            return this.bodies[0];
        },
        "setDirection": function (d) {
            if (this.getHead().direction.clone().add(d).isZero()) {
                return;
            } else {
                this.direction = d;
            }
        },
    };

})();
var Snake;

(function () {

    Snake = function (map, position, numBody) {
        this.map = map;
        this.bodies = [];
        this.isLocked = false;

        if (!numBody) {
            numBody = 6;
        }
        _.times(6, _.bind(function () {
            this.addBody(position);
        }, this));

        this.direction = DIRECTION.s.clone();
    };

    Snake.prototype = {
        "die": function () {
            _.forEach(this.bodies, _.bind(function (b) {
                b.die(20);
            }, this));
            this.getHead().die(5);
            this.getHead().setState("die");
        },
        "addBody": function (v) {
            if (!v) {
                v = this.bodies[this.bodies.length - 1].position.clone();
            }
            var b = new SnakeBody(this.map, v, this.bodies.length == 0);
            this.bodies.push(b);
        },
        "remove": function () {
            _.forEach(this.bodies, _.bind(function (b) {
                b.remove();
            }, this));
            this.bodies = [];
        },
        "removeBody": function () {
            if(this.bodies.length > 1){
                this.bodies.pop().remove();
            }
        },
        "getState":function(){
            return this.getHead().state;
        },
        "setState":function(state){
            return this.getHead().setState(state);
        },
        "setNormal":function(){
            this.getHead().setState("normal");
        },
        "setWeak":function(){
            this.getHead().setState("weak");
        },
        "startVmax":function(){
            this.getHead().setState("vmax");
        },
        "setVmaxWeak":function(){
            this.getHead().setState("vmax_weak");
        },
        "endVmax":function(){
            this.getHead().setState("normal");
        },
        "move": function (process) {
            _.forEach(this.bodies, _.bind(function (b) {
                b.update(b.direction.mult(process));
            }, this));
        },
        "finish": function () {
            _.forEach(this.bodies, _.bind(function (b) {
                b.position.sub(b.direction);
            }, this));
            this.setDirection(new Vector(0, 0));
            this.isLocked = true;
        },
        "isFinished": function () {
            return _.every(this.bodies, function (b) {
                return b.isStopped();
            });
        },
        "dieUpdate": function (onAnimationFinishedListener) {
            _.forEach(this.bodies, _.bind(function (b) {
                b.dieUpdate();
            }, this));
            const head = this.getHead().mc.bodyDie;
            if(head.currentFrame == head.totalFrames - 1){
                onAnimationFinishedListener();
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
                    prevDir.set(nextDir);
                    prevPos.set(nextPos);
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

                if(!b.direction.isZero()){
                    b.update(new Vector(0, 0));
                }
                i++;
            }, this));

        },
        "selfHitTest": function () {

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
        "pos": function (p) {
            this.position = p;
        },
        "dir": function (d) {
            this.direction = d;
        },
        "setDirection": function (d) {
            if (this.isLocked) {
                return;
            }
            if (this.getHead().direction.clone().add(d).isZero()) {
                return;
            } else {
                this.direction = d;
            }
        },
    };

})();
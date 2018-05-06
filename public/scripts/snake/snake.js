var Snake;

(function () {

    Snake = function (x, y) {
        var head = new SnakeBody(x, y);
        this.bodies = [head];
        this.direction = DIRECTION.s;
    };

    Snake.prototype = {
        "addBody": function (v, isHead) {
            var b = new SnakeBody(v, isHead);
            this.bodies.push(b);
        },
        "update": function () {
            var prev = new Vector(0, 0);
            var next = new Vector(0, 0);
            _.each(this.bodies, function (b) {
                if (b.isHead) {
                    next.isCopyOf(b.position);
                    if (Math.random() > 0.5) {
                        this.direction = DIRECTION.e;
                    } else {
                        this.direction = DIRECTION.s;
                    }
                    b.position.add(this.direction);
                } else {
                    prev.isCopyOf(b.position);
                    b.position.isCopyOf(next);
                    next.isCopyOf(prev);
                }
                while (b.position.x >= Cood.MAX_X) {
                    b.position.x -= Cood.MAX_X
                }
                while (b.position.y >= Cood.MAX_Y) {
                    b.position.y -= Cood.MAX_Y
                }
                b.update();
            });
        }
    };

})();
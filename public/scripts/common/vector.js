var Vector = function (x, y) {
    this.x = x;
    this.y = y;
};

var DIRECTION;

Vector.prototype = {
    "clone": function () {
        return new Vector(this.x, this.y);
    },
    "isCopyOf": function (v) {
        this.x = v.x;
        this.y = v.y;
    },
    "add": function (v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    },
    "sub": function (v) {
        this.x -= v.x;
        this.y -= v.y;
    },
    "mult": function (s) {
        return new Vector(this.x * s, this.y * s);
    },
    "isZero": function () {
        return this.x == 0 && this.y == 0;
    },
    "equals": function (v) {
        return this.x == v.x && this.y == v.y;
    },
};

DIRECTION = {
    "n": new Vector(0, -1),
    "e": new Vector(1, 0),
    "s": new Vector(0, 1),
    "w": new Vector(-1, 0)
};



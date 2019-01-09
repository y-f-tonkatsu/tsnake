var Vector = function (x, y) {
    this.x = x;
    this.y = y;
};

var DIRECTION;

Vector.prototype = {
    "clone": function () {
        return new Vector(this.x, this.y);
    },
    "set": function (v) {
        if (!v) {
            return;
        }
        this.x = v.x;
        this.y = v.y;
    },
    "add": function (v) {
        if (!v) {
            return;
        }
        this.x += v.x;
        this.y += v.y;
        return this;
    },
    "sub": function (v) {
        if (!v) {
            return;
        }
        this.x -= v.x;
        this.y -= v.y;
    },
    "mult": function (v) {
        if (!v) {
            return;
        }
        return new Vector(this.x * v, this.y * v);
    },
    "dist": function (v) {
        if (!v) {
            return;
        }
        return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.x - v.x, 2));
    },
    "sdist": function (v) {
        if (!v) {
            return;
        }
        return Math.abs(this.x - v.x) + Math.abs(this.y - v.y);
    },
    "isZero": function () {
        return (this.x == 0 && this.y == 0) || (isNaN(this.x));
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



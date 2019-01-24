var Enemy;

(function () {

    StartTasks.push(function () {

        var data = {
            "Frog": {
                "dropItemRate": 0.2,
                "score": 2
            },
            "Cancer": {
                "dropItemRate": 0.25,
                "score": 3
            },
            "Hedgehog": {
                "dropItemRate": 0.25,
                "score": 3
            },
            "Mouse": {
                "dropItemRate": 0.1,
                "score": 1
            },
            "Bear": {
                "dropItemRate": 0.5,
                "score": 30
            },
            "Spider": {
                "dropItemRate": 0.3,
                "score": 5
            }
        };

        Enemy = function (map, pos, id) {
            this.init(map, pos, id);
        };

        Enemy.LIMIT = 60;

        Enemy.prototype = new FieldObject();

        Enemy.prototype.attackedTest = function (p) {
            return false;
        };

        Enemy.prototype.isAlive = function () {
            return this.state !== "defeated" &&
                this.state !== "removed";
        }

        Enemy.prototype.getDropItemRate = function () {
            return data[this.id].dropItemRate;
        };

        Enemy.prototype.defeat = function () {

            if (this.state == "removed" ||
                this.state == "defeated") {
                return false;
            }

            playSound("defeat");
            this.setState("defeated", _.bind(function () {
                this.remove();
            }, this));
        };

        Enemy.prototype.setFear = function () {
            if (this.id == "Bear") {
                return;
            }
            if (this.state == "normal") {
                this.setState("fear");
            }
            return false;
        };

        Enemy.prototype.endFear = function () {
            if (this.state == "fear") {
                this.setState("normal");
            }
            return false;
        };

        Enemy.prototype.getScore = function () {
            return data[this.id].score;
        };

        Enemy.prototype.saHitTest = function (p) {
            if (this.state == "spawn") {
                return false;
            }
            if (this.id == "Cancer") {
                return this.position.y == p.y &&
                    Math.abs(this.position.x - p.x) == 1;
            } else if (this.id == "Hedgehog") {
                return this.position.x == p.x &&
                    Math.abs(this.position.y - p.y) == 1;
            } else if (this.id == "Spider") {
                return Math.abs(this.position.x - p.x) <= 1 &&
                    Math.abs(this.position.y - p.y) <= 1;
            } else {
                return false;
            }
        };

    });

})();

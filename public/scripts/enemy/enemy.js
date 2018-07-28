var Enemy;

(function () {

    StartTasks.push(function () {

        var data = {
            "Frog": {
                "dropItemRate": 0.1,
            },
        };

        Enemy = function (map, pos, id) {
            this.init(map, pos, id);
        };

        Enemy.prototype = new FieldObject();

        Enemy.prototype.attackedTest = function (p) {
            return false;
        };

        Enemy.prototype.isAlive = function () {
            return this.state !== "defeated" &&
                this.state !== "removed";
        }

        Enemy.prototype.defeat = function () {
            this.setState("defeated", _.bind(function () {
                this.remove();
            }, this));
            return Math.random() < data[this.id].dropItemRate;
        };

        Enemy.prototype.setFear = function () {
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

    });

})();

var Item;

(function () {

    StartTasks.push(function () {

        var effects = {
            "Gate": function (game, snake) {
                game.nextArea(this);
            },
            "Mage": function (game, snake) {
                game.endGame(this);
            },
            "Key": function (game, snake) {
                game.addKey(this.position.clone());
                playSound("key");
            },
            "Coin": function (game, snake) {
                game.addCoin(this.position.clone());
                playSound("coin");
            },
            "Apple": function (game, snake) {
                game.setVmax(Item.VMAX_DURATION);
                snake.addBody();
                snake.addBody();
                playSound("vmax");
            },
            "Wine": function (game, snake) {
                snake.removeBody();
                playSound("shrink");
            },
            "Berry": function (game, snake) {
                game.speedDown();
                playSound("speed_down");
            },
        };

        Item = function (map, pos, id) {
            this.init(map, pos, id);
            this.life = Item.LIFETIME[id];
        };

        Item.DROP_LIMITS = {
            "Mage": 1,
            "Gate": 1,
            "Key": 1,
            "Coin": 30,
            "Apple": 2,
            "Wine": 2,
            "Berry": 2,
        }

        Item.LIFETIME = {
            "Mage": 0,
            "Gate": 0,
            "Key": 60,
            "Coin": 60,
            "Apple": 60,
            "Wine": 60,
            "Berry": 60,
        }

        Item.prototype = new FieldObject();

        Item.LIMIT = 60;
        Item.VMAX_DURATION = 40;

        Item.prototype.effect = function (game, snake) {
            _.bind(effects[this.id], this)(game, snake);
        };

        Item.prototype.isFinishItem = function () {
            return this.id == "Gate" || this.id == "Mage";
        }

    });


})();

var Item;

(function () {

    StartTasks.push(function () {

        var effects = {
            "Gate": function (game, snake) {
                game.nextArea(this);
            },
            "Key": function (game, snake) {
                game.addKey(this.position.clone());
            },
            "Coin": function (game, snake) {
                game.addCoin(this.position.clone());
            },
            "Apple": function (game, snake) {
                snake.powerUp(200);
                snake.addBody();
            },
            "Wine": function (game, snake) {
                game.setVmax(Item.VMAX_DURATION);
            },
            "Berry": function (game, snake) {
                snake.removeBody();
            },
        };

        Item = function (map, pos, id) {
            this.init(map, pos, id);
        };

        Item.DROP_LIMITS = {
            "Gate": 1,
            "Key": 1,
            "Coin": 30,
            "Apple": 30,
            "Wine": 1,
            "Berry": 15,
        }

        Item.prototype = new FieldObject();

        Item.LIMIT = 60;
        Item.VMAX_DURATION = 30;

        Item.prototype.effect = function (game, snake) {
            _.bind(effects[this.id], this)(game, snake);
        };

    });


})();

var Item;

(function () {

    StartTasks.push(function () {

        var effects = {
            "Key": function (game, snake) {
                game.addKey(this.position.clone());
            },
            "Apple": function (game, snake) {
                snake.powerUp(300);
                snake.addBody();
            },
            "Wine": function (game, snake) {
                game.setVmax(100);
            },
        };

        Item = function (map, pos, id) {
            this.init(map, pos, id);
        };

        Item.prototype = new FieldObject();

        Item.prototype.effect = function (game, snake) {
            _.bind(effects[this.id], this)(game, snake);
        };

    });


})();

var Item;

(function () {

    StartTasks.push(function () {

        var effects = {
            "Key": function (game, snake) {
                game.addKey();
            },
            "Apple": function (game, snake) {
                snake.addBody();
            },
            "Wine": function (game, snake) {
                snake.powerUp(100);
            },
        };

        Item = function (map, pos, id) {
            this.init(map, pos, id);
        };

        Item.prototype = new FieldObject();

        Item.prototype.effect = function (game, snake) {
            effects[this.id](game, snake);
        };

    });


})();

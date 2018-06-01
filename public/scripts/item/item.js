var Item = function (stage, pos, id) {
    this.init(stage, pos, id);
};

(function(){

    var effects = {
        "Key":function(game, snake){
            snake.powerUp(1000);
        },
    };

    Item.prototype = new FieldObject();

    Item.prototype.effect = function (game, snake) {
        effects[this.id](game, snake);
    };

})();

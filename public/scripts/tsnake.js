var cjsUtil;
var stage;

$(function () {

    var snake;
    var tiles = [];

    cjsUtil = new CjsUtil(AdobeAn, "12203EAFB022374BAF15F927FCA8A97A");

    var startGameLoop = function () {
        var i = 0;
        stage = new createjs.Stage($("#canvas--main").get(0));
        _.times(10, function (x) {
            _.times(10, function (y) {
                var tile = cjsUtil.createMc("Tile");
                tiles.push(tile);
                tile.x = x * 60;
                tile.y = y * 60;
                stage.addChild(tile);
            });
        });

        var snake = new Snake(new Vector(0, 0));
        snake.addBody(new Vector(0, 0), true);
        snake.addBody(new Vector(0, 0), false);
        snake.addBody(new Vector(0, 0), false);

        createjs.Ticker.addEventListener("tick", function () {
            snake.update();
            stage.update();
        });
        createjs.Ticker.init();
    };

    cjsUtil.loadImages(startGameLoop);


});
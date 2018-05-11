var Game

(function () {

    const SPEEDS = [0, 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60];

    var backgroundMc;

    Game = function (stage) {

        this.area = 0;

        this.stage = stage;

        this.tiles = [];

        this.speed = 3;
        this.process = 0;

    }

    Game.prototype = {

        "setBg": function () {
            backgroundMc = cjsUtil.createMc("Background");
            backgroundMc.gotoAndStop(this.area);
            this.stage.addChild(backgroundMc);
        },
        "createMap": function (size) {

            var that = this;
            _.times(size.x, function (x) {
                _.times(size.y, function (y) {
                    var tile = cjsUtil.createMc("Tile");
                    that.tiles.push(tile);
                    tile.x = x * 60;
                    tile.y = y * 60;
                    that.stage.addChild(tile);
                });
            });

        },
        "gameLoop": function () {

            if (this.process >= Cood.UNIT) {
                this.process = 0;
                this.snake.update();
                if (this.snake.hitTest()) {
                    console.log("GameOver");
                    this.gameOver();
                }
            } else {
                this.snake.move(this.process);
                this.process += SPEEDS[this.speed];
            }
            this.stage.update();

        },
        "startGameLoop": function () {

            console.log("--start loop--");

            this.setBg();
            this.createMap(new Vector( Cood.MAX_X, Cood.MAX_Y));
            this.snake = new Snake(this.stage, new Vector(1, 1));

            KeyManager.setKeyListeners({
                //W
                "119": _.bind(function () {
                    this.snake.setDirection(DIRECTION.n.clone());
                }, this),
                //A
                "97": _.bind(function () {
                    this.snake.setDirection(DIRECTION.w.clone());
                }, this),
                //S
                "115": _.bind(function () {
                    this.snake.setDirection(DIRECTION.s.clone());
                }, this),
                //D
                "100": _.bind(function () {
                    this.snake.setDirection(DIRECTION.e.clone());
                }, this),
            });

            createjs.Ticker.addEventListener("tick", _.bind(this.gameLoop, this));

            createjs.Ticker.init();
        },
        "gameOver": function () {
            createjs.Ticker.removeAllEventListeners();
        }

    };

})();

var Game

(function () {

    const _SPEEDS = [0, 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60];

    var _rootMc;
    var _backgroundMc;
    var _statusBarMc;
    var _mapMc;

    const _STATUS_BAR_HEIGHT = 60;
    const _NUM_KEYS_MAX = 4;

    Game = function (stage, area, onClearListener, onGameOverListener) {

        this.stage = stage;
        this.area = area;

        this.tiles = [];
        this.enemies = [];
        this.items = [];

        this.time = 0;
        this.speed = 3;
        this.process = 0;
        this.numKeys = 0;

        this.onClearListener = onClearListener;
        this.onGameOverListener = onGameOverListener;

        this.initGame();

    }

    Game.prototype = {
        "kill": function () {
            _rootMc.removeAllChildren();
            this.stage.removeChild(_rootMc);
        },
        "isFree": function (p) {
            var b = true;
            _.each(_.concat(this.enemies, this.items, this.snake.bodies), _.bind(function (obj) {
                if (obj.position.equals(p)) {
                    b = false;
                }
            }, this));
            return b;
        },
        "setBg": function () {
            _backgroundMc = cjsUtil.createMc("Background");
            _backgroundMc.gotoAndStop(this.area);
            _rootMc.addChild(_backgroundMc);

            _statusBarMc = cjsUtil.createMc("StatusBar");
            this.stage.addChild(_statusBarMc);

        },
        "createMap": function (size) {

            _mapMc = new createjs.MovieClip();
            _mapMc.x = 0;
            _mapMc.y = _STATUS_BAR_HEIGHT;
            _rootMc.addChild(_mapMc);

            var that = this;
            _.times(size.x, function (x) {
                _.times(size.y, function (y) {
                    var tile = cjsUtil.createMc("Tile");
                    that.tiles.push(tile);
                    tile.x = x * 60;
                    tile.y = y * 60;
                    _mapMc.addChild(tile);
                });
            });

        },
        "gameLoop": function () {

            this.snake.powerDown(1, _.bind(function () {
                this.gameOver();
            }, this));

            _statusBarMc.powerGauge.scaleX = this.snake.power * 0.0001;
            _statusBarMc.powerGauge.x = 16;

            if (this.process >= Cood.UNIT) {
                this.time++;
                this.speed = Math.min(Math.floor(this.time / 30) + 2, _SPEEDS.length - 1);
                this.process = 0;
                this.snake.update();
                this.spawnEnemy();
                this.spawnItem();
                if (this.snake.hitTest()) {
                    this.gameOver();
                }

                _.forEach(this.enemies, _.bind(function (enemy) {
                    enemy.update();
                    if (enemy.hitTest(this.snake.bodies[0].position)) {
                        this.gameOver();
                    }
                }, this));

                _.forEach(this.items, _.bind(function (item) {
                    item.update();
                    if (item.hitTest(this.snake.bodies[0].position)) {
                        console.log("item hit");
                        item.effect(this, this.snake);
                        item.remove();
                    }
                }, this));

                _.remove(this.items, _.bind(function (item) {
                    return item.state == "removed";
                }, this));

            } else {
                this.snake.move(this.process);
                this.process += _SPEEDS[this.speed];
            }

        },
        "initGame": function () {

            _rootMc = new createjs.MovieClip();
            this.stage.addChild(_rootMc);

            this.setBg();
            this.createMap(new Vector(Cood.MAX_X, Cood.MAX_Y));
            this.snake = new Snake(_mapMc, new Vector(1, 1));
            this.snake.setDirection(DIRECTION.e.clone());

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


        },
        "spawnEnemy": function () {

            if (Math.random() > 0.1) {
                return;
            }

            var x = Math.floor(Math.random() * Cood.MAX_X);
            var y = Math.floor(Math.random() * Cood.MAX_Y);
            var v = new Vector(x, y);

            if (this.isFree(v)) {
                var enemy = new Enemy(_mapMc, v, "Frog");
                this.enemies.push(enemy);
            }

        },
        "spawnItem": function () {

            if (Math.random() > 0.1) {
                return;
            }

            var x = Math.floor(Math.random() * Cood.MAX_X);
            var y = Math.floor(Math.random() * Cood.MAX_Y);
            var v = new Vector(x, y);

            if (this.isFree(v)) {
                var item = new Item(_mapMc, v, "Apple");
                this.items.push(item);
            }

        },
        "addKey": function () {
            this.numKeys++;
            if (this.numKeys >= _NUM_KEYS_MAX) {
                this.clear();
            }
        },
        "clear": function () {
            console.log("clear");
            this.onClearListener();
        },
        "gameOver": function () {
            console.log("GameOver");
            this.onGameOverListener();
        },
    };

})();

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

        this.vmax = 0;

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
            var graphics = new createjs.Graphics();
            _statusBarMc.powerGauge = new createjs.Shape(graphics);
            _statusBarMc.powerGauge.graphics = graphics;
            _statusBarMc.addChild(_statusBarMc.powerGauge);
            _rootMc.addChild(_statusBarMc);

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

            _statusBarMc.powerGauge.graphics.clear().beginFill("#ff0000").dr(16, 16, this.snake.power * 0.1, 40);


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
                    if (enemy.state == "removed") {
                        return;
                    }
                    if (enemy.hitTest(this.snake.bodies[0].position)) {
                        if (this.vmax > 0) {
                            enemy.defeat();
                        } else {
                            this.gameOver();
                        }
                    } else {
                        if (this.vmax > 0) {
                            console.log("!!");
                            console.log(enemy.state);
                            enemy.setFear();
                        } else {
                            enemy.endFear();
                        }
                    }
                    enemy.update();
                }, this));

                _.forEach(this.items, _.bind(function (item) {
                    if (item.state == "removed") {
                        return;
                    }
                    item.update();
                    if (item.hitTest(this.snake.bodies[0].position)) {
                        console.log("item hit");
                        item.effect(this, this.snake);
                        item.remove();
                    }
                }, this));

                _.remove(this.enemies, _.bind(function (obj) {
                    return obj.state == "removed";
                }, this));

                _.remove(this.items, _.bind(function (obj) {
                    return obj.state == "removed";
                }, this));

                this.vmax--;

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
        "spawnItem": function (id) {

            if (Math.random() > 0.3) {
                return;
            }

            var x = Math.floor(Math.random() * Cood.MAX_X);
            var y = Math.floor(Math.random() * Cood.MAX_Y);
            var v = new Vector(x, y);

            if (!this.isFree(v)) {
                return;
            }

            if (Math.random() < 0.5) {
                var item = new Item(_mapMc, v, "Apple");
                this.items.push(item);
            } else if (Math.random() < 0.75) {
                var item = new Item(_mapMc, v, "Key");
                this.items.push(item);
            } else {
                var item = new Item(_mapMc, v, "Wine");
                this.items.push(item);
            }

        },
        "setVmax": function (v) {
            this.vmax = v;
        },
        "endVmax": function () {
            this.vmax = 0;
            _.forEach(this.enemies, _.bind(function (enemy) {
                enemy.endFear();
            }, this));
        },
        "throwItem": function (id, from, to) {
            var mc = cjsUtil.createMc(id);
            mc.gotoAndStop("normal");
            var time = 0.1;
            var speed = new Vector((to.x - from.x) * time, (to.y - from.y) * time);
            mc.x = from.x;
            mc.y = from.y;
            _mapMc.addChild(mc);
            console.log(from.x, from.y, to.x, to.y);
            var listener = _.bind(function(){
                mc.x += speed.x;
                mc.y += speed.y;
                if(Math.abs(mc.x - to.x) < Math.abs(speed.x) &&
                    Math.abs(mc.y - to.y) < Math.abs(speed.y)){
                    this.stage.removeEventListener("tick", listener);
                    _mapMc.removeChild(mc);
                }
            }, this);
            this.stage.addEventListener("tick", listener);
        },
        "addKey": function (pos) {
            this.throwItem("Key", new Vector(
                Cood.localToWorld(pos.x),
                Cood.localToWorld(pos.y)
            ), new Vector(1080, -50));
            this.numKeys++;
            _statusBarMc.keyText.text = this.numKeys;
            if (this.numKeys >= _NUM_KEYS_MAX) {
                this.putGate();
            }
        },
        "putGate": function () {
            spawnItem("Gate");
        },
        "nextArea": function () {
            console.log("clear");
            this.onClearListener();
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

var Game;

(function () {

    const _SPEEDS = [0, 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60];

    var _rootMc;
    var _backgroundMc;
    var _statusBarMc;
    var _mapMc;

    const _STATUS_BAR_HEIGHT = 60;
    const _NUM_KEYS_MAX = 4;

    Game = function (stage, areaNo, onClearListener, onGameOverListener, numCoins) {

        this.numCoins = numCoins;

        this.stage = stage;
        this.areaNo = areaNo;
        this.area = Areas[this.areaNo];

        this.tiles = [];
        this.enemies = [];
        this.items = [];

        this.time = 0;
        this.speed = this.area.initialSpeed;
        this.process = 0;
        this.numKeys = 0;

        this.vmax = 0;

        this.isFinishing = false;
        this.isGameLoopLocked = false;
        this.gate = null;

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
            if (!p) {
                return;
            }
            var b = true;
            _.each(_.concat(this.enemies, this.items, this.snake.bodies), _.bind(function (obj) {
                if (obj.position.equals(p)) {
                    b = false;
                }
            }, this));
            return b;
        },
        "getFreePosition": function () {
            var x, y, v;
            while (!this.isFree(v)) {
                x = Math.floor(Math.random() * Cood.MAX_X);
                y = Math.floor(Math.random() * Cood.MAX_Y);
                v = new Vector(x, y);
            }
            return v;
        },
        "setBg": function () {
            _backgroundMc = cjsUtil.createMc("Background");
            _backgroundMc.gotoAndStop(this.areaNo);
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
        "removeObjects": function () {
            _.remove(this.enemies, _.bind(function (obj) {
                return obj.state == "removed";
            }, this));

            _.remove(this.items, _.bind(function (obj) {
                return obj.state == "removed";
            }, this));
        },
        "updateSpeed": function () {
            this.speed = Math.min(Math.floor(this.time / 120) + this.area.initialSpeed, _SPEEDS.length - 1);
        },
        "updatePower": function () {

            if (this.isFinishing) {
                return;
            }

            this.snake.powerDown(1, _.bind(function () {
                this.gameOver();
            }, this));

            _statusBarMc.powerGauge.graphics.clear().beginFill("#ff0000").dr(16, 16, this.snake.power * 0.1, 40);
        },
        "updateEnemies": function () {

            _.forEach(this.enemies, _.bind(function (enemy) {
                if (enemy.state == "removed") {
                    return;
                }
                if (enemy.hitTest(this.snake.bodies[0].position)) {
                    if (this.vmax > 0) {
                        if (enemy.defeat()) {
                            this.dropItem(enemy.position.clone());
                        }
                    } else {
                        this.gameOver();
                    }
                } else {
                    if (this.vmax > 0) {
                        enemy.setFear();
                    } else {
                        enemy.endFear();
                    }
                }
                enemy.update();
            }, this));

        },
        "updateItems": function () {

            _.forEach(this.items, _.bind(function (item) {
                if (item.state == "removed") {
                    return;
                }
                item.update();
                if (item.hitTest(this.snake.bodies[0].position)) {
                    item.effect(this, this.snake);
                    if (item.id !== "Gate") {
                        item.remove();
                    }
                }
            }, this));

        },
        "updateVmaxState": function () {
            if (this.vmax > 0) {
                this.vmax--;
            }
        },
        "existEnemies": function () {
            return this.enemies.length > 0 &&
                _.some(this.enemies, function (enemy) {
                    return enemy.isAlive();
                });
        },
        "gameLoop": function () {

            if (this.isGameLoopLocked) {
                return;
            }

            this.updatePower();

            if (this.process >= Cood.UNIT) {

                this.process = 0;
                this.snake.update();

                if (this.isFinishing) {

                    if (this.existEnemies()) {
                        _.find(this.enemies, function (enemy) {
                            return enemy.isAlive();
                        }).defeat();
                    } else {
                        if (this.snake.isFinished()) {
                            this.animateGate();
                        }
                    }

                } else {

                    this.time++;

                    this.updateSpeed();
                    if (this.snake.selfHitTest()) {
                        this.gameOver();
                    }
                    this.spawnObjects();
                    this.updateVmaxState();

                }

                this.updateEnemies();
                this.updateItems();
                this.removeObjects();

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

            _statusBarMc.coinText.text = this.numCoins;

        },
        "animateGate": function () {
            console.log("gate anim started");
            this.isGameLoopLocked = true;

            var gatePos = this.gate.position.clone();
            var from = new Vector(
                Cood.localToWorld(gatePos.x),
                Cood.localToWorld(gatePos.y)
            );
            var to = new Vector(Cood.MAX_GX * 0.5, Cood.MAX_GY * 0.5);
            this.gate.remove();

            var mc = cjsUtil.createMc("Gate");
            mc.gotoAndStop("go");
            var time = 0.05;
            var speed = new Vector((to.x - from.x) * time, (to.y - from.y) * time);
            mc.x = from.x;
            mc.y = from.y;
            _mapMc.addChild(mc);
            var listener = _.bind(function () {
                if (Math.abs(mc.x - to.x) < Math.abs(speed.x) &&
                    Math.abs(mc.y - to.y) < Math.abs(speed.y)) {
                    if (mc.go.currentFrame == mc.go.totalFrames - 1) {
                        this.stage.removeEventListener("tick", listener);
                        this.clear();
                    }
                } else {
                    mc.x += speed.x;
                    mc.y += speed.y;
                }
            }, this);
            this.stage.addEventListener("tick", listener);


        },
        "spawnObjects": function () {
            _.forEach(this.area.enemies, _.bind(function (enemy) {
                if (enemy.spawnRate > Math.random()) {
                    this.spawnEnemy(enemy.id);
                }
            }, this));
            _.forEach(this.area.items, _.bind(function (item) {
                if (item.spawnRate > Math.random()) {
                    this.spawnItem(item.id);
                }
            }, this));
        },
        "dropItem": function (from) {
            _.forEach(this.area.dropItems, _.bind(function (item) {
                if (item.dropRate > Math.random()) {
                    var to = this.getFreePosition();
                    this.throwItem(item.id, Cood.localToWorld(from), Cood.localToWorld(to), _.bind(function () {
                        var newItem = new Item(_mapMc, to, item.id, "normal");
                        this.items.push(newItem);
                    }, this));
                }
            }, this));
        },
        "spawnItem": function (id) {
            this.items.push(new Item(_mapMc, this.getFreePosition(), id));
        },
        "spawnEnemy": function (id) {
            var enemy = new Enemy(_mapMc, this.getFreePosition(), id);
            this.enemies.push(enemy);

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
        "throwItem": function (id, from, to, endListener) {
            var mc = cjsUtil.createMc(id);
            mc.gotoAndStop("normal");
            var time = 0.1;
            var speed = new Vector((to.x - from.x) * time, (to.y - from.y) * time);
            mc.x = from.x;
            mc.y = from.y;
            _mapMc.addChild(mc);
            var listener = _.bind(function () {
                mc.x += speed.x;
                mc.y += speed.y;
                if (Math.abs(mc.x - to.x) < Math.abs(speed.x) &&
                    Math.abs(mc.y - to.y) < Math.abs(speed.y)) {
                    endListener();
                    this.stage.removeEventListener("tick", listener);
                    _mapMc.removeChild(mc);
                }
            }, this);
            this.stage.addEventListener("tick", listener);
        },
        "addCoin": function (pos) {
            this.throwItem("Coin", new Vector(
                Cood.localToWorld(pos.x),
                Cood.localToWorld(pos.y)
            ), new Vector(1027, -50), _.bind(function () {
                _statusBarMc.coinText.text = this.numCoins;
            }, this));
            this.numCoins++;
        },
        "addKey": function (pos) {
            this.throwItem("Key", new Vector(
                Cood.localToWorld(pos.x),
                Cood.localToWorld(pos.y)
            ), new Vector(927, -50), function () {
                _statusBarMc.keyText.text = this.numKeys;
            });
            this.numKeys++;
            if (this.numKeys >= _NUM_KEYS_MAX) {
                this.putGate();
            }
        },
        "putGate": function () {
            this.spawnItem("Gate");
        },
        "nextArea": function (gate) {
            if (this.isFinishing) {
                return;
            }
            console.log("next");
            this.gate = gate;
            this.gate.setState("going");
            this.snake.finish();
            this.isFinishing = true;
        },
        "clear": function () {
            console.log("clear");
            this.onClearListener(this.numCoins);
        },
        "gameOver": function () {
            console.log("GameOver");
            this.onGameOverListener();
        },
    };

})();

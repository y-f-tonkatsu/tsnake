var Game;

const _CHEAT_ON = true;

(function () {

    const _SPEEDS = [3, 4, 5, 6, 10, 12, 15, 20];

    var _rootMc;
    var _mapMc;
    var _statusBarMc;

    const _SPEED_UP_PROCESS_MAX = 60;
    const _SPEED_METER_UNIT = 15;
    const _NUM_KEYS_MAX = 4;
    const _SCORE_PER_COIN = 10;

    Game = function (stage, areaNo, onClearListener, onGameOverListener, score) {

        this.score = score;

        this.stage = stage;
        this.areaNo = areaNo;
        this.area = Areas[this.areaNo];

        this.tiles = [];
        this.enemies = [];
        this.items = [];
        this.scorePopUps = [];

        this.time = 0;
        this.totalTime = 0;
        this.speed = this.area.initialSpeed;
        this.speedUpProcess = 0;
        this.process = 0;
        this.numKeys = 0;

        this.vmax = 0;

        this.isFinishing = false;
        this.isDying = false;
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
        "setStatusBar": function () {

            _statusBarMc = cjsUtil.createMc("StatusBar");
            _rootMc.addChild(_statusBarMc);

        },
        "removeObjects": function () {
            _.remove(this.enemies, _.bind(function (obj) {
                return obj.state == "removed";
            }, this));

            _.remove(this.items, _.bind(function (obj) {
                return obj.state == "removed";
            }, this));
        },
        "updateSpeedMeter": function () {
            var targetX = this.speed * _SPEED_METER_UNIT;
            if (this.isVmax() && this.speed < _SPEEDS.length - 1) {
                targetX += _SPEED_METER_UNIT;
            }
            var currentX = _statusBarMc.speedMeter.needle.x;
            if (currentX < targetX) {
                _statusBarMc.speedMeter.needle.x++;
            } else if (currentX > targetX) {
                _statusBarMc.speedMeter.needle.x--;
            }
        },
        "updateSpeed": function () {
            if (this.speedUpProcess >= _SPEED_UP_PROCESS_MAX + this.speed * _SPEED_METER_UNIT) {
                this.speedUpProcess = 0;
                this.speed = Math.min(this.speed + 1, _SPEEDS.length - 1);
                console.log("Speed Up: " + this.speed.toString() + " / " + (_SPEEDS.length - 1).toString());
            }
            this.speedUpProcess++;
        },
        "speedDown": function () {
            this.speedUpProcess = 0;
            this.speed = Math.max(this.speed - 1, this.area.initialSpeed);
        },
        "updateVmaxGauge": function () {

            if (this.isFinishing || this.isDying) {
                return;
            }

            if (this.vmax <= 0) {
                _statusBarMc.vmaxGauge.progress.cover.visible = true;
                _statusBarMc.vmaxGauge.progress.frame.gotoAndStop(0);
            } else {
                _statusBarMc.vmaxGauge.progress.gotoAndStop(Item.VMAX_DURATION - this.vmax);
                _statusBarMc.vmaxGauge.progress.cover.visible = false;
                _statusBarMc.vmaxGauge.progress.frame.play();
            }

        },
        "updateEnemies": function () {

            _.forEach(this.enemies, _.bind(function (enemy) {
                if (enemy.state == "removed" ||
                    enemy.state == "defeated") {
                    return;
                }
                if (enemy.hitTest(this.snake.bodies[0].position)) {
                    if (this.isVmax() &&
                        enemy.id !== "Bear") {
                        this.addScore(enemy.getScore(), enemy.position);
                        if (enemy.defeat()) {
                            this.dropItem(enemy.position.clone());
                        }
                    } else {
                        this.gameOver();
                    }
                } else if (this.isVmax() &&
                    enemy.id == "Mouse" &&
                    enemy.position.sdist(this.snake.bodies[0].position) == 1) {
                    this.addScore(enemy.getScore(), enemy.position);
                    if (enemy.defeat()) {
                        this.dropItem(enemy.position.clone());
                    }
                } else if (enemy.saHitTest(this.snake.bodies[0].position)) {
                    if (this.vmax <= 0) {
                        enemy.setState("sa");
                        this.gameOver();
                    }
                } else {
                    if (this.isVmax()) {
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
                if (this.snake.bodies.length > 0 &&
                    item.hitTest(this.snake.bodies[0].position)) {
                    item.effect(this, this.snake);
                    if (item.id !== "Gate") {
                        item.remove();
                    }
                } else {
                    if (item.id !== "Gate") {
                        if (item.life <= 0) {
                            item.remove();
                        } else {
                            item.life--;
                        }
                    }
                }
            }, this));

        },
        "updateVmaxState": function () {
            if (this.isVmax()) {
                this.vmax--;
                if (this.vmax <= 0) {
                    this.endVmax();
                } else if (this.vmax < 10) {
                    this.snake.setVmaxWeak();
                }
            }
        },
        "existEnemies": function () {
            return this.enemies.length > 0 &&
                _.some(this.enemies, function (enemy) {
                    return enemy.isAlive();
                });
        },
        "killAnEnemy": function () {

            if (!this.existEnemies()) {
                return;
            }

            var enemy = _.find(this.enemies, function (enemy) {
                return enemy.isAlive();
            });
            enemy.defeat();
            this.addScore(enemy.getScore(), enemy.position);

        },
        "isVmax": function () {
            return this.vmax > 0;
        },
        "gameLoop": function () {

            if (this.isDying) {
                this.snake.dieUpdate(_.bind(function () {
                    this.onGameOverAnimationFinished();
                }, this));
                return;
            }

            if (this.isGameLoopLocked) {
                return;
            }

            this.updateVmaxGauge();
            this.updateSpeedMeter();

            if (this.process >= Cood.UNIT) {

                this.process = 0;
                this.snake.update();

                if (this.isFinishing) {

                    if (this.existEnemies()) {
                        this.killAnEnemy();
                    } else {
                        if (this.snake.isFinished()) {
                            this.snake.remove();
                            this.animateGate();
                        }
                    }

                } else {

                    this.time++;
                    this.totalTime++;

                    this.updateSpeed();
                    if (this.snake.selfHitTest()) {
                        this.gameOver();
                    }
                    this.spawnObjects();
                    this.updateVmaxState();

                }

                this.updateItems();
                this.updateEnemies();
                this.removeObjects();

            } else {

                this.snake.move(this.process);
                var currentSpeed = this.speed;
                if (this.isVmax()) {
                    currentSpeed = Math.min(currentSpeed + 1, _SPEEDS.length - 1);
                }
                this.process += _SPEEDS[currentSpeed];

                if (this.isFinishing) {
                    this.killAnEnemy();
                }

            }

        },
        "initGame": function () {

            _rootMc = new createjs.MovieClip();
            this.stage.addChild(_rootMc);
            _mapMc = new createjs.MovieClip();
            _rootMc.addChild(_mapMc);
            _mapMc.y = Cood._STATUS_BAR_HEIGHT;

            this.setStatusBar();
            this.snake = new Snake(_mapMc, new Vector(1, 1));
            this.snake.setDirection(DIRECTION.e.clone());

            this.initKeys();

            _statusBarMc.scoreText.text = this.score;

        },
        "initKeys": function () {

            const gotoN = _.bind(function () {
                this.snake.setDirection(DIRECTION.n.clone());
            }, this);

            const gotoW = _.bind(function () {
                this.snake.setDirection(DIRECTION.w.clone());
            }, this);

            const gotoS = _.bind(function () {
                this.snake.setDirection(DIRECTION.s.clone());
            }, this);

            const gotoE = _.bind(function () {
                this.snake.setDirection(DIRECTION.e.clone());
            }, this);
            KeyManager.setKeyListeners({
                //W, up
                "87": gotoN,
                "38": gotoN,
                //A, left
                "65": gotoW,
                "37": gotoW,
                //S, down
                "83": gotoS,
                "40": gotoS,
                //D, right
                "68": gotoE,
                "39": gotoE,
            });

            $("#controller__button--up").click(function () {
                KeyManager.listeners["87"]();
            });

            $("#controller__button--left").click(function () {
                KeyManager.listeners["65"]();
            });

            $("#controller__button--down").click(function () {
                KeyManager.listeners["83"]();
            });

            $("#controller__button--right").click(function () {
                KeyManager.listeners["68"]();
            });

            if (_CHEAT_ON) {
                KeyManager.setKeyListeners({
                    //q
                    "113": _.bind(function () {
                        this.addKey(new Vector(0, 0));
                    }, this),
                });
            }

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
            var tickListener = _.bind(function () {
                mc.go.areaTitle.gotoAndStop("area_" + (this.areaNo + 1));
            }, this);
            mc.addEventListener("tick", tickListener);
            var time = 0.05;
            var speed = new Vector((to.x - from.x) * time, (to.y - from.y) * time);
            mc.x = from.x;
            mc.y = from.y;
            _mapMc.addChild(mc);
            console.log("from:");
            console.log(from);
            console.log("to:");
            console.log(to);
            var listener = _.bind(function () {
                if (Math.abs(mc.x - to.x) <= Math.abs(speed.x) &&
                    Math.abs(mc.y - to.y) <= Math.abs(speed.y)) {
                    if (mc.go.currentFrame == mc.go.totalFrames - 1) {
                        this.stage.removeEventListener("tick", listener);
                        mc.removeEventListener("tick", tickListener);
                        this.clear();
                    }
                } else {
                    mc.x += speed.x;
                    mc.y += speed.y;
                }
            }, this);
            this.stage.addEventListener("tick", listener);


        },
        "getNumAllEnemies": function () {

            var n = 0;
            _.forEach(this.enemies, _.bind(function (enemy) {
                if (enemy.state !== "removed") {
                    n++;
                }
            }, this));

            return n;
        },
        "getNumAllItems": function () {

            var n = 0;
            _.forEach(this.items, _.bind(function (item) {
                if (item.state !== "removed") {
                    n++;
                }
            }, this));

            return n;
        },
        "getNumItems": function (id) {

            var n = 0;
            _.forEach(this.items, _.bind(function (item) {
                if (item.state == "removed") {
                    return;
                }
                if (item.id == id) {
                    n++;
                }
            }, this));

            return n;
        },
        "spawnObjects": function () {
            _.forEach(this.area.enemies, _.bind(function (enemy) {
                if (enemy.spawnRate > Math.random()) {
                    this.spawnEnemy(enemy.id);
                }
            }, this));
            _.forEach(this.area.comp, _.bind(function (compTime) {
                if (compTime == this.totalTime) {
                    console.log("comp");
                    if (this.getNumItems("Apple") < 1) {
                        this.spawnItem("Apple");
                    }
                    this.items.push(new Item(_mapMc, new Vector(0, 0), "Apple"));
                    this.enemies.push(new Enemy(_mapMc, new Vector(1, 0), "Cancer"));
                }
            }, this));
            _.forEach(this.area.items, _.bind(function (item) {
                if (item.spawnRate > Math.random()) {
                    if (this.getNumItems(item.id) < Item.DROP_LIMITS[item.id]) {
                        if (item.id == "Berry" &&
                            this.speed < this.area.initialSpeed + 2) {
                            return;
                        }
                        this.spawnItem(item.id);
                    }
                }
            }, this));

        },
        "dropItem": function (from) {
            if (this.getNumAllItems() >= Item.LIMIT) {
                return;
            }
            _.forEach(this.area.dropItems, _.bind(function (item) {
                if (!this.hasItemSpace(item.id)) {
                    return;
                }
                if (item.id == "Key" && this.getNumItems("Gate") >= 1) {
                    return;
                }
                if (item.dropRate > Math.random()) {
                    var to = this.getFreePosition();
                    this.throwItem(item.id, Cood.localToWorld(from), Cood.localToWorld(to), _.bind(function () {
                        var newItem = new Item(_mapMc, to, item.id, "normal");
                        this.items.push(newItem);
                    }, this));
                }
            }, this));
        },
        "hasItemSpace": function (id) {
            return this.getNumAllItems() < Item.LIMIT &&
                this.getNumItems(id) < Item.DROP_LIMITS[id];
        },
        "spawnItem": function (id) {
            if (!this.hasItemSpace(id)) {
                return;
            }
            this.items.push(new Item(_mapMc, this.getFreePosition(), id));
        },
        "spawnEnemy": function (id) {
            if (this.getNumAllEnemies() >= Enemy.LIMIT) {
                return;
            }
            var enemy = new Enemy(_mapMc, this.getFreePosition(), id);
            this.enemies.push(enemy);

        },
        "setVmax": function (v) {
            this.vmax = v;
            this.snake.startVmax();
        },
        "endVmax": function () {
            this.vmax = 0;
            _.forEach(this.enemies, _.bind(function (enemy) {
                enemy.endFear();
            }, this));
            this.snake.endVmax();
        },
        "throwItem": function (id, from, to, endListener) {
            var mc = cjsUtil.createMc(id);
            mc.gotoAndStop("normal");
            var time = Math.min(0.00001 * (20000 - to.sdist(from)), 0.1);
            var speed = new Vector((to.x - from.x) * time, (to.y - from.y) * time);
            mc.x = from.x;
            mc.y = from.y;
            _mapMc.addChild(mc);
            var listener = _.bind(function () {
                mc.x += speed.x;
                mc.y += speed.y;
                if (Math.abs(mc.x - to.x) <= Math.abs(speed.x) &&
                    Math.abs(mc.y - to.y) <= Math.abs(speed.y)) {
                    endListener();
                    this.stage.removeEventListener("tick", listener);
                    _mapMc.removeChild(mc);
                }
            }, this);
            this.stage.addEventListener("tick", listener);
        },
        "addCoin": function (pos) {
            const _POS_SCORE_TEXT = new Vector(1060, -50);
            this.throwItem("Coin", new Vector(
                Cood.localToWorld(pos.x),
                Cood.localToWorld(pos.y)
            ), _POS_SCORE_TEXT, _.bind(function () {
                this.addScore(_SCORE_PER_COIN, pos);
            }, this));
        },
        "addScore": function (v, pos) {
            if (pos) {
                var score = new Score(this.stage, v, pos, _.bind(function () {
                    this.scorePopUps.pop();
                }, this));
                this.scorePopUps.push(score);
            }
            this.score += v;
            _statusBarMc.scoreText.text = this.score;
        },
        "addKey": function (pos) {
            this.throwItem("Key", new Vector(
                Cood.localToWorld(pos.x),
                Cood.localToWorld(pos.y)
            ), new Vector(927, -50), _.bind(function () {
                _statusBarMc.keyText.text = this.numKeys;
            }, this));
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
            this.onClearListener(this.score);
        },
        "gameOver": function () {
            console.log("GameOver");
            this.isGameLoopLocked = true;
            this.isDying = true;
            this.snake.die();
        },
        "onGameOverAnimationFinished": function () {
            this.onGameOverListener(this.score);
        },
    };

})();

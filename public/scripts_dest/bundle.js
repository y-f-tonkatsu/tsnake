var Game;

const _CHEAT_ON = true;

(function () {

    const _SPEEDS = [0, 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60];

    var _rootMc;
    var _backgroundMc;
    var _statusBarMc;
    var _mapMc;

    const _TIME_FOR_SPEED_UP = 120;
    const _STATUS_BAR_HEIGHT = 60;
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

        this.time = 0;
        this.totalTime = 0;
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
            this.speed = Math.min(Math.floor(this.time / _TIME_FOR_SPEED_UP) + this.area.initialSpeed, _SPEEDS.length - 1);
        },
        "speedDown": function () {
            this.time = Math.min(this.time - (this.time % _TIME_FOR_SPEED_UP) - _TIME_FOR_SPEED_UP, this.area.initialSpeed);
        },
        "updateVmaxGauge": function () {

            if (this.isFinishing) {
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
                if (enemy.state == "removed") {
                    return;
                }
                if (enemy.hitTest(this.snake.bodies[0].position)) {
                    if (this.vmax > 0 &&
                        enemy.id !== "Bear") {
                        this.addScore(enemy.getScore());
                        if (enemy.defeat()) {
                            this.dropItem(enemy.position.clone());
                        }
                    } else {
                        this.gameOver();
                    }
                } else if (enemy.saHitTest(this.snake.bodies[0].position)) {
                    if (this.vmax <= 0) {
                        enemy.setState("sa");
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
                if (this.snake.bodies.length > 0 &&
                    item.hitTest(this.snake.bodies[0].position)) {
                    item.effect(this, this.snake);
                    if (item.id !== "Gate") {
                        item.remove();
                    }
                } else {
                    if(item.id !== "Gate"){
                        if(item.life <= 0){
                            item.remove();
                        } else {
                            item.life--;
                        }
                    }
                }
            }, this));

        },
        "updateVmaxState": function () {
            if (this.vmax > 0) {
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
            this.addScore(enemy.getScore());

        },
        "gameLoop": function () {

            if (this.isGameLoopLocked) {
                return;
            }

            this.updateVmaxGauge();

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

                this.updateEnemies();
                this.updateItems();
                this.removeObjects();

            } else {

                this.snake.move(this.process);
                var currentSpeed = this.speed;
                if (this.vmax > 0) {
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

            if (_CHEAT_ON) {
                KeyManager.setKeyListeners({
                    //q
                    "113": _.bind(function () {
                        this.addKey(new Vector(0, 0));
                    }, this),
                });
            }

            _statusBarMc.scoreText.text = this.score;

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
            _.forEach(this.area.comp, _.bind(function(compTime){
                if(compTime == this.totalTime){
                    console.log("comp");
                    this.spawnItem("Apple");
                }
            }, this));
            _.forEach(this.area.items, _.bind(function (item) {
                if (item.spawnRate > Math.random()) {
                    this.spawnItem(item.id);
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
                this.addScore(_SCORE_PER_COIN);
            }, this));
        },
        "addScore": function (v) {
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
            this.onGameOverListener();
        },
    };

})();

var cjsUtil;
var stage;
var tSnake;
var StartTasks = [];

$(function () {

    cjsUtil = new CjsUtil(AdobeAn, "12203EAFB022374BAF15F927FCA8A97A");

    cjsUtil.loadImages(function () {
        tSnake = new TSnake();
    });

    _.forEach(StartTasks, function(task){
        task();
    });

});
var TSnake;

(function () {

    var _tasks = [];

    TSnake = function () {

        this.stage = new createjs.Stage($("#canvas--main").get(0));
        this.stage.enableMouseOver();

        createjs.Ticker.init();
        createjs.Ticker.addEventListener("tick", _.bind(this.mainLoop, this));

        this.area = 0;
        this.score = 0;

        this.setMainTitle();
    }

    TSnake.prototype = {
        "mainLoop": function () {
            _.each(_tasks, _.bind(function (task) {
                task();
            }, this));
            this.stage.update();
        },
        "addTask": function (task) {
            _tasks.push(_.bind(task, this));
        },
        "clearTasks": function () {
            _tasks = [];
        },
        "setMainTitle": function () {

            this.clearTasks();

            var mainTitleMc = cjsUtil.createMc("MainTitle");
            this.stage.addChild(mainTitleMc);

            var mainTitleEndListener = _.bind(function () {
                if (mainTitleMc.currentFrame == mainTitleMc.totalFrames - 1) {
                    this.stage.removeEventListener("tick", mainTitleEndListener);
                    this.stage.removeChild(mainTitleMc);
                    this.setAreaTitle();
                }
            }, this);

            var startButtonClickListener = _.bind(function () {
                mainTitleMc.startButton.removeEventListener("click", startButtonClickListener);
                mainTitleMc.gotoAndPlay("toArea");
                this.stage.addEventListener("tick", mainTitleEndListener);
            }, this);

            var onMainTitleStopListener = _.bind(function () {
                if (mainTitleMc.currentLabel == "waitToStart") {
                    mainTitleMc.removeEventListener("tick", onMainTitleStopListener);
                    mainTitleMc.stop();
                    mainTitleMc.startButton.addEventListener("click", startButtonClickListener);
                    mainTitleMc.startButton.cursor = "pointer";
                }
            }, this);

            mainTitleMc.addEventListener("tick", onMainTitleStopListener);

        },
        "setAreaTitle": function () {

            this.clearTasks();

            var areaTitleMc = cjsUtil.createMc("Area_" + (parseInt(this.area) + 1));
            this.stage.addChild(areaTitleMc);
            var areaTitleEndListener = _.bind(function () {
                if (areaTitleMc.currentFrame == areaTitleMc.totalFrames - 1) {
                    this.stage.removeEventListener("tick", areaTitleEndListener);
                    this.stage.removeChild(areaTitleMc);
                    this.createGame();
                }
            }, this);

            var goButtonClickListener = _.bind(function () {
                areaTitleMc.removeEventListener("tick", onAreaTitleStopListener);
                areaTitleMc.goButton.removeEventListener("click", goButtonClickListener);
                areaTitleMc.gotoAndPlay("waitToGo");
                this.stage.addEventListener("tick", areaTitleEndListener);
            }, this);


            var onAreaTitleStopListener = _.bind(function () {
                if (areaTitleMc.currentLabel == "waitToGo") {
                    areaTitleMc.removeEventListener("tick", onAreaTitleStopListener);
                    areaTitleMc.stop();
                } else if (areaTitleMc.currentLabel == "goButtonReady") {
                    areaTitleMc.goButton.addEventListener("click", goButtonClickListener);
                    areaTitleMc.goButton.cursor = "pointer";
                }
            }, this);

            areaTitleMc.addEventListener("tick", onAreaTitleStopListener);

        },
        "resetGame": function () {
            this.game.kill();
            this.clearTasks();
            this.area = 0;
            this.score = 0;
        },
        "createGame": function () {

            this.clearTasks();

            this.game = new Game(this.stage, this.area,
                //onClearListener
                _.bind(function (score) {
                    this.clearTasks();
                    this.area++;
                    this.score += score;
                    this.setAreaTitle(this.area);
                    this.game.kill();
                }, this),
                //onGameOverListener
                _.bind(function () {
                    this.resetGame();
                    this.setMainTitle();
                }, this), this.score);

            this.addTask(_.bind(this.game.gameLoop, this.game));

        }
    };

})();
var Areas;

(function () {

    Areas = [
        //1
        {
            "comp":[20, 60, 110, 180, 270, 450, 600],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.03,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.003,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.1,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.5,
                },
                {
                    "id": "Key",
                    "dropRate": 0.8,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.3,
                },
            ],
            "initialSpeed": 4
        },

        //2
        {
            "comp":[30, 70, 140, 220, 320, 460],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.02,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.003,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.1,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.5,
                },
                {
                    "id": "Key",
                    "dropRate": 0.7,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.8,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.2,
                }
            ],
            "initialSpeed": 4
        },

        //3
        {
            "comp":[30, 70, 150, 230, 340],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.02,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.003,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.1,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.5,
                },
                {
                    "id": "Key",
                    "dropRate": 0.7,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.8,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.2,
                }
            ],
            "initialSpeed": 4
        },

        //4
        {
            "comp":[30, 80, 180, 300, 500],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.02,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.003,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.1,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.5,
                },
                {
                    "id": "Key",
                    "dropRate": 0.7,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.8,
                },
                {
                    "id": "Mouse",
                    "spawnRate": 0.5,
                },
            ],
            "initialSpeed": 4
        },

        //5
        {
            "comp":[40, 100, 200, 400],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.01,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.001,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.1,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.5,
                },
                {
                    "id": "Key",
                    "dropRate": 0.6,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.8,
                },
                {
                    "id": "Mouse",
                    "spawnRate": 0.4,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.2,
                }
            ],
            "initialSpeed": 4
        },

        //6
        {
            "comp":[40, 100, 200, 400],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.01,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.001,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.1,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.5,
                },
                {
                    "id": "Key",
                    "dropRate": 0.5,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.8,
                },
                {
                    "id": "Bear",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.3,
                }
            ],
            "initialSpeed": 4
        },

        //7
        {
            "comp":[40, 100, 200, 400],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.01,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.001,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.1,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.5,
                },
                {
                    "id": "Key",
                    "dropRate": 0.5,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.8,
                },
                {
                    "id": "Spider",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Bear",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.3,
                }
            ],
            "initialSpeed": 4
        },

        //8
        {
            "comp":[50, 120, 240, 460],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.01,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.001,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.1,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.5,
                },
                {
                    "id": "Key",
                    "dropRate": 0.4,
                }
            ],
            "enemies": [
                {
                    "id": "Mouse",
                    "spawnRate": 0.4,
                },
                {
                    "id": "Spider",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Bear",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.3,
                }
            ],
            "initialSpeed": 4
        },
    ];

})();
(function (cjs, an) {

var p; // shortcut to reference prototypes
var lib={};var ss={};var img={};
lib.ssMetadata = [];


// symbols:



(lib.T = function() {
	this.initialize(img.T);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,720,720);


(lib.tunnel_0001 = function() {
	this.initialize(img.tunnel_0001);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,1920,1080);


(lib.tunnel_0002 = function() {
	this.initialize(img.tunnel_0002);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,1920,1080);


(lib.tunnel_0003 = function() {
	this.initialize(img.tunnel_0003);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,1920,1080);


(lib.wasd = function() {
	this.initialize(img.wasd);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,120,72);


(lib.yfts = function() {
	this.initialize(img.yfts);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,778,338);// helper functions:

function mc_symbol_clone() {
	var clone = this._cloneProps(new this.constructor(this.mode, this.startPosition, this.loop));
	clone.gotoAndStop(this.currentFrame);
	clone.paused = this.paused;
	clone.framerate = this.framerate;
	return clone;
}

function getMCSymbolPrototype(symbol, nominalBounds, frameBounds) {
	var prototype = cjs.extend(symbol, cjs.MovieClip);
	prototype.clone = mc_symbol_clone;
	prototype.nominalBounds = nominalBounds;
	prototype.frameBounds = frameBounds;
	return prototype;
	}


(lib.Tile = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#FF9900").ss(0.1,1,1).p("AEEELIoWANAEakAQgFD7AID6Aj6kOIH1gJAkcECIAPny");
	this.shape.setTransform(29.775,29.5375);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

	// レイヤー_1
	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f().s("#FF9900").ss(0.1,1,1).p("Aj6kXIHuAGAkcD/IAGn4AEVkDIAIH1AD/EQIoRAI");
	this.shape_1.setTransform(30.2625,29.875);

	this.timeline.addTween(cjs.Tween.get(this.shape_1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0.3,0.6,59.5,58.3);


(lib.Text_new_enemy = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF9900").s().p("AHDEzQgJgIgBgNIAAoDIgCAAQgKAAgIgKQgIgKAAgNQAAgNAHgKQAIgJALgBIGdgFQAMAAAHAJQAIAJAAAOQAAAPgHAJQgHAJgMAAIlZAGIAAC7IEYgEQAMABAIAIQAHAJABAPQgBANgGAKQgHAJgLAAIkbAEIAADIIFZgCQAMAAAHAJQAHAJABAOQgBAPgHAJQgHAJgLAAIlaACQgBANgJAGQgJAIgPAAQgOAAgJgIgAq1EzQgJgIAAgNIAAoDIgCAAQgLAAgIgKQgIgKAAgNQAAgNAIgKQAIgJAKgBIGegFQAMAAAHAJQAHAJABAOQgBAPgHAJQgHAJgLAAIlaAGIAAC7IEZgEQAMABAIAIQAHAJAAAPQAAANgGAKQgHAJgLAAIkcAEIAADIIFagCQALAAAIAJQAHAJAAAOQAAAPgHAJQgHAJgMAAIlaACQgBANgJAGQgJAIgOAAQgPAAgJgIgEgl8AEzQgJgIAAgNIAAoDIgCAAQgLAAgIgKQgIgKAAgNQAAgNAIgKQAIgJAKgBIGegFQAMAAAHAJQAHAJABAOQgBAPgHAJQgHAJgLAAIlaAGIAAC7IEZgEQAMABAIAIQAHAJAAAPQAAANgGAKQgHAJgLAAIkcAEIAADIIFagCQALAAAIAJQAHAJAAAOQAAAPgHAJQgHAJgMAAIlaACQgBANgJAGQgJAIgOAAQgPAAgJgIgA2yEsQgJgFgFgLIgDgIIgGgWIgZhRIgdhWIgchSIgZhEQgmBhgdBVQgdBVgTBAQgFATgJAJQgKAJgNABQgKgBgKgGQgJgHgFgMIgCgFIgHgVIgQg4IgghrIgqiKIgcheIgWhDIgUg7IgCgHIgBgGQABgMAKgJQAKgKAOgBQAKABAHAEQAIAFAEAJIAPArIAWBGIAgBtIAvCgIAbBZIAPgzQAIgaALgfIAbhJIAmhiIAGgRIAFgNIAIgUIgPgiIgGgRIgBgJQAAgPAKgJQAKgKAPAAQAIAAAGACQAGADAEAFIAEAIIAHASIAGAPIAGAOIARAuIAZBIIAdBTIAcBQIAVA9QAIgqAPhAIAiiHIAniUIALgtIAFgQQADgNAIgGQAJgHAMAAQAOABAJAJQAKAJAAANIgCALIgGAYIgeBtIgfB2IgdBzIgZBlIgRBKQgDASgJAJQgJAJgOAAQgKAAgJgGgAdSEmQgKgIAAgOIAAkRQg+hCg9g/Qg9g/g4g2IgIgKQgCgEAAgGQABgPAKgLQALgLAPAAQAGAAAFADQAEACAHAHQApAmAuAwQAvAvA7A/IAhAiIBGhRIBJhVIA+hLQAEgFAFgCQAFgDAHAAQAPABALALQALAKAAAOIgBAHIgDAGIgDAEIgTAWIgxA6IhgBxIg9BEIAAEPQAAAOgJAIQgJAJgPAAQgOAAgJgJgAiYEqQgIgFgCgGIgFgLIAAgEIALoPIgIgJIgDgHIgBgJQAAgOAJgJQAKgJAQAAQAJgBAGAFQAGAEALAOQBFBZBRB2QBTBzBjCVIAAnQQAAgNAJgJQAJgIAPgBQAOABAJAIQAJAJABANIAAIVQgBAWgLANQgLANgUgBQgKABgJgFQgKgEgGgIIgEgGIgMgTIh1irIhgiKQgsg/gmg1IgBBaIgEDwQgBBXgCAYQgBAOgJAIQgKAJgOAAQgJgBgJgEgEgvXAEqQgIgFgDgGIgFgLIABgEIAKoPIgHgJIgEgHIgBgJQABgOAJgJQAJgJAQAAQAKgBAGAFQAGAEALAOQBEBZBTB2QBSBzBjCVIAAnQQABgNAJgJQAJgIAOgBQAPABAJAIQAJAJAAANIAAIVQAAAWgLANQgMANgTgBQgKABgKgFQgJgEgGgIIgFgGIgMgTIh0irIhhiKQgsg/gng1IgBBaIgDDwQgCBXgBAYQgBAOgKAIQgKAJgNAAQgJgBgJgEgAXfEnQgJgIgCgKIgEgsIgEhSIgDhqIgDhtIgChjIgwBPQgWAjgXAkIg1BPIhIBpQgFAJgGADQgGADgJAAQgOgBgLgJQgKgKAAgPIABgIIAEgIIAPgVIg6haIg3hTIg/hfIgBBhIgBBhIgBBCIgBAvIgBAsIgCAyIgBAXQAAAPgJAIQgKAJgPAAQgPAAgJgKQgIgKAAgQIABgXIACg0IAChOIADhfIABhgIAChVIAAhTIgKgPIgCgGIgBgGQAAgQAKgKQAKgKAQAAQAHAAAGACQAGADADAFIAEAFIALARIAbApIAzBMIBUB/IAFAHIAOAYIAnA8QA2hKA2hVQA3hUA0hZQAAgTAJgLQAIgKAQAAQAMAAAIAGQAJAFAEAJIACAGIABALIAAAYIgBAhIABB9IADBzIADBjIAFBHIAEAsIABAcQAAATgJALQgJAJgQABQgMgBgJgGgEAqXAEPQgRgRAAgZQAAgZASgRQARgRAYgBQAZABASASQARAQAAAZQAAAZgRARQgSARgZABQgYgBgSgRgEAi1AEPQgRgRgBgZQABgZARgRQARgRAZgBQAZABARASQARAQABAZQgBAZgRARQgRARgZABQgZgBgRgRgEAr1ABkQgIgKAAgMIABgIIAFgLIAMgZIBljIQAphRATghQAGgMAIgFQAJgGAKAAQAQABALALQAMALABAOQAAAGgDAHIgNAZIgTAhIgTAgIgaAwIgrBOIhDB6QgHAMgIAHQgIAFgKAAQgMAAgJgJgEAkTABkQgIgKgBgMIABgIIAFgLIAMgZIBmjIQAphRATghQAFgMAJgFQAIgGALAAQAPABAMALQAMALAAAOQABAGgDAHIgOAZIgTAhIgSAgIgbAwIgqBOIhEB6QgHAMgIAHQgIAFgJAAQgNAAgIgJg");
	this.shape.setTransform(312.9786,65.4);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(8.1,33.9,609.8,63.00000000000001);


(lib.x = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#660000").s().p("AA6BUIgFgFIgJgLIgRgVIgIgKIgTgXIgPAUIgMAQIgMAOIgJAKIgHAJIgDACQAAAAgBAAQAAABgBAAQAAAAAAAAQgBAAAAAAQgEgBgDgDQgDgCgBgFIABgDIAFgGIAQgSIACgDIARgUIATgZIgRgVIgTgWIgDgDIgTgYIgCgBIAAgDQAAgEADgDQADgDAEAAQABAAAAAAQABAAABAAQAAAAAAAAQABABAAAAIAGAGIAEAGIARAUIAWAaIAJAKIAMgTIAQgWIARgZIADgDIAEgBQAEAAADADQADADAAAEIgBACIgCAEIgNATIgIANIgJALIgMARIgGAJIAlAsIAMAOIALANIACACIAAADQAAAEgDADQgCADgFAAIgFgCg");
	this.shape.setTransform(7.325,8.6);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,14.7,17.2);


(lib.Frame = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#3399CC").ss(6,1,1).p("AvniVIfPAAIAAErI/PAAg");
	this.shape.setTransform(100,15);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f().s("#3399FF").ss(8,1,1).p("AvniVIfPAAIAAErI/PAAg");
	this.shape_1.setTransform(100,15);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape}]}).to({state:[{t:this.shape_1}]},2).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4,-4,208,38);


(lib.cover = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFFFCC").s().p("AvnCWIAAkrIfPAAIAAErg");
	this.shape.setTransform(100,15);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = getMCSymbolPrototype(lib.cover, new cjs.Rectangle(0,0,200,30), null);


(lib.Eye_weak = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AAMgVIgXAr");
	this.shape.setTransform(-2.75,-0.975);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#333333").s().p("AgKALQgFgFABgGQgBgFAFgFQAFgFAFABQAGgBAFAFQAFAFgBAFQABAGgFAFQgFAFgGgBQgFABgFgFg");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.9,-4.2,6.5,6.5);


(lib.Eye_vmax_weak = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AgEgeIAJA9");
	this.shape.setTransform(-3.425,-0.075);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#333333").s().p("AgKALQgFgFABgGQgBgFAFgFQAFgFAFABQAGgBAFAFQAFAFgBAFQABAGgFAFQgFAFgGgBQgFABgFgFg");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.9,-4.2,6.5,8.3);


(lib.Eye_vmax = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AgOgaIAeA1");
	this.shape.setTransform(-4.45,0.325);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#333333").s().p("AgKALQgFgFABgGQgBgFAFgFQAFgFAFABQAGgBAFAFQAFAFgBAFQABAGgFAFQgFAFgGgBQgFABgFgFg");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-7,-3.4,8.6,7.5);


(lib.Eye = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#333333").s().p("AgKALQgFgFABgGQgBgFAFgFQAFgFAFABQAGgBAFAFQAFAFgBAFQABAGgFAFQgFAFgGgBQgFABgFgFg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1.5,-1.5,3.1,3.1);


(lib.BodyPart_weak = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#66FFFF").s().p("Ah/CAQg0g1AAhLQAAhKA0g1QA1g0BKAAQBLAAA1A0QA0A1AABKQAABLg0A1Qg1A0hLAAQhKAAg1g0g");

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#00CC00").s().p("Ah/CAQg0g1AAhLQAAhKA0g1QA1g0BKAAQBLAAA1A0QA0A1AABKQAABLg0A1Qg1A0hLAAQhKAAg1g0g");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape}]}).to({state:[{t:this.shape_1}]},2).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-18,36,36);


(lib.BodyPart_vmax_weak = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF6633").s().p("Ah/CAQg0g1AAhLQAAhKA0g1QA1g0BKAAQBLAAA1A0QA0A1AABKQAABLg0A1Qg1A0hLAAQhKAAg1g0g");

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#00CC00").s().p("Ah/CAQg0g1AAhLQAAhKA0g1QA1g0BKAAQBLAAA1A0QA0A1AABKQAABLg0A1Qg1A0hLAAQhKAAg1g0g");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape}]}).to({state:[{t:this.shape_1}]},2).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-18,36,36);


(lib.BodyPart_vmax = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF6633").s().p("Ah/CAQg0g1AAhLQAAhKA0g1QA1g0BKAAQBLAAA1A0QA0A1AABKQAABLg0A1Qg1A0hLAAQhKAAg1g0g");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-18,36,36);


(lib.BodyPart = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#00CC00").s().p("Ah/CAQg0g1AAhLQAAhKA0g1QA1g0BKAAQBLAAA1A0QA0A1AABKQAABLg0A1Qg1A0hLAAQhKAAg1g0g");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-18,36,36);


(lib.Ring = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("rgba(102,255,255,0.2)").s().p("Al8CHQifg4AAhPQAAhOCfg4QCdg4DfAAQDgAACdA4QCfA4AABOQAABPifA4QidA4jgAAQjfAAidg4gAjyg/QhkAbAAAlQAAAlBkAbQBlAaCNABQCPgBBkgaQBlgbAAglQAAglhlgbQhkgaiPAAQiNAAhlAag");
	this.shape.setTransform(53.95,19.1);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,107.9,38.2);


(lib.Bubble_body = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#E2EFFF").s().p("AlYFYQiOiOAAjKQAAjICOiQQCQiODIAAQDKAACOCOQCPCQAADIQAADKiPCOQiOCPjKAAQjIAAiQiPg");
	this.shape.setTransform(48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,97.4,97.4);


(lib.Wine_base = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#660066").ss(2,1,1).p("ACGh3QAGAZAAAcQAABGgpAzQgpAyg6AAQg5AAgpgyQgpgzAAhGQAAgcAGgZQAKglAYgeIDHAAQAYAeAKAlgAgnC7IAnAAIAAhSAAAC7IAoAAAiFh3IELAA");
	this.shape.setTransform(14,18.725);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#EE0083").s().p("AhiA+QgpgyAAhGQAAgcAGgaIELAAQAGAaAAAcQAABGgpAyQgqAzg5AAQg5AAgpgzg");
	this.shape_1.setTransform(14,17.975);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1,-1,30,39.5);


(lib.Gate_base = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.shape = new cjs.Shape();
	this.shape.graphics.rf(["#74E3FF","#67E7DB","#1FFF0E"],[0,0.412,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape.setTransform(30,30);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.rf(["#70E4F5","#67E7DB","#23FE18"],[0,0.424,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_1.setTransform(30,30);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.rf(["#6DE5EA","#67E7DB","#26FD23"],[0,0.439,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_2.setTransform(30,30);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.rf(["#69E7E0","#67E7DB","#2AFB2D"],[0,0.451,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_3.setTransform(30,30);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.rf(["#65E8D5","#67E7DB","#2EFA38"],[0,0.463,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_4.setTransform(30,30);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.rf(["#62E9CB","#67E7DB","#31F942"],[0,0.475,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_5.setTransform(30,30);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.rf(["#5EEAC0","#67E7DB","#35F84D"],[0,0.49,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_6.setTransform(30,30);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.rf(["#5AECB6","#67E7DB","#39F657"],[0,0.502,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_7.setTransform(30,30);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.rf(["#56EDAB","#67E7DB","#3DF562"],[0,0.514,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_8.setTransform(30,30);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.rf(["#53EEA1","#67E7DB","#40F46C"],[0,0.525,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_9.setTransform(30,30);

	this.shape_10 = new cjs.Shape();
	this.shape_10.graphics.rf(["#4FEF96","#67E7DB","#44F377"],[0,0.541,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_10.setTransform(30,30);

	this.shape_11 = new cjs.Shape();
	this.shape_11.graphics.rf(["#4BF08C","#67E7DB","#48F281"],[0,0.553,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_11.setTransform(30,30);

	this.shape_12 = new cjs.Shape();
	this.shape_12.graphics.rf(["#48F281","#67E7DB","#4BF08C"],[0,0.565,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_12.setTransform(30,30);

	this.shape_13 = new cjs.Shape();
	this.shape_13.graphics.rf(["#44F377","#67E7DB","#4FEF96"],[0,0.576,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_13.setTransform(30,30);

	this.shape_14 = new cjs.Shape();
	this.shape_14.graphics.rf(["#40F46C","#67E7DB","#53EEA1"],[0,0.592,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_14.setTransform(30,30);

	this.shape_15 = new cjs.Shape();
	this.shape_15.graphics.rf(["#3DF562","#67E7DB","#56EDAB"],[0,0.604,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_15.setTransform(30,30);

	this.shape_16 = new cjs.Shape();
	this.shape_16.graphics.rf(["#39F657","#67E7DB","#5AECB6"],[0,0.616,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_16.setTransform(30,30);

	this.shape_17 = new cjs.Shape();
	this.shape_17.graphics.rf(["#35F84D","#67E7DB","#5EEAC0"],[0,0.627,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_17.setTransform(30,30);

	this.shape_18 = new cjs.Shape();
	this.shape_18.graphics.rf(["#31F942","#67E7DB","#62E9CB"],[0,0.643,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_18.setTransform(30,30);

	this.shape_19 = new cjs.Shape();
	this.shape_19.graphics.rf(["#2EFA38","#67E7DB","#65E8D5"],[0,0.655,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_19.setTransform(30,30);

	this.shape_20 = new cjs.Shape();
	this.shape_20.graphics.rf(["#2AFB2D","#67E7DB","#69E7E0"],[0,0.667,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_20.setTransform(30,30);

	this.shape_21 = new cjs.Shape();
	this.shape_21.graphics.rf(["#26FD23","#67E7DB","#6DE5EA"],[0,0.678,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_21.setTransform(30,30);

	this.shape_22 = new cjs.Shape();
	this.shape_22.graphics.rf(["#23FE18","#67E7DB","#70E4F5"],[0,0.694,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_22.setTransform(30,30);

	this.shape_23 = new cjs.Shape();
	this.shape_23.graphics.rf(["#1FFF0E","#67E7DB","#74E3FF"],[0,0.706,1],0,0,0,0,0,19).s().p("Ah+CAQg1g1AAhLQAAhKA1g1QA0g1BKABQBLgBA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg0g1g");
	this.shape_23.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape}]}).to({state:[{t:this.shape_1}]},1).to({state:[{t:this.shape_2}]},1).to({state:[{t:this.shape_3}]},1).to({state:[{t:this.shape_4}]},1).to({state:[{t:this.shape_5}]},1).to({state:[{t:this.shape_6}]},1).to({state:[{t:this.shape_7}]},1).to({state:[{t:this.shape_8}]},1).to({state:[{t:this.shape_9}]},1).to({state:[{t:this.shape_10}]},1).to({state:[{t:this.shape_11}]},1).to({state:[{t:this.shape_12}]},1).to({state:[{t:this.shape_13}]},1).to({state:[{t:this.shape_14}]},1).to({state:[{t:this.shape_15}]},1).to({state:[{t:this.shape_16}]},1).to({state:[{t:this.shape_17}]},1).to({state:[{t:this.shape_18}]},1).to({state:[{t:this.shape_19}]},1).to({state:[{t:this.shape_20}]},1).to({state:[{t:this.shape_21}]},1).to({state:[{t:this.shape_22}]},1).to({state:[{t:this.shape_23}]},1).to({state:[{t:this.shape_22}]},1).to({state:[{t:this.shape_21}]},1).to({state:[{t:this.shape_20}]},1).to({state:[{t:this.shape_19}]},1).to({state:[{t:this.shape_18}]},1).to({state:[{t:this.shape_17}]},1).to({state:[{t:this.shape_16}]},1).to({state:[{t:this.shape_15}]},1).to({state:[{t:this.shape_14}]},1).to({state:[{t:this.shape_13}]},1).to({state:[{t:this.shape_12}]},1).to({state:[{t:this.shape_11}]},1).to({state:[{t:this.shape_10}]},1).to({state:[{t:this.shape_9}]},1).to({state:[{t:this.shape_8}]},1).to({state:[{t:this.shape_7}]},1).to({state:[{t:this.shape_6}]},1).to({state:[{t:this.shape_5}]},1).to({state:[{t:this.shape_4}]},1).to({state:[{t:this.shape_3}]},1).to({state:[{t:this.shape_2}]},1).to({state:[{t:this.shape_1}]},1).wait(1));

	// レイヤー_1
	this.shape_24 = new cjs.Shape();
	this.shape_24.graphics.lf(["#FF0038","#8D29E0","#0E9BFF"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_24.setTransform(30,30);

	this.shape_25 = new cjs.Shape();
	this.shape_25.graphics.lf(["#F50741","#8D29E0","#1894F6"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_25.setTransform(30,30);

	this.shape_26 = new cjs.Shape();
	this.shape_26.graphics.lf(["#EA0D49","#8D29E0","#238EEE"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_26.setTransform(30,30);

	this.shape_27 = new cjs.Shape();
	this.shape_27.graphics.lf(["#E01452","#8D29E0","#2D87E5"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_27.setTransform(30,30);

	this.shape_28 = new cjs.Shape();
	this.shape_28.graphics.lf(["#D51B5B","#8D29E0","#3880DC"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_28.setTransform(30,30);

	this.shape_29 = new cjs.Shape();
	this.shape_29.graphics.lf(["#CB2263","#8D29E0","#4279D4"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_29.setTransform(30,30);

	this.shape_30 = new cjs.Shape();
	this.shape_30.graphics.lf(["#C0286C","#8D29E0","#4D73CB"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_30.setTransform(30,30);

	this.shape_31 = new cjs.Shape();
	this.shape_31.graphics.lf(["#B62F75","#8D29E0","#576CC2"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_31.setTransform(30,30);

	this.shape_32 = new cjs.Shape();
	this.shape_32.graphics.lf(["#AB367D","#8D29E0","#6265BA"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_32.setTransform(30,30);

	this.shape_33 = new cjs.Shape();
	this.shape_33.graphics.lf(["#A13D86","#8D29E0","#6C5EB1"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_33.setTransform(30,30);

	this.shape_34 = new cjs.Shape();
	this.shape_34.graphics.lf(["#96438F","#8D29E0","#7758A8"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_34.setTransform(30,30);

	this.shape_35 = new cjs.Shape();
	this.shape_35.graphics.lf(["#8C4A97","#8D29E0","#8151A0"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_35.setTransform(30,30);

	this.shape_36 = new cjs.Shape();
	this.shape_36.graphics.lf(["#8151A0","#8D29E0","#8C4A97"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_36.setTransform(30,30);

	this.shape_37 = new cjs.Shape();
	this.shape_37.graphics.lf(["#7758A8","#8D29E0","#96438F"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_37.setTransform(30,30);

	this.shape_38 = new cjs.Shape();
	this.shape_38.graphics.lf(["#6C5EB1","#8D29E0","#A13D86"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_38.setTransform(30,30);

	this.shape_39 = new cjs.Shape();
	this.shape_39.graphics.lf(["#6265BA","#8D29E0","#AB367D"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_39.setTransform(30,30);

	this.shape_40 = new cjs.Shape();
	this.shape_40.graphics.lf(["#576CC2","#8D29E0","#B62F75"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_40.setTransform(30,30);

	this.shape_41 = new cjs.Shape();
	this.shape_41.graphics.lf(["#4D73CB","#8D29E0","#C0286C"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_41.setTransform(30,30);

	this.shape_42 = new cjs.Shape();
	this.shape_42.graphics.lf(["#4279D4","#8D29E0","#CB2263"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_42.setTransform(30,30);

	this.shape_43 = new cjs.Shape();
	this.shape_43.graphics.lf(["#3880DC","#8D29E0","#D51B5B"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_43.setTransform(30,30);

	this.shape_44 = new cjs.Shape();
	this.shape_44.graphics.lf(["#2D87E5","#8D29E0","#E01452"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_44.setTransform(30,30);

	this.shape_45 = new cjs.Shape();
	this.shape_45.graphics.lf(["#238EEE","#8D29E0","#EA0D49"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_45.setTransform(30,30);

	this.shape_46 = new cjs.Shape();
	this.shape_46.graphics.lf(["#1894F6","#8D29E0","#F50741"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_46.setTransform(30,30);

	this.shape_47 = new cjs.Shape();
	this.shape_47.graphics.lf(["#0E9BFF","#8D29E0","#FF0038"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh7BYhZQBXhXB8AAQB9AABXBXQBYBZAAB7QAAB8hYBYQhXBYh9AAQh8AAhXhYgAh+h/Qg1A1AABKQAABLA1A1QA0A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLABQhKgBg0A1g");
	this.shape_47.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_24}]}).to({state:[{t:this.shape_25}]},1).to({state:[{t:this.shape_26}]},1).to({state:[{t:this.shape_27}]},1).to({state:[{t:this.shape_28}]},1).to({state:[{t:this.shape_29}]},1).to({state:[{t:this.shape_30}]},1).to({state:[{t:this.shape_31}]},1).to({state:[{t:this.shape_32}]},1).to({state:[{t:this.shape_33}]},1).to({state:[{t:this.shape_34}]},1).to({state:[{t:this.shape_35}]},1).to({state:[{t:this.shape_36}]},1).to({state:[{t:this.shape_37}]},1).to({state:[{t:this.shape_38}]},1).to({state:[{t:this.shape_39}]},1).to({state:[{t:this.shape_40}]},1).to({state:[{t:this.shape_41}]},1).to({state:[{t:this.shape_42}]},1).to({state:[{t:this.shape_43}]},1).to({state:[{t:this.shape_44}]},1).to({state:[{t:this.shape_45}]},1).to({state:[{t:this.shape_46}]},1).to({state:[{t:this.shape_47}]},1).to({state:[{t:this.shape_46}]},1).to({state:[{t:this.shape_45}]},1).to({state:[{t:this.shape_44}]},1).to({state:[{t:this.shape_43}]},1).to({state:[{t:this.shape_42}]},1).to({state:[{t:this.shape_41}]},1).to({state:[{t:this.shape_40}]},1).to({state:[{t:this.shape_39}]},1).to({state:[{t:this.shape_38}]},1).to({state:[{t:this.shape_37}]},1).to({state:[{t:this.shape_36}]},1).to({state:[{t:this.shape_35}]},1).to({state:[{t:this.shape_34}]},1).to({state:[{t:this.shape_33}]},1).to({state:[{t:this.shape_32}]},1).to({state:[{t:this.shape_31}]},1).to({state:[{t:this.shape_30}]},1).to({state:[{t:this.shape_29}]},1).to({state:[{t:this.shape_28}]},1).to({state:[{t:this.shape_27}]},1).to({state:[{t:this.shape_26}]},1).to({state:[{t:this.shape_25}]},1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,60,60);


(lib.KeyBase = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFE537").s().p("AAJEMIgGAAIgGAAQgQAAgLgLQgMgMAAgQIAAkOQgXgJgUgTQgigiAAgwQAAgwAigiQAigiAwAAQAvAAAjAiQAhAiAAAwQAAAwghAiQgUATgXAJIAAB9IA1AAQAMAAAJAJQAKAJAAAOQAAANgKAJQgJAKgMAAIg1AAIAAA4IA1AAQAMAAAJAKQAKAJAAANQAAANgKAKQgJAJgMAAgAgdiyQgMALAAAQQAAAQAMALQALALAPAAQAPAAALgLQALgLAAgQQAAgQgLgLQgLgLgPAAQgPAAgLALg");
	this.shape.setTransform(12,26.825);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,24,53.7);


(lib.Gate_wave = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#66CCFF").ss(1,1,1).p("Ai0AAQAAhKA1g1QA1g1BKAAQBLAAA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg1g1Qg1g1AAhLgAkrAAQAAh8BYhYQBXhXB8AAQB9AABXBXQBYBYAAB8QAAB8hYBYQhXBYh9AAQh8AAhXhYQhYhYAAh8g");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = getMCSymbolPrototype(lib.Gate_wave, new cjs.Rectangle(-31,-31,62,62), null);


(lib.Gate_outer = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.lf(["#F50741","#8D29E0","#1894F6"],[0,0.529,1],-30,0,30,0).s().p("AjTDUQhYhYAAh8QAAh8BYhXQBYhYB7AAQB8AABYBYQBYBXAAB8QAAB8hYBYQhYBYh8AAQh7AAhYhYgAh/h/Qg1A1AABKQAABLA1A1QA1A1BKAAQBLAAA1g1QA1g1AAhLQAAhKg1g1Qg1g1hLAAQhKAAg1A1g");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = getMCSymbolPrototype(lib.Gate_outer, new cjs.Rectangle(-30,-30,60,60), null);


(lib.Gate_inner = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.rf(["#70E4F5","#67E7DB","#23FE18"],[0,0.424,1],0,0,0,0,0,19).s().p("Ah/CAQg1g1AAhLQAAhKA1g1QA1g1BKAAQBLAAA1A1QA1A1AABKQAABLg1A1Qg1A1hLAAQhKAAg1g1g");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = getMCSymbolPrototype(lib.Gate_inner, new cjs.Rectangle(-18,-18,36.1,36.1), null);


(lib.CoinBase = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_4
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#BDA14C").ss(3,1,1).p("AC9AAQAABPg4A3Qg3A3hOAAQhOAAg3g3Qg3g3AAhPQAAhOA3g3QA3g3BOAAQBOAAA3A3QA4A3AABOg");
	this.shape.setTransform(30.05,30);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

	// レイヤー_2
	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f().s("#BDA14C").ss(1,1,1).p("Ag/gYQASAxAugBQAvAAAQgv");
	this.shape_1.setTransform(29.85,34.6003);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#BDA14C").s().p("AhPAIQgCgDAAgEQAAgEACgDQACgDADAAQADAAACADQACADAAAEQAAAEgCADQgCADgDAAQgDAAgCgDgABGAHQgCgDAAgEQAAgEACgDQACgDADAAQADAAACADQACADAAAEQAAAEgCADQgCADgDAAQgDAAgCgDg");
	this.shape_2.setTransform(29.425,21.675);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2},{t:this.shape_1}]}).wait(1));

	// レイヤー_3
	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.lf(["#FFCC33","#FCE192"],[0,1],14.1,17.7,-14.1,-17.7).s().p("AifCgQhChCAAheQAAhdBChCQBDhCBcABQBdgBBCBCQBDBCAABdQAABehDBCQhCBBhdABQhcgBhDhBg");
	this.shape_3.setTransform(30.025,30);

	this.timeline.addTween(cjs.Tween.get(this.shape_3).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(7.5,7.5,45.1,45.1);


(lib.BerryBase = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_3
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#000066").ss(1,1,1).p("AAbhqQADgFAEgEQAVgUAdAAQADAAADAAQAZACASASQAFAFAEAGQAJANACAQQABAFAAAFQAAAagRAUQgCABgCACQgMAMgOAEQgIACgHABQgEgEgEgFQgCgCgBgCQgIgHgIgFQgKgFgLgCQgDgBgEAAQgDAAgDAAQgEAAgEAAQgJgQAAgTQAAgXANgSgACPhtQgBADAAACAAjizQARgLAWAAQADAAADAAQAZACASASQARARADAXQABAFAAAFQAAAGgBAFQATAGAPAPQAYAZAAAiQAAAZgNATQAGALACANQAAAFAAAFQAAAdgUAUQgGAGgGAEQgFADgEACQgNAGgQAAQgVAAgRgLQgPAIgTAAQgQAAgOgGQgLgFgJgJQAAgBgBAAQgDAEgDAEQgVAVgdAAQgMAAgLgEQgOgFgMgMQgKgJgFgLQgGgOAAgPQAAgHABgGQAEgVAQgQQAJgIAKgFQAEgBAEgCQgLgNgDgRQgBgGAAgHQAAgdAUgVQAJgJALgFQANgGARAAQADAAADAAQAKABAIADQAKAEAIAHAhjiRQgBgFAAgFQAAgdAUgVQAVgUAdAAQAdAAATAUQAMAMAFAOQAEALAAANQAAAagRATQADACACACAAogWQADAAADAAAAsgdQgCAEgCADAgCAFQACgEAEgDQAQgQAUgEACJgTQAWACARARQAHAHAFAIAhjiRQAZACASASQADADADADAiogsQgHgOAAgRQAAgdAUgVQAVgUAdAAQADAAADAAAiogsQAQgLAWAAQADAAADAAQATABAQAMAimBKQgHgEgHgHQgUgUAAgdQAAgcAUgVQAGgFAGgEAhLgMQAKgDAMAAQADAAADAAQAZACATARQAAABABAAAhTCvQgKAEgMAAQgdAAgVgVQgUgUAAgdQAAgUAJgPAh1BTQgGABgHAAQgUAAgQgKAhTCvQgCgJAAgKQAAgUAJgQAA2CfQgBAbgUAUQgUAUgcAAQgdAAgVgUQgNgOgFgRAByALQAHAMACANQABAFAAAFQAAAdgVAVQgHAHgIAFAA2CfQgFgEgFgEQgRgSgDgXACkBsQgDAZgSASQgUAUgdAAQgXAAgRgMAADBfQgSgVAAgcQAAgXANgS");
	this.shape.setTransform(20.125,22.625);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-1.8,-1.1,0,-1.8,-1.1,9.8).s().p("AgPBCQgPgFgMgMQgKgJgEgLQgHgOAAgPIACgMQADgVAQgQQAJgIALgFIAHgEQALgDALAAIAGABQAYABATASIABABQgNASAAAYQAAAbATAUIgHAIQgVAVgcAAQgMAAgKgEg");
	this.shape_1.setTransform(14.1,28);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-1.7,-1.1,0,-1.7,-1.1,9.8).s().p("AgbA8QgIgEgGgGQgVgVAAgdQAAgcAVgUIAMgKQAQgLAVAAIAFAAQAUACAQAMQACAQAMANIgIAEQgLAFgIAIQgQAPgEAVIgBANQAAAPAGAOIgNABQgUAAgPgKg");
	this.shape_2.setTransform(6.25,24);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-2.2,-0.6,0,-2.2,-0.6,9.8).s().p("AAUBBQgTgTgYgBIgGgBQgMAAgKAEQgMgOgCgQQgBgHgBgHQAAgcAVgUQAJgJALgFQANgHAQAAIAGABQAKAAAJAEQAJAEAJAHIAEADQgNASABAXQAAATAJAQIAIgBIAGABIAGABIgDAHQgVAEgPAPIgIAJIAAgBg");
	this.shape_3.setTransform(17.75,16.575);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-2,-1.6,0,-2,-1.6,10.5).s().p("AAjAvQgJgEgKAAIgGgBQgPAAgOAHIgFgGQgTgTgZgBIgBgLQAAgcAVgUQAUgVAcAAQAdAAAVAVQALALAFAPQAEAKAAAMQAAAagRAUQgIgHgKgEg");
	this.shape_4.setTransform(17,5.775);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-2.5,-4.9,0,-2.5,-4.9,9.8).s().p("AgnATIgKgIQgRgQgDgXQAOAGAQAAQATAAAPgJQAQALAVAAQAQAAANgGIAJgEQgDAYgSARQgUAVgdAAQgWAAgRgNg");
	this.shape_5.setTransform(29.5125,36.5625);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-2.5,-1.5,0,-2.5,-1.5,9.8).s().p("AgwAtQgOgNgEgRQgDgJAAgJQAAgUAKgQQAKADANAAQAcAAAUgUIAHgJIABABQAKAJALAFQACAYASARIAJAIQgBAbgTATQgVAVgdAAQgcAAgUgVg");
	this.shape_6.setTransform(18.5,38.675);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-0.4,-2.8,0,-0.4,-2.8,9.8).s().p("AgcAgQgVgVAAgcQAAgTAJgPQAQAJAUAAIANgBQAFALAJAKQAMAMAPAFQgKAPAAAUQAAAKADAJQgLADgMAAQgcAAgUgUg");
	this.shape_7.setTransform(7.4875,35.2625);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-1.7,0.7,0,-1.7,0.7,9.8).s().p("AgLAnIgFgBQgWAAgQALQgIgOABgRQgBgcAVgUQAUgVAdAAIAFABQAZABATATIAGAGQgLAFgJAJQgVATAAAdQABAHABAHQgQgMgTgBg");
	this.shape_8.setTransform(8.75,13.175);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-4,-1.1,0,-4,-1.1,9.8).s().p("Ag1A6QAIgEAHgHQAVgVAAgcIgBgKQgCgNgHgNIgHgKQAOgFAMgMIAEgDQAVACARARQAHAHAFAJQAGALACAMIAAAKQAAAcgUAVQgGAGgHAEIgIAFQgNAFgPAAQgVABgRgMg");
	this.shape_9.setTransform(34.3375,27.55);

	this.shape_10 = new cjs.Shape();
	this.shape_10.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-3.4,1.6,0,-3.4,1.6,9.8).s().p("AAyAhQgSgTgZgBIgGgBQgcAAgVAVIgHAIIgFgEQARgTAAgZQAAgMgEgLQARgMAWAAIAGAAQAYACASATQARAQADAWIABAKIgBAMIgBAEIgJgKg");
	this.shape_10.setTransform(28.425,7.8);

	this.shape_11 = new cjs.Shape();
	this.shape_11.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-0.2,1.7,0,-0.2,1.7,8.3).s().p("AA3AvQgRgRgWgDQARgTAAgaIAAgKQgDgQgJgNIABgEQATAGAPAPQAZAYgBAhQAAAZgNAUQgFgIgHgHgAhMARQALACAKAGIgFgBIgGAAIgIAAIgGABIAEgIg");
	this.shape_11.setTransform(32.2,17.8875);

	this.shape_12 = new cjs.Shape();
	this.shape_12.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-2.5,-1.1,0,-2.5,-1.1,9.8).s().p("AgcBAQgLgFgKgJIgBgBQgTgVAAgcQAAgWANgSIAHgIQAQgQAUgEIAGAAIAHgBIAGABIAFAAQAJAEAHAIIADADIAIALIAPgDIAIAKQAGANADANIAAAJQAAAdgVAVQgHAHgIAEQgPAJgTAAQgPAAgNgGg");
	this.shape_12.setTransform(25.5,27.25);

	this.shape_13 = new cjs.Shape();
	this.shape_13.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-2.5,-1,0,-2.5,-1,9.8).s().p("AAAA7IgCgDQgHgIgJgEQgKgGgLgBIgGgBIgHgBIgIABQgJgQAAgUQAAgWANgSIAIgIQAUgVAcAAIAGABQAZABATATIAIAKQAJANADAQIAAAJQAAAbgRATIgDAEQgNAMgOAFIgPADIgIgLg");
	this.shape_13.setTransform(28.5,15.975);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_13},{t:this.shape_12},{t:this.shape_11},{t:this.shape_10},{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1,-1,42.3,47.3);


(lib.Apple_base = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#330000").ss(5,1,1).p("AAAg7IAAA7IAAA8");
	this.shape.setTransform(20,6);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#66FF00").s().p("AgCBXQhRgBg6g6QghgggOgqQBlhPBVBPQBhBKBehKQgOAqgiAgQg6A7hTAAIgCAAg");
	this.shape_1.setTransform(20.025,37.3375);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FF3300").s().p("AgCBzQhUhQhmBQQgLgfAAgkQAAhRA6g7QA6g6BRgBIACAAIAAA8IAAg8QBTAAA6A7QA7A7AABRQAAAkgKAfQgwAlgwAAQgwAAgwglgAAAiXIAAAAg");
	this.shape_2.setTransform(20,21.1875);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-2.5,40,48.5);


(lib.Spider_singleWeb = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("Ag0kiQgvBShagbAhDhIIg2hHIhEhcIgOgSAgKjDQgdBBhSgNAgWgLIgtg9ACBB5QAAASglADIgvg/ABjA0QgOAXgoAEIhDhaAA1gyQgRAug6gHAAahvQgrAugygHADMEjIhwiV");
	this.shape.setTransform(-20.375,-29.125);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-41.7,-59.2,42.7,60.2);


(lib.Spider_legs_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#33CCFF").ss(2,1,1).p("ACDgoIhhiRIhWgWIg/AzIAQBqIgnATAB+APIhsiIIgpgMIgkAaIAOB8IgzAaACBAkIh0g7IgGBUIgaAwIhKAUACLBFIhTAVIhFByIgsAE");
	this.shape.setTransform(-13.875,0);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-28.7,-21.7,29.7,43.5);


(lib.Spider_leg_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#33CCFF").ss(2,1,1).p("AA8gpIgyANIgqBEIgbAC");
	this.shape.setTransform(-6.3,4.1);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-13.2,-1.1,13.899999999999999,10.4);


(lib.Spider_leg_4 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(2,1,1).p("AA8gpIgyANIgqBEIgbAC");
	this.shape.setTransform(-6.3,4.1);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-13.2,-1.1,13.899999999999999,10.4);


(lib.Spider_leg_3_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#33CCFF").ss(2,1,1).p("ABEgJIhGgkIgEAyIgQAdIgtAM");
	this.shape.setTransform(-6.9,1.025);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-14.6,-4.6,15.5,11.3);


(lib.Spider_leg_3 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(2,1,1).p("ABEgJIhGgkIgEAyIgQAdIgtAM");
	this.shape.setTransform(-6.9,1.025);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-14.6,-4.6,15.5,11.3);


(lib.Spider_leg_2_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#33CCFF").ss(2,1,1).p("ABEAkIhBhRIgZgHIgWAPIAIBLIgfAP");
	this.shape.setTransform(-7.3,-3.875);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-15,-10.2,15.5,12.7);


(lib.Spider_leg_2 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(2,1,1).p("ABEAkIhBhRIgZgHIgWAPIAIBLIgfAP");
	this.shape.setTransform(-7.3,-3.875);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-15,-10.2,15.5,12.7);


(lib.Spider_leg_1_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#33CCFF").ss(2,1,1).p("ABSAwIg7hXIg0gNIgmAfIAJA/IgXAL");
	this.shape.setTransform(-8.3,-4.925);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-17.4,-11.2,18.299999999999997,12.6);


(lib.Spider_leg_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(2,1,1).p("ABSAwIg7hXIg0gNIgmAfIAJA/IgXAL");
	this.shape.setTransform(-8.3,-4.925);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-17.4,-11.2,18.299999999999997,12.6);


(lib.Spider_eye_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFCC00").s().p("AgGAKQgDgEAAgGQAAgFADgFQADgEADAAQAEAAADAEQADAFAAAFQAAAGgDAEQgDAFgEAAQgDAAgDgFg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1,-1.5,2,3);


(lib.Spider_eye = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF0000").s().p("AgGAKQgDgEAAgGQAAgFADgFQADgEADAAQAEAAADAEQADAFAAAFQAAAGgDAEQgDAFgEAAQgDAAgDgFg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1,-1.5,2,3);


(lib.Spider_body_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#33CCFF").s().p("AgcBwQgNgSAAgZQAAgZANgSIAEgGQgKgGgJgLQgTgWgBghQgCghAYgRIAfgWQALgIALAIIAgAYQAUARAAAgQAAAggSAWQgKALgKAGIAFAGQAMASAAAZQAAAZgMASQgNARgRAAQgRAAgMgRg");
	this.shape.setTransform(-0.0077,0.0375);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-6.4,-12.9,12.8,25.9);


(lib.Spider_body = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#333333").s().p("AggB+QgOgUAAgcQAAgdAOgUIAFgGQgMgHgKgMQgVgagBglQgCglAbgUIAjgZQAMgIAMAIIAkAcQAXATABAkQAAAkgVAaQgLAMgLAHIAFAGQAOAUAAAdQAAAcgOAUQgOAUgUAAQgTAAgOgUg");
	this.shape.setTransform(-0.0061,0.0331,0.884,0.884);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-6.4,-12.9,12.8,25.9);


(lib.Mouse_nose_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AAHgRQgaAlgZA2AAFhVQACAbABASQAAAOgBAJQAMApAaA+");
	this.shape.setTransform(-1.1,4.1);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#333333").s().p("AgBAbIgCgtIACAtQgKgBgHgHQgIgIAAgLQAAgKAIgIQAIgHAKgBQALABAIAHQAIAIgBAKQABALgIAIQgIAHgLABIgBAAg");
	this.shape_1.setTransform(-0.1,-2.65);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-6.6,-5.5,11,19.2);


(lib.Mouse_nose = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AgDASQgbAmgpgNAgFgwQACAaABATQAAAMgBAJQALAqBAgO");
	this.shape.setTransform(0,0.4361);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#333333").s().p("AgBAbIgCgtIACAtQgKgBgHgHQgIgIAAgLQAAgKAIgIQAIgHAKgBQALABAIAHQAIAIgBAKQABALgIAIQgIAHgLABIgBAAg");
	this.shape_1.setTransform(-0.1,-2.65);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-8.2,-5.5,16.4,11.9);


(lib.Mouse_mustache_upper = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#484848").ss(1,1,1).p("AhBAEICDgH");
	this.shape.setTransform(0.025,0.025);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-7.6,-1.3,15.3,2.7);


(lib.Mouse_face_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#CCF5FF").s().p("AAAAvQgYASgjAAQgjAAgagTQgYgUAAgaQAAgMAFgLQAGgNANgKQAagTAjAAQAkAAAYATQAYgSAiAAQAkAAAYATQAOAKAHANQAFALAAAMQAAAagaAUQgYATgkAAQgjAAgYgTg");
	this.shape.setTransform(0.2,14.15);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#33CCFF").s().p("AjTDEQhYhYAAh7QAAh9BchJQBdhJB8ADQB9AEBTBGQBSBFAAB9QAAB7hYBYQhYBYh8AAQh7AAhYhYgAA9DPQAkAAAYgTQAagTAAgbQAAgNgFgKQgHgNgOgLQgYgTgkAAQgiAAgYASQgYgTgkAAQgjAAgaATQgNALgGANQgFAKAAANQAAAbAYATQAaATAjAAQAjAAAXgSQAZATAjAAg");
	this.shape_1.setTransform(0,0.017);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-30,-28.3,60,56.7);


(lib.Mouse_face = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFCCFF").s().p("AAAAvQgYASgjAAQgjAAgagTQgYgUAAgaQAAgMAFgLQAGgNANgKQAagTAjAAQAkAAAYATQAYgSAiAAQAkAAAYATQAOAKAHANQAFALAAAMQAAAagaAUQgYATgkAAQgjAAgYgTg");
	this.shape.setTransform(0.2,14.15);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF9900").s().p("AjTDEQhYhYAAh7QAAh9BchJQBdhJB8ADQB9AEBTBGQBSBFAAB9QAAB7hYBYQhYBYh8AAQh7AAhYhYgAA9DPQAkAAAYgTQAagTAAgbQAAgNgFgKQgHgNgOgLQgYgTgkAAQgiAAgYASQgYgTgkAAQgjAAgaATQgNALgGANQgFAKAAANQAAAbAYATQAaATAjAAQAjAAAXgSQAZATAjAAg");
	this.shape_1.setTransform(0,0.017);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-30,-28.3,60,56.7);


(lib.Mouse_eye_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AAfgRIgGAEIgrAYIgMAH");
	this.shape.setTransform(-0.875,-0.8);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#333333").s().p("AgTASQgHgHgBgKIArgYIADADQAJAIAAALQAAALgJAIQgHAIgMAAQgKAAgJgIgAgbgBIAAgBIApgXIACACIgrAYIAAgCgAAQgXIAAAAg");
	this.shape_1.setTransform(0,0.175);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-5,-3.6,8.3,6.4);


(lib.Mouse_eye = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#333333").s().p("AgTAUQgHgJgBgLQABgKAHgJQAJgHAKgBQAMABAHAHQAJAJAAAKQAAALgJAJQgHAHgMABQgKgBgJgHg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-2.7,-2.7,5.5,5.5);


(lib.Mouse_Ear_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#33CCFF").ss(4,1,1).p("ABqAAQAAAsgfAeQgfAfgsAAQgrAAgfgfQgfgeAAgsQAAgrAfgfQAfgeArAAQAsAAAfAeQAfAfAAArg");
	this.shape.setTransform(0,0.025);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#CCF5FF").s().p("AhKBKQgfgeAAgsQAAgrAfgfQAggeAqAAQAsAAAfAeQAfAfAAArQAAAsgfAeQgfAfgsAAQgqAAgggfg");
	this.shape_1.setTransform(0,0.025);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-12.6,-12.5,25.2,25.1);


(lib.Mouse_Ear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#FF9900").ss(4,1,1).p("ABqAAQAAAsgfAeQgfAfgsAAQgrAAgfgfQgfgeAAgsQAAgrAfgfQAfgeArAAQAsAAAfAeQAfAfAAArg");
	this.shape.setTransform(0,0.025);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFCCFF").s().p("AhKBKQgfgeAAgsQAAgrAfgfQAggeAqAAQAsAAAfAeQAfAfAAArQAAAsgfAeQgfAfgsAAQgqAAgggfg");
	this.shape_1.setTransform(0,0.025);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-12.6,-12.5,25.2,25.1);


(lib.Hedgehog_nose = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#333333").s().p("AgVAQQgIgGAAgKQAAgJAIgHQAKgHAMAAQALAAAKAHQAIAHAAAJQAAAKgIAGQgKAIgLAAQgMAAgKgIg");
	this.shape.setTransform(0,0.025);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-3,-2.3,6,4.699999999999999);


(lib.Hedgehog_nail = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#B1305B").s().p("AgQANQgmhDBHAqQAQAMgEAJQgFAKgIAFQgFAFgGAAQgJAAgMgQg");
	this.shape.setTransform(0.0254,-0.0103);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-2.9,-2.9,5.9,5.8);


(lib.Hedgehog_mouth_base_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#D27151").ss(1,1,1).p("AA1gFQAMAUAVAHAgugEIAwAQIAzgRAhVAZIAngdQA2gnAtAm");
	this.shape.setTransform(-0.3,-2.1806);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#6633FF").s().p("AgxABQA2gmAsAmIgxARg");
	this.shape_1.setTransform(0,-2.8306);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-9.8,-5.6,19.1,6.8999999999999995);


(lib.Hedgehog_mouth = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#D27151").ss(1,1,1).p("AAygbQAWgFAYgLAgxgaIA2BHIAthIAhfgsQAWALAYAHQAwAMAzgN");

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF6200").s().p("AgxgjQAwAMAygMIgtBHg");
	this.shape_1.setTransform(0,0.875);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-10.5,-5.5,21.1,11);


(lib.Hedgehog_face_sa = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FC9776").s().p("Ai+BrQhPgsAAg/QAAg+BPgsQBPgtBvAAQBwAABOAtQBQAsAAA+QAAA/hQAsQhOAthwAAQhvAAhPgtg");
	this.shape.setTransform(-0.15,-4.175);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#00CCFF").s().p("AgLD/IhXCqIgwjGIg2CUIgSiCQjfidCujjIAoi+IBICBIAji5IA9CcIA8jHIBADHIBQiYIAcCmIBVhyIAUDIIAAABQCaCCjODiIgiCdIhWiPIgtC7gAjAiEQhPAtAAA/QAAA9BPAtQBPAsBwAAQBvAABPgsQBPgtAAg9QAAg/hPgtQhPgshvAAQhwAAhPAsg");
	this.shape_1.setTransform(0.0062,-1.65);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#00CCFF").s().p("AiSD9IhFD1IgDjjQjfidCujjIAUkmIBcDpIAjk5IA9EbIBElTIA4FTIBrkKIABEZIB/jYIgWEuIAAAAQCaCDjODiIgHDpIhxjcIglEVIhQkHIheEHgAjAhqQhPAtAAA+QAAA+BPAtQBPAsBwAAQBvAABPgsQBPgtAAg+QAAg+hPgtQhPgshvAAQhwAAhPAsg");
	this.shape_2.setTransform(0.0062,-4.225);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#00CCFF").s().p("AgLEOIhSFYIg1l0IhFFzIgDlhQjfidCujjIAUmLIBcFOIAUmYIBMF6IAzmiIBJGiIAymJIA6GYIBSlbIAXGxQCaCDjODiIgCFeIh2lRIgvF6gAjAh1QhPAtAAA/QAAA9BPAtQBPAsBwAAQBvAABPgsQBPgtAAg9QAAg/hPgtQhPgshvAAQhwAAhPAsg");
	this.shape_3.setTransform(0.0062,-3.125);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).to({state:[{t:this.shape_2},{t:this.shape}]},1).to({state:[{t:this.shape_3},{t:this.shape}]},1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-34.4,-66.5,68.8,126.8);


(lib.Hedgehog_Face_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#C6E7FF").s().p("Ai+BrQhPgsAAg/QAAg+BPgsQBPgtBvAAQBwAABOAtQBQAsAAA+QAAA/hQAsQhOAthwAAQhvAAhPgtg");
	this.shape.setTransform(-0.15,-4.175);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#33CCFF").s().p("AiSDTIg4BqIgQhYQjfieCujjIAoiQIBIBTIAeiEIBCBnIA/iKIA9CKIBLhsIAhB7IA+gwIArCFIAAABQCaCEjODgIgqB5IhOhrIgvCbIhGiNIhXCSgAjAiUQhPAtAAA/QAAA9BPAtQBPAsBwAAQBvAABPgsQBPgtAAg9QAAg/hPgtQhPgthvAAQhwAAhPAtg");
	this.shape_1.setTransform(0.0062,0);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-34.4,-38.5,68.8,77);


(lib.Hedgehog_Face = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FC9776").s().p("Ai+BrQhPgsAAg/QAAg+BPgsQBPgtBvAAQBwAABOAtQBQAsAAA+QAAA/hQAsQhOAthwAAQhvAAhPgtg");
	this.shape.setTransform(-0.15,-4.175);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#00CCFF").s().p("AiSDTIg4BqIgQhYQjfieCujjIAoiQIBIBTIAeiEIBCBnIA/iKIA9CKIBLhsIAhB7IA+gwIArCFIAAABQCaCEjODgIgqB5IhOhrIgvCbIhGiNIhXCSgAjAiUQhPAtAAA/QAAA9BPAtQBPAsBwAAQBvAABPgsQBPgtAAg9QAAg/hPgtQhPgthvAAQhwAAhPAtg");
	this.shape_1.setTransform(0.0062,0);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-34.4,-38.5,68.8,77);


(lib.Hedgehog_eye_base_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AA0gXIgQAIIhHAfIgQAI");
	this.shape.setTransform(-1.075,-2.3875);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFFFFF").s().p("AgFAHQgEgCAAgEQAAgDACgDIAAAAQADgCAEgBQADAAADACQADACABAEIgBACIgCAEQgDADgDAAIgBAAQgDAAgCgCg");
	this.shape_1.setTransform(2.4208,1.3492);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#333333").s().p("AgFArQgNgBgLgKQgPgMgCgTQgBgFABgGIBHggIAFADQAPANACATQACATgNAPQgGAHgHAEQgIAFgKAAIgFAAIgFAAgAAXABQgEABgDACIAAAAQgCADAAAEQAAAEAEACQADADAEgBQADAAADgDIACgEIABgDQgBgEgDgCQgCgCgDAAIgCAAg");
	this.shape_2.setTransform(0.0447,0.3375);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-7.3,-5.7,12.5,10.4);


(lib.Hedgehog_eye = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFFFFF").s().p("AgFAHQgEgCAAgEQAAgDACgDIAAAAQADgCAEgBQADAAADACQADACABAEIgBACIgCAEQgDADgDAAIgBAAQgDAAgCgCg");
	this.shape.setTransform(2.0208,-1.9508);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#333333").s().p("AgFAuQgNgBgLgKQgPgMgCgTQgCgSANgQQANgOATgCQASgBAPALQAPANACATQACATgNAPQgGAHgHAEQgIAFgKAAIgFABIgFgBgAATgcQgEABgDACIAAAAQgCADAAAEQAAAEAEACQADADAEgBQADAAADgDIACgEIABgDQgBgEgDgCQgCgCgDAAIgCAAg");
	this.shape_1.setTransform(0.0442,0.0038);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.7,-4.6,9.5,9.3);


(lib.FrogFace_defeated_lower = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#CFFF81").s().p("AAGE/IgDAAIgDAAQhxgBhThvIgHgKQgOgSgLgUIgohaQgWhAgGhJQAnhxBPhDQBRhGBhAAQBiAABRBGQBPBDAnBxQgFA1gMAwIggBbIgfA3IgMASIgHAKIgKAOQhNBdhmAFIgDAAg");
	this.shape.setTransform(29.725,31.85);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,59.5,63.7);


(lib.FrogFace_defeated = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#33CCFF").s().p("AEpFLQgniHhPhQQhRhThiAAQhhAAhRBTQhPBQgnCHQgDglAAgmQAAiFAfhsQgfg+AAhUQAAhaAjg/QAjg+AyAAQAxAAAkA+IALAWQAogTArAAQAvAAAqAWIAGgNQAjhAAyAAQAxAAAkBAQAjA+AABaQAABSgdA5QAdBsAACBQAAAvgEAsIABgQgAChjoQgQAdAAAnQAAAoAQAcQAPAcAXAAQAWAAAPgcQANgWADgcIhXheIgEAIgAj6iVQACAeANAXQAPAcAXAAQAVAAAQgcQAQgcAAgoQAAgngQgdIgFgJg");
	this.shape.setTransform(30,34.7);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,60,69.4);


(lib.FrogEye_defeated = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#003701").s().p("AgEAzQgVgDgOgRQgOgRACgVQACgRALgMQAxgqApBOIgBAGQgCAWgQANQgNALgRAAIgHgBg");
	this.shape.setTransform(5.2125,5.1879);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,10.4,10.4);


(lib.FrogFace_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#33CCFF").s().p("AEpCSQgnhGhPgrQhRgqhiAAQhhAAhRAqQhPArgnBGQgDgTAAgUQAAhGAfg5QgfggAAgsQAAgvAjghQAjghAyAAQAxAAAkAhIALALQAogKArAAQAvAAApALIAHgGQAjgiAyAAQAxAAAkAiQAjAhAAAvQAAAqgdAgQAdA3AABEQAAA3gUAwQAMgeAFgigAChiVQgQAPAAAUQAAAVAQAPQAPAPAXAAQAWAAAPgPQAMgLADgPIhWgyIgEAFgAj6hqQACAQANAMQAPAPAXAAQAVAAAQgPQAQgPAAgVQAAgUgQgPIgFgFg");
	this.shape.setTransform(30,21.0375);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#CFFF81").s().p("AAGDIIgDAAIgDAAQhxAAhThGIgIgGQgNgMgLgMIgog5QgWgogGguIAAAAQAnhGBPgqQBRgsBhAAQBiAABRAsQBPAqAnBGQgFAigMAeIggA5IgfAiIgMAMIgHAGIgKAIQhNA7hmADIgDAAg");
	this.shape_1.setTransform(29.975,40);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#003701").s().p("AChAeQgQgOAAgVQAAgUAQgPIAFgEIBVAwQgCAPgMALQgQAPgWABQgXgBgPgPgAjrAeQgNgMgCgQIBVguIAFAEQAQAPAAAUQAAAVgQAOQgPAPgWABQgXgBgPgPg");
	this.shape_2.setTransform(29.9875,10.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,60,60);


(lib.Frog_base = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#CFFF81").s().p("AAGDIIgDAAIgDAAQhxAAhThGIgIgGQgNgMgLgMIgog5QgWgogGguIAAAAQAnhGBPgqQBRgsBhAAQBiAABRAsQBPAqAnBGQgFAigMAeIggA5IgfAiIgMAMIgHAGIgKAIQhNA7hmADIgDAAg");
	this.shape.setTransform(29.975,40);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFFFFF").s().p("ACuAMQgGgFAAgHQAAgGAGgFQAFgFAHAAQAIAAAEAFQAGAFAAAGQAAAHgGAFQgEAFgIAAQgHAAgFgFgAjGAMQgFgFAAgHQAAgGAFgFQAGgFAHAAQAIAAAEAFQAGAFAAAGQAAAHgGAFQgEAFgIAAQgHAAgGgFg");
	this.shape_1.setTransform(29.95,7.85);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#003701").s().p("AChAjQgQgOAAgVQAAgUAQgPQAPgOAXAAQAWAAAPAOQAQAPAAAUQAAAVgQAOQgPAPgWABQgXgBgPgPgACtgcQgGAFAAAGQAAAIAGAFQAFAEAHAAQAIAAAFgEQAGgFgBgIQABgGgGgFQgFgGgIAAQgHAAgFAGgAjrAjQgQgOAAgVQAAgUAQgPQAPgOAXAAQAVAAAQAOQAQAPAAAUQAAAVgQAOQgQAPgVABQgXgBgPgPgAjGgcQgFAFgBAGQABAIAFAFQAFAEAHAAQAIAAAFgEQAFgFAAgIQAAgGgFgFQgFgGgIAAQgHAAgFAGg");
	this.shape_2.setTransform(30,9.6);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#26BF4A").s().p("AEpCSQgnhGhPgrQhRgqhiAAQhhAAhRAqQhPArgnBGQgDgTAAgUQAAhGAfg5QgfggAAgsQAAgvAjghQAjghAyAAQAxAAAkAhIALALQAogKArAAQAvAAApALIAHgGQAjgiAyAAQAxAAAkAiQAjAhAAAvQAAAqgdAgQAdA3AABEQAAA3gUAwQAMgeAFgigAChiVQgQAPAAAUQAAAVAQAPQAPAPAXAAQAWAAAPgPQAQgPAAgVQAAgVgQgOQgPgPgWAAQgXAAgPAPgAjriVQgQAOAAAVQAAAVAQAPQAPAPAXAAQAVAAAQgPQAQgPAAgVQAAgUgQgPQgQgPgVAAQgXAAgPAPg");
	this.shape_3.setTransform(30,21.0375);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,60,60);


(lib.Cancer_cissor_open_close = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF3300").s().p("Ag7CGQgQgBgLgGICjhxIAAABQAMAXgTAeQgSAegmAUQghAQgeAAIgKAAgAg2iEQAMgDAPADQAiAFAgAbQAhAcALAiQALAhgRATg");
	this.shape.setTransform(-7.705,-1.542);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF3300").s().p("AgIBTQgrgDgcgUQgOgJgGgLIDEgQIAAABQgBAbgfAQQgbAPgmAAIgIAAgAhKhIQAKgGAPgCQAjgHAnAPQAoAQAUAdQAVAbgJAYg");
	this.shape_1.setTransform(-9.79,-2.5734);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FF3300").s().p("AgLAyQgrgIgagXQgNgJgFgLIDFADIAAABQgEAaghANQgWAKgbAAQgMAAgMgCgAhigCQAHgLAMgJQAbgWArgFQAqgFAfAQQAfAOAEAZg");
	this.shape_2.setTransform(-9.9875,-0.3158);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape}]}).to({state:[{t:this.shape_1}]},1).to({state:[{t:this.shape_2}]},1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-19.9,-15,20.9,26.9);


(lib.Cancer_cissor_minor = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF3300").s().p("AgXAiQgSgJgGgRQgFgPAKgOQAKgOAUgEQATgDASAKQARAIAFARQAGAQgKAOQgKAOgUACIgMABQgMAAgMgGg");
	this.shape.setTransform(-4.9358,0.0255);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-9.8,-4,9.8,8.1);


(lib.Cancer_foot_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#33CCFF").ss(4,1,1).p("AA7gRIhOgPIgnBB");
	this.shape.setTransform(-5.925,0);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-13.8,-5.2,15.8,10.5);


(lib.Cancer_foot = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#FF3300").ss(4,1,1).p("AA7gRIhOgPIgnBB");
	this.shape.setTransform(-5.925,0);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-13.8,-5.2,15.8,10.5);


(lib.Cancer_eye_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AA6gfIgSAKIhNAqIgUAL");
	this.shape.setTransform(-1.175,-15.475);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#33CCFF").s().p("AgdgrIALABQAKAAAIgEQgFAnAkAnIgUAPQgwgvAIgrg");
	this.shape_1.setTransform(1.8377,-4.675);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FFFFFF").s().p("AgGAHQgDgDAAgEQAAgDADgDIAAAAQADgCADgBQAEABADACQADADAAADIgBADQAAABAAAAQAAAAAAABQgBAAAAABQAAAAgBABQgDACgEAAQgDAAgDgCg");
	this.shape_2.setTransform(1.7,-11.2);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#333333").s().p("AgKArQgNgDgLgLQgMgMgBgRIBMgrIAFAFQAOAOAAAUQAAATgOAOQgHAHgIAEQgJAEgKAAIgKgBgAALAOIAAABQgDACAAAEQAAAEADADQADADAEAAQAEAAADgDQAAgBABAAQAAgBAAAAQABAAAAgBQAAAAAAgBIABgDQAAgEgDgDQgDgCgEAAQgEAAgDACg");
	this.shape_3.setTransform(-0.0875,-13.3125);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-8,-19.7,13.7,19.7);


(lib.Cancer_eye_anger = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AgwgRIAQAGIAoAOQAEAAADADIAQAFIASAH");
	this.shape.setTransform(1.275,-16.85);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF3300").s().p("AgdgrIALABQAKAAAIgEQgFAnAkAnIgUAPQgwgvAIgrg");
	this.shape_1.setTransform(1.8377,-4.675);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FFFFFF").s().p("AgGAHQgDgDAAgEQAAgDADgDIAAAAQADgCADgBQAEABADACQADADAAADIAAADQgBAAAAABQAAAAAAABQgBAAAAABQgBAAAAABQgDACgEAAQgDAAgDgCg");
	this.shape_2.setTransform(2.1,-15.6);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#333333").s().p("AgKAsQgNgDgKgKQgOgOgBgTQABgUAOgPQAFgEAFgEIAFABIAoAOQgEABgDACIAAAAQgDADAAAEQAAAEADADQADACAEAAQAEAAADgCQAAgBABAAQAAgBABAAQAAgBAAAAQAAgBABAAIAAgDQAAgEgDgDIAPAFQAFAKAAAKQAAATgPAOQgHAHgHADQgJAEgLABIgKgCg");
	this.shape_3.setTransform(-0.1,-13.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.9,-19.6,12.100000000000001,19.6);


(lib.Cancer_eye = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF3300").s().p("AgdgrIALABQAKAAAIgEQgFAnAkAnIgUAPQgwgvAIgrg");
	this.shape.setTransform(1.8377,-4.675);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFFFFF").s().p("AgGAHQgDgDAAgEQAAgDADgDIAAAAQADgCADgBQAEABADACQADADAAADIAAADQgBAAAAABQAAAAAAABQgBAAAAABQgBAAAAABQgDACgEAAQgDAAgDgCg");
	this.shape_1.setTransform(2.1,-15.6);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#333333").s().p("AgKAvQgNgDgKgKQgOgOgBgUQABgTAOgPQAOgOATABQAUgBAOAOQAPAPAAATQAAAUgPAOQgHAHgHADQgJAEgLABIgKgCgAAPgYIAAAAQgDADAAAEQAAAEADADQADACAEAAQAEAAADgCQAAgBABAAQAAgBABAAQAAgBAAAAQAAgBABAAIAAgDQAAgEgDgDQgDgCgEgBQgEABgDACg");
	this.shape_2.setTransform(-0.1,-13.8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.9,-18.6,9.9,18.6);


(lib.Cancer_cissor_open = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF3300").s().p("Ag7CGQgQgBgLgGICjhxIAAABQAMAXgTAeQgSAegmAUQghAQgeAAIgKAAgAg2iEQAMgDAPADQAiAFAgAbQAhAcALAiQALAhgRATg");
	this.shape.setTransform(-7.705,-1.542);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-16.4,-15,17.4,26.9);


(lib.Cancer_cissor_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF3300").s().p("AhNAtQgNgJgIgKIBQgbIhPgZQAHgKANgIQAegSAsgBQApABAfASQAeASAAAaQAAAbgeASQgfASgpABQgsgBgegSg");
	this.shape.setTransform(-9.85,0);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF3300").s().p("AgOA5QglgOgUgTQgUgUgFgmIAAgBIAAAAQAWgWAggGQAggFAgAJQAhAJAYAaQAYAZgHAZQgHAagiAKQgOAEgPAAQgUAAgUgJg");
	this.shape_1.setTransform(-9.571,-2.6519);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape}]}).to({state:[{t:this.shape_1}]},2).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-19.7,-9.2,19.9,15.6);


(lib.Cancer_cissor_minor_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#33CCFF").s().p("AgXAiQgSgJgGgRQgFgPAKgOQAKgOAUgEQATgDASAKQARAIAFARQAGAQgKAOQgKAOgUACIgMABQgMAAgMgGg");
	this.shape.setTransform(-4.9358,0.0255);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-9.8,-4,9.8,8.1);


(lib.Cancer_cissor_minor_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,0,0);


(lib.Cancer_cissor_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#33CCFF").s().p("AhNAtQgNgJgIgKIBQgbIhPgZQAHgKANgIQAegSAsgBQApABAfASQAeASAAAaQAAAbgeASQgfASgpABQgsgBgegSg");
	this.shape.setTransform(-9.85,0);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-19.7,-6.3,19.7,12.7);


(lib.Cancer_cissor = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF3300").s().p("AhNAtQgNgJgIgKIBQgbIhPgZQAHgKANgIQAegSAsgBQApABAfASQAeASAAAaQAAAbgeASQgfASgpABQgsgBgegSg");
	this.shape.setTransform(-9.85,0);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-19.7,-6.3,19.7,12.7);


(lib.Cancer_body_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,0,0);


(lib.Cancer_body_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#33CCFF").s().p("AiUCUQg9g9AAhXQAAhWA9g+QA+g9BWAAQBXAAA9A9QA+A+AABWQAABXg+A9Qg9A+hXAAQhWAAg+g+g");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-21,-21,42,42);


(lib.Cancer_body_base = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF3300").s().p("AiUCUQg9g9AAhXQAAhWA9g+QA+g9BWAAQBXAAA9A9QA+A+AABWQAABXg+A9Qg9A+hXAAQhWAAg+g+g");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-21,-21,42,42);


(lib.Bear_nose = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#200000").s().p("AgpAqQgSgRAAgZQAAgYASgRQARgSAYAAQAYAAASASQASARAAAYQAAAZgSARQgSASgYAAQgYAAgRgSg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-6,-6,12,12);


(lib.Bear_mouse = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF0000").s().p("AgFAIQgCgDAAgFQAAgEACgDQADgEACAAQADAAACAEQADADAAAEQAAAFgDADQgCADgDABQgCgBgDgDg");

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#200000").s().p("AgmAeIgBAAIAAgOIAAgBIABAAIASAAIAAgdIgSAAIgBAAIAAgBIAAgOIABAAIBNAAIABAAIAAAAIAAAOIAAABIgBAAIgSAAIAAAdIASAAIABAAIAAAPIgBAAgAgFgHQgCADAAAEQAAAFACADQADADACABQADgBACgDQADgDAAgFQAAgEgDgDQgCgEgDAAQgCAAgDAEg");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4,-3,8,6);


(lib.Bear_face_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#33CCFF").s().p("AjTC/QhYhPAAhwQAAhvBYhPQBXhPB8AAQB8AABYBPQBYBPAABvQAABwhYBPQhYBPh8AAQh8AAhXhPg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-30,-27,60,54);


(lib.Bear_face = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFFF66").s().p("AjTC/QhYhPAAhwQAAhvBYhPQBXhPB8AAQB8AABYBPQBYBPAABvQAABwhYBPQhYBPh8AAQh8AAhXhPg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-30,-27,60,54);


(lib.Bear_eye = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#200000").s().p("AgOAOQgFgFAAgJQAAgHAFgGQAHgGAHAAQAJAAAFAGQAGAGAAAHQAAAJgGAFQgFAGgJAAQgHAAgHgGg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-2,-2,4,4);


(lib.Bear_ear_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#0000FF").s().p("AhFBDQgcgcAAgnQAAgnAcgcQAdgbAoAAQApAAAcAbQAdAcAAAnQAAAngdAcQgcAcgpAAQgoAAgdgcg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-9.8,-9.5,19.700000000000003,19);


(lib.Bear_ear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#660000").s().p("AhFBDQgcgcAAgnQAAgnAcgcQAdgbAoAAQApAAAcAbQAdAcAAAnQAAAngdAcQgcAcgpAAQgoAAgdgcg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-9.8,-9.5,19.700000000000003,19);


(lib.YFTs = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.yfts();
	this.instance.parent = this;
	this.instance.setTransform(-214.35,-15.95,0.5068,0.5068,-19.2189);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-214.3,-145.7,428.70000000000005,291.5);


(lib.Tunnel = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_6 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("Eia2BdwMAAAi7fME1tAAAMAAAC7fgAp+uaQiGCEAAC6QAAC7CGCDQCICFC/gBQDBABCFiFQCIiDAAi7QAAi6iIiEQiFiEjBAAQi/AAiICEg");
	mask.setTransform(991.125,600);

	// tunnel_0002.jpg
	this.instance = new lib.tunnel_0001();
	this.instance.parent = this;

	this.instance_1 = new lib.tunnel_0002();
	this.instance_1.parent = this;

	this.instance_2 = new lib.tunnel_0003();
	this.instance_2.parent = this;

	var maskedShapeInstanceList = [this.instance,this.instance_1,this.instance_2];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},1).to({state:[{t:this.instance_2}]},1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1920,1080);


(lib.T_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.T();
	this.instance.parent = this;
	this.instance.setTransform(-262.85,-110.15,0.5599,0.5599,-22.2584);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-262.8,-262.8,525.7,525.7);


(lib.Start = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF0000").s().p("AgNCaQgFgEAAgHIAAkHIgUAAIgQAAIgUAAIgfAAIgRAAIgGAAIgCAAQgEgBgEgFQgDgFAAgGQAAgFACgEQADgFAEgDIAHgBIAPAAIAbAAIAnAAIAsgBIAsAAIAjgBIATAAIARAAIAJgBQAJAAAFAEQAEAFAAAIQAAAHgDAFQgEAFgFAAIgPACIgbAAIgjABIglABIAAEHQAAAHgFAEQgFAFgGAAQgIAAgFgFg");
	this.shape.setTransform(55.975,1.6);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF0000").s().p("AhiCcQgFgEgCgEIAAgCIAAgBIAFkIIAAAAIgDAAIgCAAIgCAAIAAAAQgFAAgEgFQgDgFgBgHQABgEACgFQACgFAEgCIAEgBIAMgBIAJAAIASgBIAfgBIAfgBIAUgBQAxAAAaAVQAaAUAAAmQAAAngXAaQgYAZgtAKIBcBqIAFAGIABAHQAAAHgHAGQgFAFgIABIgGgBIgGgEIhoiCIgOABIgQAAIgXABIgBB2QAAAGgGAEQgGAFgGAAQgGAAgFgDgAgNh8IgoACIgNAAIgBByIAOAAIAKAAQArABAbgHQAbgHAMgQQALgPAAgaQAAgRgGgLQgGgKgPgEQgOgFgYAAIgZABg");
	this.shape_1.setTransform(27.8,1.6);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FF0000").s().p("AiLCjQgFgFAAgHQAAgCAGgSIATguIAahAIAfhJIAghLIAHgOIAEgMIADgFQABgFADgCQADgCAGAAQAHAAAEAFQAGAEgBAHIAAACIAAADIAAABIgBABIgBABIAWA4IAbA7IAjBJIAwBjIACADIAAADQAAAHgGAFQgFAFgJAAQgGAAgDgDQgDgDgGgKIgbg3IgghHIgphcIgNghIgNAeIgTAtIgOAjIgOAhIAWAAIAfgBIARAAIAKgBIAJAAIAHAAQAGAAAFAEQAFAFAAAHQgBAGgCAEQgCAFgDACIgEABIgIABIgTAAIgbAAIgiACIgHAAIgGAAIgIAAIgDgCIgEAJIgEAKIgJAWIgJAXIgGAPIgCAGIgBACQgCACgDACIgIABQgIAAgFgFg");
	this.shape_2.setTransform(-1.35,1.175);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#FF0000").s().p("AgNCaQgFgEAAgHIAAkHIgUAAIgQAAIgUAAIgfAAIgRAAIgGAAIgCAAQgEgBgEgFQgDgFAAgGQAAgFACgEQADgFAEgDIAHgBIAPAAIAbAAIAnAAIAsgBIAsAAIAjgBIATAAIARAAIAJgBQAJAAAFAEQAEAFAAAIQAAAHgDAFQgEAFgFAAIgPACIgbAAIgjABIglABIAAEHQAAAHgFAEQgFAFgGAAQgIAAgFgFg");
	this.shape_3.setTransform(-30.275,1.6);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#FF0000").s().p("AgyCaQgYgKgRgQQgIgHgEgHQgEgGAAgGQABgIAGgGQAGgGAIAAQAGAAAEACQAEADAEAHQAKAPATAJQATAKAVAAQAgAAARgNQARgNAAgXQAAgVgRgPQgSgPgngNQgigLgVgMQgUgNgJgRQgJgRAAgYQAAgXANgTQAOgTAXgLQAXgLAdAAQARAAAQAFQAQAGANAJQANAJAJANIAHANQADAFAAAEQgBAIgFAFQgGAGgIAAQgGAAgEgDQgEgCgCgGQgIgTgPgJQgPgKgWAAQgdABgQANQgRANAAAXQgBAPAGAKQAGALAOAIQAPAIAZAIQA0ARAaAYQAbAYAAAgQAAAZgOASQgOATgYALQgYALggAAQgZAAgZgJg");
	this.shape_4.setTransform(-57.475,1.225);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-72.4,-33.9,144.8,67.9);


(lib.Nake = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF9900").s().p("AnNLFQgVgTgBggIAAzAIgFAAQgYgBgUgXQgSgXgBgfQABgfASgWQASgWAZgDIPQgNQAbABASAVQARAVABAiQgBAjgRAVQgQAWgcAAIsvANIAAG7IKXgJQAcABASAUQASAVAAAiQAAAkgPAUQgQAWgbgBIqdAKIAAHaIMvgHQAcABARAUQASAWABAhQgBAkgRAVQgRAWgbgBIsxAGQgBAdgWAQQgVASgiAAQgiAAgWgTg");
	this.shape.setTransform(200.075,8.4);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF9900").s().p("An2LEQgWgTAAggIAA0hQAAgfAXgTQAVgVAgAAQAiAAAWAVQAWATAAAfIAAI9QB/hWB9hoQB8hnBshpQBshqBMheQAOgTAPgJQAOgJAUACQAgABAXAWQAYAYAAAiQABAMgFALQgFALgSAWIg9BEQhhBnh6BtQh6BuiQBxIKAKPQAJAJAEAOQAFAOAAAQQgBAmgXAaQgYAZglABQgOAAgOgGQgOgHgLgLIp+qwIgSANQgpAegUANQgUANgUAMIAAI2QAAAggWATQgWAVgigBQgiABgUgVg");
	this.shape_1.setTransform(79.3,5.4);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FF9900").s().p("ApvLYQgYgVgBgfQABgLAehOQAehPA0iAQA0iABCigICKlJQBIirBHikIAchAIAXg0IAJgYQAHgVAOgIQAPgJAZABQAhAAAWAUQAVATABAcIgBALIgEAPIAAABIgDAFIgEAGQAxB9AzB7QA1B7BBCQQBCCOBbC8QBaC8B+D+QAFAJABAGQABAGAAAHQAAAfgZAVQgYAWglABQgcABgPgNQgPgNgWgtQg4huhAiJQhBiJhRi1QhQizhpjuIg9iQIg3CDIhWDJIhCChIg7CUIBfgCICJgBIBVgBQAlgBAHgCIAngCIAbgBQAgABAVAVQAUAUAAAhQABAXgKAUQgIAVgRAJQgEAFgLABQgLABgcABIhTACIh9ACQhIAChRADIgiABIgXABQgaAAgIgCQgKgCgHgFIgSAqIgQAqIgoBkIgpBnIgYBDIgMAbIgEAIQgIALgPAGQgOAGgTAAQgkgBgXgWg");
	this.shape_2.setTransform(-56.8,5.2952);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#FF9900").s().p("An+LNQgUgLgFgNIgNgdIADgHIAXzeIgRgXQgEgGgEgJQgCgKAAgLQABgiAWgVQAWgUAlgBQAWgBAOAKQAOAJAbAiQCiDTDCEVQDCETDpFgIAAxLQABgfAWgTQAWgVAiAAQAiAAAWAVQAVATABAfIAATtQgBAygbAfQgbAeguABQgYAAgWgLQgWgKgPgSIgJgPIgdgtQiXjeh9i2Qh6i0hoiSQhpiVhch8IgBDUIgII4QgEDNgDA5QgDAggXATQgXAVghgBQgUAAgVgLg");
	this.shape_3.setTransform(-194.15,5.4);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-265.6,-144.8,531.2,289.70000000000005);


(lib.CircleFrame = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#000000").ss(6,1,1).p("APoAAQAAGekkElQklElmfAAQmdAAklklQklklAAmeQAAmeElklQElkkGdAAQGfAAElEkQEkElAAGeg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-103,-103,206,206);


(lib.Stage_t = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#00CC00").s().p("AhIMtQgYgXgBglIAA1xIhqABIhXABIhnAAIilAAIhVAAIgigBQgHAAgCgBQgZgEgSgZQgSgZgBggQABgaAOgYQAOgZAUgLQAKgFAagCQAZgCA2ACICMgDIDQgCIDtgDIDmgCIC5gBIBmAAIBXgEIAwgCQAuABAZAXQAZAYAAAqQgBAkgSAaQgTAagaAFIhOADIiQAEQhVAChhABIjEADIAAVxQgBAlgaAXQgZAYgnAAQgoAAgagYg");
	this.shape.setTransform(0,0.025);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-74.9,-83.6,149.8,167.3);


(lib.Stage_g = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#00CC00").s().p("AGiNHQgYgXgCgoIgIjsQhgCih2BLQh2BLidgBQjegBifhmQihhohVi+QhWi/gBkIQABi0A+ibQA/icBuh2QBvh2CShCQCRhCCogBQCGABB3AzQB2A0BRBeQAZAbAJAUQAJATgBAWQAAAsgaAcQgaAbgrAAQgYABgSgKQgTgJgOgVQgyhOhXgsQhWgshoAAQipACiIBbQiIBbhQCbQhQCagCDCQABDPA9CTQA/CVBzBPQB0BPChABQCrABB1h6QB2h6BGj9IAAgwIkuAEQgegBgWgcQgUgagBglQABgkATgaQAVgaAegBIKkgEQAdABAWAcQAVAbACAjQgBAlgVAaQgVAagdABIi+AEIAWJ8QABAqgaAcQgbAbgtABQgqgBgXgWg");
	this.shape.setTransform(0.025,0.025);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-82,-86.2,164.1,172.5);


(lib.Stage_e = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#00CC00").s().p("AofNBQgYgWgBglIAA2XIgGAAQgdgBgWgbQgWgagBgmQABgkAVgaQAVgbAdgCIR8gPQAhABAUAYQAVAZABAoQgBApgUAZQgTAaghAAIu+AOIAAIJIMLgJQAhABAVAYQAVAYABApQgBApgRAYQgTAagggBIsSALIAAIuIO+gIQAhABAUAYQAVAZABAoQgBApgUAaQgTAZggAAIvBAFQgCAjgZATQgZAVgoAAQgpAAgagXg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-64.9,-85.6,129.8,171.2);


(lib.Stage_a = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#00CC00").s().p("ArdNYQgdgYAAglQABgNAjhcQAjhcA9iXQA9iXBPi8ICimDQBUjJBVjCIAfhLIAbg9IAKgcQAJgYARgKQASgLAdABQAnAAAaAYQAYAWACAhIgCANIgEASIAAACIgDAFIgFAHQA5CUA9CQQA9CRBOCpQBNCoBrDcQBqDdCTEsQAGAKACAHQACAHAAAIQgBAlgdAZQgdAZgrABQggACgSgQQgSgOgag2QhBiBhNihQhMihhejVQhfjTh7kYIhJiqIhACaIhlDtIhOC+IhFCuIEQgEIBkgBQAtgBAIgCIAsgDIAigBQAlABAZAYQAWAZABAmQAAAbgKAYQgLAYgSALQgGAGgNABQgMACghAAIhhACIiUADQhVAChfAEIgoABIgcABQgeAAgKgCQgLgDgJgGIgUAyIgTAxIgvB2IgxB5IgdBPIgMAgQgDAHgDACQgJANgSAHQgQAHgWAAQgrgBgbgag");
	this.shape.setTransform(0,0.0207);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-76.3,-88.2,152.6,176.5);


(lib.Num_8 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Num
	this.text = new cjs.Text("8", "1100px 'Cambria'", "#00CC00");
	this.text.lineHeight = 1292;
	this.text.lineWidth = 612;
	this.text.parent = this;
	this.text.setTransform(-375.75,-566.6,0.8974,0.8974);

	this.timeline.addTween(cjs.Tween.get(this.text).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-377.5,-568.4,552.6,1208.6);


(lib.Num_7 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Num
	this.text = new cjs.Text("7", "1100px 'Cambria'", "#00CC00");
	this.text.lineHeight = 1292;
	this.text.lineWidth = 612;
	this.text.parent = this;
	this.text.setTransform(-375.75,-566.6,0.8974,0.8974);

	this.timeline.addTween(cjs.Tween.get(this.text).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-377.5,-568.4,552.6,1208.6);


(lib.Num_6 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Num
	this.text = new cjs.Text("6", "1100px 'Cambria'", "#00CC00");
	this.text.lineHeight = 1292;
	this.text.lineWidth = 612;
	this.text.parent = this;
	this.text.setTransform(-375.75,-566.6,0.8974,0.8974);

	this.timeline.addTween(cjs.Tween.get(this.text).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-377.5,-568.4,552.6,1208.6);


(lib.Num_5 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Num
	this.text = new cjs.Text("5", "1100px 'Cambria'", "#00CC00");
	this.text.lineHeight = 1292;
	this.text.lineWidth = 612;
	this.text.parent = this;
	this.text.setTransform(-375.75,-566.6,0.8974,0.8974);

	this.timeline.addTween(cjs.Tween.get(this.text).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-377.5,-568.4,552.6,1208.6);


(lib.Num_4 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Num
	this.text = new cjs.Text("4", "1100px 'Cambria'", "#00CC00");
	this.text.lineHeight = 1292;
	this.text.lineWidth = 612;
	this.text.parent = this;
	this.text.setTransform(-375.75,-566.6,0.8974,0.8974);

	this.timeline.addTween(cjs.Tween.get(this.text).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-377.5,-568.4,552.6,1208.6);


(lib.Num_3 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Num
	this.text = new cjs.Text("3", "1100px 'Cambria'", "#00CC00");
	this.text.lineHeight = 1292;
	this.text.lineWidth = 612;
	this.text.parent = this;
	this.text.setTransform(-349.85,-640.85);

	this.timeline.addTween(cjs.Tween.get(this.text).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-351.8,-642.8,615.7,1346.6999999999998);


(lib.Num_2 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Num
	this.text = new cjs.Text("2", "1100px 'Cambria'", "#00CC00");
	this.text.lineHeight = 1292;
	this.text.lineWidth = 612;
	this.text.parent = this;
	this.text.setTransform(-375.75,-566.6,0.8974,0.8974);

	this.timeline.addTween(cjs.Tween.get(this.text).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-377.5,-568.4,552.6,1208.6);


(lib.Num_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.text = new cjs.Text("1", "1100px 'Cambria'", "#00CC00");
	this.text.lineHeight = 1292;
	this.text.lineWidth = 612;
	this.text.parent = this;
	this.text.setTransform(-268.6,-588.15,0.8974,0.8974);

	this.timeline.addTween(cjs.Tween.get(this.text).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-270.4,-589.9,552.5999999999999,1208.6);


(lib.Go = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF0000").s().p("AiqDMQg6hEgBiBQAAhSAeg/QAehAA0gjQA0gkBEAAQBEAAAzAjQAzAiAcA+QAcA+ABBRQgBBSgdA9QgdA+g0AiQg0AihFAAQhtgBg7hFgAhTi5QgnAdgVAyQgWAyAABAQAABoApA0QApAzBSAAQAwAAAlgcQAmgcAWgwQAWgwAAg+QgBhAgUgxQgUgwglgbQglgbgxAAQgwAAglAdg");
	this.shape.setTransform(24.35,2.425);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF0000").s().p("ACGEMQgIgHgBgNIgChLQgeA0gnAYQgmAYgxAAQhHgBgzghQgzghgcg9Qgbg9gBhUQABg5AUgyQAUgyAjglQAkgmAvgVQAugWA2AAQAqAAAmARQAmARAaAeQAIAIACAHQADAGAAAHQAAAOgIAJQgJAJgNAAQgIAAgGgDQgGgDgEgHQgQgZgcgOQgbgOghAAQg2ABgsAdQgsAdgZAxQgZAygCA9QABBCATAvQAVAwAlAZQAlAZA0ABQA2AAAlgnQAlgnAXhRIAAgPIhgABQgLAAgGgJQgHgJAAgLQAAgMAHgHQAGgJAKAAIDYgBQAKAAAGAJQAHAIAAALQAAAMgGAIQgHAIgJABIg+ABIAIDLQAAAOgIAJQgJAJgOAAQgOAAgHgIg");
	this.shape_1.setTransform(-27.75,2.575);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-58.8,-55.4,111.1,111.6);


(lib.bg_area_01 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#BAD5F7").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


(lib.VmaxGauge_base = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// frame
	this.frame = new lib.Frame();
	this.frame.name = "frame";
	this.frame.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.frame).wait(40));

	// cover
	this.cover = new lib.cover();
	this.cover.name = "cover";
	this.cover.parent = this;
	this.cover.setTransform(100,15,1,1,0,0,0,100,15);

	this.timeline.addTween(cjs.Tween.get(this.cover).wait(40));

	// mask (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	var mask_graphics_0 = new cjs.Graphics().p("AvnCWIAAkrIfPAAIAAErg");
	var mask_graphics_1 = new cjs.Graphics().p("AvOCWIAAkrIedAAIAAErg");
	var mask_graphics_2 = new cjs.Graphics().p("Au0CWIAAkrIdpAAIAAErg");
	var mask_graphics_3 = new cjs.Graphics().p("AubCWIAAkrIc3AAIAAErg");
	var mask_graphics_4 = new cjs.Graphics().p("AuBCWIAAkrIcDAAIAAErg");
	var mask_graphics_5 = new cjs.Graphics().p("AtoCWIAAkrIbRAAIAAErg");
	var mask_graphics_6 = new cjs.Graphics().p("AtOCWIAAkrIadAAIAAErg");
	var mask_graphics_7 = new cjs.Graphics().p("As1CWIAAkrIZrAAIAAErg");
	var mask_graphics_8 = new cjs.Graphics().p("AsbCWIAAkrIY3AAIAAErg");
	var mask_graphics_9 = new cjs.Graphics().p("AsCCWIAAkrIYFAAIAAErg");
	var mask_graphics_10 = new cjs.Graphics().p("AroCWIAAkrIXRAAIAAErg");
	var mask_graphics_11 = new cjs.Graphics().p("ArPCWIAAkrIWfAAIAAErg");
	var mask_graphics_12 = new cjs.Graphics().p("Aq2CWIAAkrIVtAAIAAErg");
	var mask_graphics_13 = new cjs.Graphics().p("AqcCWIAAkrIU5AAIAAErg");
	var mask_graphics_14 = new cjs.Graphics().p("AqDCWIAAkrIUHAAIAAErg");
	var mask_graphics_15 = new cjs.Graphics().p("AppCWIAAkrITTAAIAAErg");
	var mask_graphics_16 = new cjs.Graphics().p("ApQCWIAAkrIShAAIAAErg");
	var mask_graphics_17 = new cjs.Graphics().p("Ao2CWIAAkrIRtAAIAAErg");
	var mask_graphics_18 = new cjs.Graphics().p("AodCWIAAkrIQ7AAIAAErg");
	var mask_graphics_19 = new cjs.Graphics().p("AoDCWIAAkrIQHAAIAAErg");
	var mask_graphics_20 = new cjs.Graphics().p("AnqCWIAAkrIPVAAIAAErg");
	var mask_graphics_21 = new cjs.Graphics().p("AnQCWIAAkrIOhAAIAAErg");
	var mask_graphics_22 = new cjs.Graphics().p("Am3CWIAAkrINvAAIAAErg");
	var mask_graphics_23 = new cjs.Graphics().p("AmeCWIAAkrIM9AAIAAErg");
	var mask_graphics_24 = new cjs.Graphics().p("AmECWIAAkrIMJAAIAAErg");
	var mask_graphics_25 = new cjs.Graphics().p("AlrCWIAAkrILXAAIAAErg");
	var mask_graphics_26 = new cjs.Graphics().p("AlRCWIAAkrIKjAAIAAErg");
	var mask_graphics_27 = new cjs.Graphics().p("Ak4CWIAAkrIJxAAIAAErg");
	var mask_graphics_28 = new cjs.Graphics().p("AkeCWIAAkrII9AAIAAErg");
	var mask_graphics_29 = new cjs.Graphics().p("AkFCWIAAkrIILAAIAAErg");
	var mask_graphics_30 = new cjs.Graphics().p("AjrCWIAAkrIHXAAIAAErg");
	var mask_graphics_31 = new cjs.Graphics().p("AjSCWIAAkrIGlAAIAAErg");
	var mask_graphics_32 = new cjs.Graphics().p("Ai4CWIAAkrIFxAAIAAErg");
	var mask_graphics_33 = new cjs.Graphics().p("AifCWIAAkrIE/AAIAAErg");
	var mask_graphics_34 = new cjs.Graphics().p("AiGCWIAAkrIENAAIAAErg");
	var mask_graphics_35 = new cjs.Graphics().p("AhsCWIAAkrIDZAAIAAErg");
	var mask_graphics_36 = new cjs.Graphics().p("AhTCWIAAkrICnAAIAAErg");
	var mask_graphics_37 = new cjs.Graphics().p("Ag5CWIAAkrIBzAAIAAErg");
	var mask_graphics_38 = new cjs.Graphics().p("AggCWIAAkrIBBAAIAAErg");
	var mask_graphics_39 = new cjs.Graphics().p("AgGCWIAAkrIANAAIAAErg");

	this.timeline.addTween(cjs.Tween.get(mask).to({graphics:mask_graphics_0,x:100,y:15}).wait(1).to({graphics:mask_graphics_1,x:97.4538,y:15}).wait(1).to({graphics:mask_graphics_2,x:94.9077,y:15}).wait(1).to({graphics:mask_graphics_3,x:92.3615,y:15}).wait(1).to({graphics:mask_graphics_4,x:89.8154,y:15}).wait(1).to({graphics:mask_graphics_5,x:87.2692,y:15}).wait(1).to({graphics:mask_graphics_6,x:84.7231,y:15}).wait(1).to({graphics:mask_graphics_7,x:82.1769,y:15}).wait(1).to({graphics:mask_graphics_8,x:79.6308,y:15}).wait(1).to({graphics:mask_graphics_9,x:77.0846,y:15}).wait(1).to({graphics:mask_graphics_10,x:74.5385,y:15}).wait(1).to({graphics:mask_graphics_11,x:71.9923,y:15}).wait(1).to({graphics:mask_graphics_12,x:69.4462,y:15}).wait(1).to({graphics:mask_graphics_13,x:66.9,y:15}).wait(1).to({graphics:mask_graphics_14,x:64.3539,y:15}).wait(1).to({graphics:mask_graphics_15,x:61.8077,y:15}).wait(1).to({graphics:mask_graphics_16,x:59.2616,y:15}).wait(1).to({graphics:mask_graphics_17,x:56.7154,y:15}).wait(1).to({graphics:mask_graphics_18,x:54.1693,y:15}).wait(1).to({graphics:mask_graphics_19,x:51.6231,y:15}).wait(1).to({graphics:mask_graphics_20,x:49.077,y:15}).wait(1).to({graphics:mask_graphics_21,x:46.5308,y:15}).wait(1).to({graphics:mask_graphics_22,x:43.9847,y:15}).wait(1).to({graphics:mask_graphics_23,x:41.4385,y:15}).wait(1).to({graphics:mask_graphics_24,x:38.8924,y:15}).wait(1).to({graphics:mask_graphics_25,x:36.3462,y:15}).wait(1).to({graphics:mask_graphics_26,x:33.8001,y:15}).wait(1).to({graphics:mask_graphics_27,x:31.2539,y:15}).wait(1).to({graphics:mask_graphics_28,x:28.7078,y:15}).wait(1).to({graphics:mask_graphics_29,x:26.1616,y:15}).wait(1).to({graphics:mask_graphics_30,x:23.6155,y:15}).wait(1).to({graphics:mask_graphics_31,x:21.0693,y:15}).wait(1).to({graphics:mask_graphics_32,x:18.5232,y:15}).wait(1).to({graphics:mask_graphics_33,x:15.977,y:15}).wait(1).to({graphics:mask_graphics_34,x:13.4309,y:15}).wait(1).to({graphics:mask_graphics_35,x:10.8847,y:15}).wait(1).to({graphics:mask_graphics_36,x:8.3386,y:15}).wait(1).to({graphics:mask_graphics_37,x:5.7924,y:15}).wait(1).to({graphics:mask_graphics_38,x:3.2463,y:15}).wait(1).to({graphics:mask_graphics_39,x:0.7248,y:15}).wait(1));

	// bar
	this.shape = new cjs.Shape();
	this.shape.graphics.lf(["#FF0000","#F3D264"],[0,1],-100,0,100,0).s().p("AvnCWIAAkrIfPAAIAAErg");
	this.shape.setTransform(100,15);

	var maskedShapeInstanceList = [this.shape];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(40));

	// cover
	this.instance = new lib.cover();
	this.instance.parent = this;
	this.instance.setTransform(100,15,1,1,0,0,0,100,15);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(40));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-3,-3,206,36);


(lib.VmaxGauge = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Text
	this.text = new cjs.Text("V  -  M  A  X", "25px 'MS Gothic'", "#FFFEB8");
	this.text.lineHeight = 27;
	this.text.lineWidth = 188;
	this.text.parent = this;
	this.text.setTransform(13.9,2.85);

	this.timeline.addTween(cjs.Tween.get(this.text).wait(1));

	// progress
	this.progress = new lib.VmaxGauge_base();
	this.progress.name = "progress";
	this.progress.parent = this;
	this.progress.setTransform(100,15,1,1,0,0,0,100,15);

	this.timeline.addTween(cjs.Tween.get(this.progress).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-3,-3,206.7,36);


(lib.StatusBar = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// vmaxGauge
	this.vmaxGauge = new lib.VmaxGauge();
	this.vmaxGauge.name = "vmaxGauge";
	this.vmaxGauge.parent = this;
	this.vmaxGauge.setTransform(600.3,28,1,1,0,0,0,100.3,15);

	this.timeline.addTween(cjs.Tween.get(this.vmaxGauge).wait(1));

	// keyText
	this.keyText = new cjs.Text("0", "40px 'MS Gothic'", "#660000");
	this.keyText.name = "keyText";
	this.keyText.lineHeight = 42;
	this.keyText.lineWidth = 55;
	this.keyText.parent = this;
	this.keyText.setTransform(882,8.8);

	this.timeline.addTween(cjs.Tween.get(this.keyText).wait(1));

	// KeyBase
	this.instance = new lib.KeyBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(829,29,0.7437,0.7456,0,0,0,12.1,26.8);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	// scoreText
	this.scoreText = new cjs.Text("99999", "40px 'MS Gothic'", "#660000");
	this.scoreText.name = "scoreText";
	this.scoreText.lineHeight = 42;
	this.scoreText.lineWidth = 122;
	this.scoreText.parent = this;
	this.scoreText.setTransform(1062,8);

	this.timeline.addTween(cjs.Tween.get(this.scoreText).wait(1));

	// SCORE
	this.text = new cjs.Text("SCORE", "24px 'Cambria'", "#BDA14C");
	this.text.lineHeight = 30;
	this.text.lineWidth = 72;
	this.text.parent = this;
	this.text.setTransform(962,14);

	this.timeline.addTween(cjs.Tween.get(this.text).wait(1));

	// x
	this.instance_1 = new lib.x("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(857.3,30.6,1,1,0,0,0,7.3,8.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(497,6,689,44.9);


(lib.Head_weak = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Eye
	this.instance = new lib.Eye_weak("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(6,4.45,1,1,0,180,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:-1.85},18).to({y:17.8},24).to({y:5.1},21).wait(1));

	// Eye
	this.instance_1 = new lib.Eye_weak("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(5.75,-7.45);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({y:-13.75},18).to({y:5.9},24).to({y:-6.8},21).wait(1));

	// BodyPart
	this.instance_2 = new lib.BodyPart_weak("synched",0);
	this.instance_2.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({y:-7.7},19).to({y:12.2},24).to({y:0.6},20).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-25.7,36,55.9);


(lib.Head_vmax_weak = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Eye
	this.instance = new lib.Eye_vmax_weak("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(6,4.45,1,1,0,180,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:-1.85},18).to({y:17.8},24).to({y:5.1},21).wait(1));

	// Eye
	this.instance_1 = new lib.Eye_vmax_weak("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(5.75,-7.45);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({y:-13.75},18).to({y:5.9},24).to({y:-6.8},21).wait(1));

	// BodyPart
	this.instance_2 = new lib.BodyPart_vmax_weak("synched",0);
	this.instance_2.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({y:-7.7},19).to({y:12.2},24).to({y:0.6},20).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-25.7,36,55.9);


(lib.Head_vmax = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Eye
	this.instance = new lib.Eye_vmax("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(6,4.45,1,1,0,180,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:-1.85},18).to({y:17.8},24).to({y:5.1},21).wait(1));

	// Eye
	this.instance_1 = new lib.Eye_vmax("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(5.75,-7.45);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({y:-13.75},18).to({y:5.9},24).to({y:-6.8},21).wait(1));

	// BodyPart
	this.instance_2 = new lib.BodyPart_vmax("synched",0);
	this.instance_2.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({y:-7.7},19).to({y:12.2},24).to({y:0.6},20).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-25.7,36,55.9);


(lib.Head = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Eye
	this.instance = new lib.Eye("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(6,4.45);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:-1.85},18).to({y:17.8},24).to({y:5.1},21).wait(1));

	// Eye
	this.instance_1 = new lib.Eye("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(5.75,-7.45);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({y:-13.75},18).to({y:5.9},24).to({y:-6.8},21).wait(1));

	// BodyPart
	this.instance_2 = new lib.BodyPart("synched",0);
	this.instance_2.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({y:-7.7},19).to({y:12.2},24).to({y:0.6},20).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-25.7,36,55.9);


(lib.Body = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// BodyPart
	this.instance = new lib.BodyPart("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:-10.5},22).to({y:9.85},25).to({y:0.3},24).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-28.5,36,56.4);


(lib.Bubble_break = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble_body("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,48.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:48.5,regY:48.5,scaleX:4.8614,scaleY:4.8614,x:47.8,y:47.8,alpha:0},11,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-188,-188,473.5,473.5);


(lib.Bubble = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble_body("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,48.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:79.5},29).to({x:54.3},30).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,128.2,97.4);


(lib.Wine_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Wine_base("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(14,18.75,0.0481,0.0481,0,0,0,13.5,18.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:14,regY:18.6,scaleX:1.1028,scaleY:1.1028,rotation:374.999,x:16.25,y:15.7},17,cjs.Ease.quadOut).to({regX:13.9,regY:18.7,scaleX:1,scaleY:1,rotation:348.7653,x:14,y:18.75},3).to({regX:14,rotation:360,y:18.7},2).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-3.8,-8,39,46.9);


(lib.Wine = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{normal:0,spawn:6});

	// Key
	this.normal = new lib.Wine_base();
	this.normal.name = "normal";
	this.normal.parent = this;
	this.normal.setTransform(30,30.7,1,1,0,0,0,14,18.7);

	this.spawn = new lib.Wine_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(30,22.6,1,1,0,0,0,14,18.7);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},6).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(15,11,30,39.5);


(lib.Key_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.KeyBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(12,26.85,0.0183,0.0183,0,0,0,11,27.4);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:12,regY:26.8,scaleX:1,scaleY:1,rotation:732.7064},11,cjs.Ease.quadOut).to({rotation:718.2958,x:12.05},2).wait(1).to({rotation:720,x:12,y:26.8},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-11.6,0,47.800000000000004,55.1);


(lib.Key_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.KeyBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(12,26.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,24,53.7);


(lib.Key = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":6});

	// Key
	this.normal = new lib.Key_normal();
	this.normal.name = "normal";
	this.normal.parent = this;
	this.normal.setTransform(18,3.25);

	this.spawn = new lib.Key_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(30,26.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},6).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(18,3.3,24,53.6);


(lib.Gate_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Gate_wave();
	this.instance.parent = this;
	this.instance.setTransform(30,30,0.6393,0.6393);
	this.instance._off = true;

	this.instance_1 = new lib.Gate_outer();
	this.instance_1.parent = this;
	this.instance_1.setTransform(30.85,30.85,8.494,8.494,0,0,0,0.1,0.1);
	this.instance_1.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},2).to({state:[{t:this.instance_1}]},10).to({state:[]},1).wait(33));
	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({_off:false},0).to({_off:true,regX:0.1,regY:0.1,scaleX:8.494,scaleY:8.494,x:30.85,y:30.85,alpha:0},10,cjs.Ease.quadOut).wait(34));

	// レイヤー_2
	this.instance_2 = new lib.Gate_wave();
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30,0.7383,0.7383);

	this.instance_3 = new lib.Gate_outer();
	this.instance_3.parent = this;
	this.instance_3.setTransform(30.85,30.85,8.494,8.494,0,0,0,0.1,0.1);
	this.instance_3.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_2}]}).to({state:[{t:this.instance_3}]},10).to({state:[]},1).wait(35));
	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({_off:true,regX:0.1,regY:0.1,scaleX:8.494,scaleY:8.494,x:30.85,y:30.85,alpha:0},10,cjs.Ease.quadOut).wait(36));

	// レイヤー_1
	this.instance_4 = new lib.Gate_inner();
	this.instance_4.parent = this;
	this.instance_4.setTransform(30,30,0.0859,0.0859);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(2).to({_off:false},0).to({scaleX:1.4825,scaleY:1.4825,rotation:1080},37,cjs.Ease.quadOut).to({scaleX:1,scaleY:1},6).wait(1));

	// レイヤー_3
	this.instance_5 = new lib.Gate_outer();
	this.instance_5.parent = this;
	this.instance_5.setTransform(30,30,4.5667,4.5667);
	this.instance_5.alpha = 0;
	this.instance_5._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(2).to({_off:false},0).to({scaleX:6.1107,scaleY:6.1107,rotation:757.5983,y:30.1,alpha:0.3672},8,cjs.Ease.quadOut).to({scaleX:0.95,scaleY:0.95,rotation:-360,y:30,alpha:1},31,cjs.Ease.quadInOut).to({scaleX:1,scaleY:1,rotation:-360},4).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-227.1,-227,514.8,514.7);


(lib.Gate_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Gate_base("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:29.9,regY:29.9,scaleX:1.2033,scaleY:1.2033,rotation:536.1879,x:29.85,y:29.85,startPosition:22},22).to({scaleX:0.9998,scaleY:0.9998,rotation:360,startPosition:45},23).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-6.4,-6.4,72.30000000000001,72.30000000000001);


(lib.Coin_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.CoinBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30.05,30.05,0.1333,0.1333,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleX:1,scaleY:1,rotation:360,x:30,y:30},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(7.5,7.5,45.1,45.1);


(lib.Coin_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.CoinBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(20.1,22.6,1,1,0,0,0,20.1,22.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(7.5,7.5,45.1,45.1);


(lib.Coin = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":6});

	// Key
	this.normal = new lib.Coin_normal();
	this.normal.name = "normal";
	this.normal.parent = this;

	this.spawn = new lib.Coin_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(10,5.75);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},6).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(7.5,7.5,45.1,45.1);


(lib.Berry_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.BerryBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(20.15,22.6,0.0819,0.0819,0,0,0,20.2,22.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:20.1,scaleX:1,scaleY:1,rotation:360,x:20.1},23,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1,-1,42.3,47.3);


(lib.Berry_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.BerryBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(20.1,22.6,1,1,0,0,0,20.1,22.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1,-1,42.3,47.3);


(lib.Berry = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":6});

	// Key
	this.normal = new lib.Berry_normal();
	this.normal.name = "normal";
	this.normal.parent = this;
	this.normal.setTransform(10,5.75);

	this.spawn = new lib.Berry_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(10,5.75);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},6).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(9.5,5.3,41.3,46.2);


(lib.Apple_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Apple_base("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(20.05,21.85,0.0575,0.0575,102.9992,0,0,20.9,21.1);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:20.1,regY:21.8,scaleX:1.125,scaleY:1.125,rotation:740.7144,x:22.45,y:19.65},21,cjs.Ease.quadIn).to({regX:20,scaleX:1,scaleY:1,rotation:703.7558,x:15.9,y:22.05},4).to({regX:19.9,regY:21.9,rotation:722.7026,x:20.05,y:21.9},3).wait(1).to({rotation:719.9991,x:20,y:21.85},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-3,-6.1,48.2,52.800000000000004);


(lib.Apple = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":6});

	// Key
	this.normal = new lib.Apple_base();
	this.normal.name = "normal";
	this.normal.parent = this;
	this.normal.setTransform(30,29.55,1,1,0,0,0,20,21.8);

	this.spawn = new lib.Apple_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(30,25.8,1,1,0,0,0,20,21.8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},6).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(10,5.3,40,48.5);


(lib.Spider_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Spider_eye
	this.instance = new lib.Spider_eye_fear("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(33.1,35.4,1.6537,1.6537,-3.7182,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({y:33.4},0).wait(2));

	// Spider_eye
	this.instance_1 = new lib.Spider_eye_fear("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(26.4,33.85,1.6537,1.6537,-3.7182,0,0,0,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(2).to({y:35.85},0).wait(2));

	// Spider_body
	this.instance_2 = new lib.Spider_body_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(28.85,21.3,1.6537,1.6537,-3.7182);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(2).to({regX:0.1,regY:0.1,rotation:4.5297,x:30.6,y:21.45},0).wait(2));

	// レイヤー_13
	this.instance_3 = new lib.Spider_legs_fear("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(47.4,32.8,1,1,0,0,180,-13.9,0);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(2).to({regX:-14,scaleX:0.755,x:44.05},0).wait(2));

	// Spider_legs_fear
	this.instance_4 = new lib.Spider_legs_fear("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(11.4,33,1,1,0,0,0,-13.9,0);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(2).to({regX:-13.8,scaleX:0.8775,x:13.2},0).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-3.4,0.1,65.7,54.699999999999996);


(lib.Spider_defeated = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Spider_eye
	this.instance = new lib.Spider_eye_fear("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(33.1,35.4,1.6537,1.6537,-3.7182,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleY:6.873,rotation:124.2084,x:49.1,y:38.4,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_eye
	this.instance_1 = new lib.Spider_eye_fear("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(26.4,33.85,1.6537,1.6537,-3.7182,0,0,0,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regY:0.3,scaleX:1.6536,scaleY:8.9491,rotation:-134.1314,x:12.6,y:38.2,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_body
	this.instance_2 = new lib.Spider_body_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(28.85,21.3,1.6537,1.6537,-3.7182);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({regX:0.1,regY:0.3,scaleX:3.6094,scaleY:3.4107,x:28.55,y:10.75,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_4
	this.instance_3 = new lib.Spider_leg_fear("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(34.7,39.9,1.6537,1.6537,0,0,180);

	this.instance_4 = new lib.Spider_leg_4("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(24.9,63.05,1.6537,1.6537,0,67.2029,-112.7971,-0.1,0.1);
	this.instance_4.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_3}]}).to({state:[{t:this.instance_4}]},17).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({_off:true,regX:-0.1,regY:0.1,skewX:67.2029,skewY:247.2029,x:24.9,y:63.05,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_3
	this.instance_5 = new lib.Spider_leg_3_fear("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(35.95,36.4,1.6537,1.6537,0,0,180);

	this.instance_6 = new lib.Spider_leg_3("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(64.75,50,1.6537,1.6537,0,72.9505,-107.0495,-0.1,0.1);
	this.instance_6.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_5}]}).to({state:[{t:this.instance_6}]},17).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({_off:true,regX:-0.1,regY:0.1,skewX:72.9505,skewY:252.9505,x:64.75,y:50,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_2
	this.instance_7 = new lib.Spider_leg_2_fear("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(35.7,34.7,1.6537,1.6537,0,0,180);

	this.instance_8 = new lib.Spider_leg_2("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(73.15,16.25,1.6537,1.6537,0,16.2145,-163.7855);
	this.instance_8.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_7}]}).to({state:[{t:this.instance_8}]},17).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_7).to({_off:true,skewX:16.2145,skewY:196.2145,x:73.15,y:16.25,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_1
	this.instance_9 = new lib.Spider_leg_1_fear("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(35.85,29.05,1.6537,1.6537,0,0,180);

	this.instance_10 = new lib.Spider_leg_1("synched",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(50.6,-5.6,1.6536,1.6536,0,-43.2064,136.7936,-0.1,0.1);
	this.instance_10.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_9}]}).to({state:[{t:this.instance_10}]},17).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_9).to({_off:true,regX:-0.1,regY:0.1,scaleX:1.6536,scaleY:1.6536,skewX:-43.2064,skewY:136.7936,x:50.6,y:-5.6,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_4
	this.instance_11 = new lib.Spider_leg_fear("synched",0);
	this.instance_11.parent = this;
	this.instance_11.setTransform(25.6,39.9,1.6537,1.6537);

	this.instance_12 = new lib.Spider_leg_4("synched",0);
	this.instance_12.parent = this;
	this.instance_12.setTransform(-5.85,53.5,1.6537,1.6537,-26.7268,0,0,0.1,0.1);
	this.instance_12.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_11}]}).to({state:[{t:this.instance_12}]},17).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_11).to({_off:true,regX:0.1,regY:0.1,rotation:-26.7268,x:-5.85,y:53.5,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_3
	this.instance_13 = new lib.Spider_leg_3_fear("synched",0);
	this.instance_13.parent = this;
	this.instance_13.setTransform(24.35,36.4,1.6537,1.6537);

	this.instance_14 = new lib.Spider_leg_3("synched",0);
	this.instance_14.parent = this;
	this.instance_14.setTransform(-5.55,39.9,1.6537,1.6537,44.4957,0,0,0.1,0.1);
	this.instance_14.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_13}]}).to({state:[{t:this.instance_14}]},17).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_13).to({_off:true,regX:0.1,regY:0.1,rotation:44.4957,x:-5.55,y:39.9,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_2
	this.instance_15 = new lib.Spider_leg_2_fear("synched",0);
	this.instance_15.parent = this;
	this.instance_15.setTransform(24.65,34.7,1.6537,1.6537);

	this.instance_16 = new lib.Spider_leg_2("synched",0);
	this.instance_16.parent = this;
	this.instance_16.setTransform(-3.7,11.15,1.6537,1.6537,27.9524);
	this.instance_16.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_15}]}).to({state:[{t:this.instance_16}]},17).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_15).to({_off:true,rotation:27.9524,x:-3.7,y:11.15,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_1
	this.instance_17 = new lib.Spider_leg_1_fear("synched",0);
	this.instance_17.parent = this;
	this.instance_17.setTransform(24.5,29.05,1.6537,1.6537);

	this.instance_18 = new lib.Spider_leg_1("synched",0);
	this.instance_18.parent = this;
	this.instance_18.setTransform(15.45,-10.4,1.6537,1.6537,51.7453,0,0,0,0.1);
	this.instance_18.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_17}]}).to({state:[{t:this.instance_18}]},17).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_17).to({_off:true,regY:0.1,rotation:51.7453,x:15.45,y:-10.4,alpha:0},17,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-29.8,-39,126.89999999999999,127.5);


(lib.Spider_web = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Spider_singleWeb("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0,0,1,1,-160.6142);

	this.instance_1 = new lib.Spider_singleWeb("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(0,0,1,1,-174.1468);

	this.instance_2 = new lib.Spider_singleWeb("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(0,0,1,1,172.9045);

	this.instance_3 = new lib.Spider_singleWeb("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(0,0,1,1,119.928);

	this.instance_4 = new lib.Spider_singleWeb("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(0,0,0.9999,0.9999,106.396);

	this.instance_5 = new lib.Spider_singleWeb("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(0,0,1,1,93.4451);

	this.instance_6 = new lib.Spider_singleWeb("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(0,0,1,1,159.4257);

	this.instance_7 = new lib.Spider_singleWeb("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(0,0,1,1,145.8931);

	this.instance_8 = new lib.Spider_singleWeb("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(0,0,1,1,132.9422);

	this.instance_9 = new lib.Spider_singleWeb("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(0,0,1,1,-39.129);

	this.instance_10 = new lib.Spider_singleWeb("synched",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(0,0,1,1,-52.6609);

	this.instance_11 = new lib.Spider_singleWeb("synched",0);
	this.instance_11.parent = this;
	this.instance_11.setTransform(0,0,1,1,-65.6118);

	this.instance_12 = new lib.Spider_singleWeb("synched",0);
	this.instance_12.parent = this;
	this.instance_12.setTransform(0,0,1,1,-118.5865);

	this.instance_13 = new lib.Spider_singleWeb("synched",0);
	this.instance_13.parent = this;
	this.instance_13.setTransform(0,0,0.9999,0.9999,-132.1191);

	this.instance_14 = new lib.Spider_singleWeb("synched",0);
	this.instance_14.parent = this;
	this.instance_14.setTransform(0,0,1,1,-145.0695);

	this.instance_15 = new lib.Spider_singleWeb("synched",0);
	this.instance_15.parent = this;
	this.instance_15.setTransform(0,0,1,1,-79.0904);

	this.instance_16 = new lib.Spider_singleWeb("synched",0);
	this.instance_16.parent = this;
	this.instance_16.setTransform(0,0,1,1,-92.622);

	this.instance_17 = new lib.Spider_singleWeb("synched",0);
	this.instance_17.parent = this;
	this.instance_17.setTransform(0,0,1,1,-105.572);

	this.instance_18 = new lib.Spider_singleWeb("synched",0);
	this.instance_18.parent = this;
	this.instance_18.setTransform(0,0,1,1,79.3859);

	this.instance_19 = new lib.Spider_singleWeb("synched",0);
	this.instance_19.parent = this;
	this.instance_19.setTransform(0,0,1,1,65.8536);

	this.instance_20 = new lib.Spider_singleWeb("synched",0);
	this.instance_20.parent = this;
	this.instance_20.setTransform(0,0,1,1,52.9035);

	this.instance_21 = new lib.Spider_singleWeb("synched",0);
	this.instance_21.parent = this;
	this.instance_21.setTransform(0,0,1,1,-0.0717);

	this.instance_22 = new lib.Spider_singleWeb("synched",0);
	this.instance_22.parent = this;
	this.instance_22.setTransform(0,0,1,1,-13.6039);

	this.instance_23 = new lib.Spider_singleWeb("synched",0);
	this.instance_23.parent = this;
	this.instance_23.setTransform(0,0,1,1,-26.5545);

	this.instance_24 = new lib.Spider_singleWeb("synched",0);
	this.instance_24.parent = this;
	this.instance_24.setTransform(0,0,1,1,39.4249);

	this.instance_25 = new lib.Spider_singleWeb("synched",0);
	this.instance_25.parent = this;
	this.instance_25.setTransform(0,0,1,1,25.8925);

	this.instance_26 = new lib.Spider_singleWeb("synched",0);
	this.instance_26.parent = this;
	this.instance_26.setTransform(0,0,1,1,12.9423);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_26},{t:this.instance_25},{t:this.instance_24},{t:this.instance_23},{t:this.instance_22},{t:this.instance_21},{t:this.instance_20},{t:this.instance_19},{t:this.instance_18},{t:this.instance_17},{t:this.instance_16},{t:this.instance_15},{t:this.instance_14},{t:this.instance_13},{t:this.instance_12},{t:this.instance_11},{t:this.instance_10},{t:this.instance_9},{t:this.instance_8},{t:this.instance_7},{t:this.instance_6},{t:this.instance_5},{t:this.instance_4},{t:this.instance_3},{t:this.instance_2},{t:this.instance_1},{t:this.instance}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-69,-69,137.7,138.1);


(lib.Spider_legs_move_2 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Spider_leg_4
	this.instance = new lib.Spider_leg_4("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0.6,7.05,1.6537,1.6537);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:0.1,regY:0.1,scaleX:1.6536,scaleY:1.6536,rotation:0.0196,x:0.7,y:7.15},23,cjs.Ease.quadInOut).wait(1));

	// Spider_leg_3
	this.instance_1 = new lib.Spider_leg_3("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(-0.65,3.55,1.6537,1.6537);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regX:0.1,regY:0.1,scaleX:1.6536,scaleY:1.6536,rotation:0.037,x:-0.5,y:3.65},23,cjs.Ease.quadInOut).wait(1));

	// Spider_leg_2
	this.instance_2 = new lib.Spider_leg_2("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(-0.35,1.85,1.6537,1.6537);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({scaleX:1.6536,scaleY:1.6536,rotation:0.0264,x:-0.4},23,cjs.Ease.quadInOut).wait(1));

	// Spider_leg_1
	this.instance_3 = new lib.Spider_leg_1("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(-0.5,-3.8,1.6537,1.6537);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({scaleX:1.655,scaleY:1.6536,rotation:0.0328,x:-0.45},23,cjs.Ease.quadInOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-29.4,-22.3,31.2,44.7);


(lib.Spider_legs_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Spider_leg_4
	this.instance = new lib.Spider_leg_4("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0.6,7.05,1.6537,1.6537);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:0.1,regY:0.1,rotation:2.9858,x:0.55,y:7.2},15,cjs.Ease.quadInOut).wait(1).to({regX:-6.3,regY:4.1,rotation:2.9024,x:-10.35,y:13.2},0).wait(1).to({rotation:2.6749,x:-10.3,y:13.25},0).wait(1).to({rotation:2.2763,x:-10.25,y:13.35},0).wait(1).to({rotation:1.7217,x:-10.15,y:13.5},0).wait(1).to({rotation:1.1142,x:-10.1,y:13.6},0).wait(1).to({rotation:0.5939,x:-9.95,y:13.7},0).wait(1).to({rotation:0.2301,y:13.75},0).wait(1).to({regX:0.1,regY:0.1,scaleX:1.6536,scaleY:1.6536,rotation:0.0196,x:0.7,y:7.15},0).wait(1));

	// Spider_leg_3
	this.instance_1 = new lib.Spider_leg_3("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(-0.65,3.55,1.6537,1.6537);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regX:0.1,regY:0.1,rotation:5.7516,x:-0.9,y:3.7},15,cjs.Ease.quadInOut).wait(1).to({regX:-6.9,regY:1,rotation:5.591,x:-12.5,y:4.05},0).wait(1).to({rotation:5.1528,y:4.15},0).wait(1).to({rotation:4.3848,y:4.3},0).wait(1).to({rotation:3.3164,x:-12.35,y:4.5},0).wait(1).to({rotation:2.1459,x:-12.2,y:4.7},0).wait(1).to({scaleX:1.6536,scaleY:1.6536,rotation:1.1435,x:-12.15,y:4.9},0).wait(1).to({rotation:0.4427,x:-12.05,y:5.05},0).wait(1).to({regX:0.1,regY:0.1,rotation:0.037,x:-0.5,y:3.65},0).wait(1));

	// Spider_leg_2
	this.instance_2 = new lib.Spider_leg_2("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(-0.35,1.85,1.6537,1.6537);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({rotation:3.9407,x:-1.35},15,cjs.Ease.quadInOut).wait(1).to({regX:-7.3,regY:-3.9,rotation:3.8307,x:-12.9,y:-5.45},0).wait(1).to({rotation:3.5305,y:-5.4},0).wait(1).to({rotation:3.0045,x:-12.8,y:-5.3},0).wait(1).to({rotation:2.2727,x:-12.7,y:-5.15},0).wait(1).to({rotation:1.4709,x:-12.65,y:-4.95},0).wait(1).to({scaleX:1.6536,scaleY:1.6536,rotation:0.7844,x:-12.5,y:-4.8},0).wait(1).to({rotation:0.3043,x:-12.45,y:-4.7},0).wait(1).to({regX:0,regY:0,rotation:0.0264,x:-0.4,y:1.85},0).wait(1));

	// Spider_leg_1
	this.instance_3 = new lib.Spider_leg_1("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(-0.5,-3.8,1.6537,1.6537);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({scaleX:1.709,rotation:5.2115},15,cjs.Ease.quadInOut).wait(1).to({regX:-8.3,regY:-4.9,scaleX:1.7075,rotation:5.0659,x:-13.85,y:-13.1},0).wait(1).to({scaleX:1.7033,rotation:4.6688,x:-13.9,y:-13.05},0).wait(1).to({scaleX:1.6961,rotation:3.9729,x:-13.95,y:-12.9},0).wait(1).to({scaleX:1.686,rotation:3.0046,x:-14,y:-12.65},0).wait(1).to({scaleX:1.6749,scaleY:1.6536,rotation:1.9439,x:-14.1,y:-12.35},0).wait(1).to({scaleX:1.6654,rotation:1.0355,y:-12.15},0).wait(1).to({scaleX:1.6588,rotation:0.4004,x:-14.15,y:-12},0).wait(1).to({regX:0,regY:0,scaleX:1.655,rotation:0.0328,x:-0.45,y:-3.8},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-30.3,-24,32.1,46.5);


(lib.Spider_eye_wink = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Spider_eye("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0,0.15,1.6537,1.0135,0,0,0,0,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regY:0,scaleY:1.6537,rotation:5.2306,x:0.15,y:-0.05},11,cjs.Ease.quadOut).wait(1).to({rotation:4.4707,x:0.1402,y:-0.0428},0).wait(1).to({rotation:3.7145,x:0.1305,y:-0.0355},0).wait(1).to({rotation:3.0028,x:0.1213,y:-0.0287},0).wait(1).to({rotation:2.3654,x:0.1131,y:-0.0226},0).wait(1).to({scaleX:1.6536,scaleY:1.6536,rotation:1.8159,x:0.106,y:-0.0174},0).wait(1).to({scaleX:1.6537,scaleY:1.6537,rotation:1.3551,x:0.1,y:-0.0129},0).wait(1).to({scaleX:1.6536,scaleY:1.6536,rotation:0.9767,x:0.0952,y:-0.0093},0).wait(1).to({scaleX:1.6537,scaleY:1.6537,rotation:0.6715,x:0.0912,y:-0.0064},0).wait(1).to({scaleX:1.6536,scaleY:1.6536,rotation:0.4302,x:0.0881,y:-0.004},0).wait(1).to({rotation:0.2442,x:0.0857,y:-0.0023},0).wait(1).to({rotation:0.1059,x:0.0839,y:-0.0009},0).wait(1).to({rotation:0.009,x:0,y:0},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1.6,-2.5,3.4000000000000004,5);


(lib.Spider_eye_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Spider_eye("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0,0,1.6537,1.6537);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({rotation:5.2306,x:0.15,y:-0.05},11,cjs.Ease.quadOut).wait(1).to({rotation:4.4707,x:0.1402,y:-0.0428},0).wait(1).to({rotation:3.7145,x:0.1305,y:-0.0355},0).wait(1).to({rotation:3.0028,x:0.1213,y:-0.0287},0).wait(1).to({rotation:2.3654,x:0.1131,y:-0.0226},0).wait(1).to({scaleX:1.6536,scaleY:1.6536,rotation:1.8159,x:0.106,y:-0.0174},0).wait(1).to({scaleX:1.6537,scaleY:1.6537,rotation:1.3551,x:0.1,y:-0.0129},0).wait(1).to({scaleX:1.6536,scaleY:1.6536,rotation:0.9767,x:0.0952,y:-0.0093},0).wait(1).to({scaleX:1.6537,scaleY:1.6537,rotation:0.6715,x:0.0912,y:-0.0064},0).wait(1).to({scaleX:1.6536,scaleY:1.6536,rotation:0.4302,x:0.0881,y:-0.004},0).wait(1).to({rotation:0.2442,x:0.0857,y:-0.0023},0).wait(1).to({rotation:0.1059,x:0.0839,y:-0.0009},0).wait(1).to({rotation:0.009,x:0,y:0},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1.6,-2.5,3.4000000000000004,5.1);


(lib.Spider_body_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Spider_body("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0,0,1.6537,1.6537);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({rotation:3.9539,x:0.5,y:0.05},11,cjs.Ease.quadInOut).to({rotation:0,x:0,y:0},13,cjs.Ease.quadInOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-10.6,-21.3,22.4,42.900000000000006);


(lib.Mouse_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Mouse_mustache_upper
	this.instance = new lib.Mouse_mustache_upper("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(7.8,43.65,1,1,0,-62.3902,117.6098,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({x:8.8},0).wait(2));

	// Mouse_mustache_upper
	this.instance_1 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(7.9,39.2,1,1,0,-46.7176,133.2824,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(2).to({x:8.9},0).wait(2));

	// Mouse_mustache_upper
	this.instance_2 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(50.05,43.65,1,1,75.6728,0,0,-6.8,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(2).to({x:51.05},0).wait(2));

	// Mouse_mustache_upper
	this.instance_3 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(50.05,39.1,1,1,69.9912,0,0,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(2).to({x:51.05},0).wait(2));

	// Mouse_nose
	this.instance_4 = new lib.Mouse_nose_fear("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(27.25,42.05,1,1,0,0,0,0,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(2).to({x:28.25},0).wait(2));

	// Mouse_eye
	this.instance_5 = new lib.Mouse_eye_fear("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(41.25,33.7,0.4444,0.4393,0,0,180);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(2).to({x:42.25},0).wait(2));

	// Mouse_eye
	this.instance_6 = new lib.Mouse_eye_fear("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(13.15,33.7,0.437,0.4393,0,0,0,-0.1,0);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(2).to({x:14.15},0).wait(2));

	// Mouse_face
	this.instance_7 = new lib.Mouse_face_fear("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(27.25,31.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(2).to({x:28.25},0).wait(2));

	// Mouse_Ear
	this.instance_8 = new lib.Mouse_Ear_fear("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(47.25,6.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(2).to({x:48.25},0).wait(2));

	// Mouse_Ear
	this.instance_9 = new lib.Mouse_Ear_fear("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(7.25,6.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_9).wait(2).to({x:8.25},0).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-5.3,-6.1,66.2,66.1);


(lib.Mouse_defeated = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Mouse_mustache_upper
	this.instance = new lib.Mouse_mustache_upper("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(8.55,43.65,1,1,0,-62.3902,117.6098,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:-7.2,regY:-0.7,scaleX:0.9985,scaleY:0.9984,skewX:-145.4101,skewY:34.5899,x:-4.75,y:93.85,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_mustache_upper
	this.instance_1 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(8.65,39.2,1,1,0,-46.7176,133.2824,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regY:0.7,scaleX:0.9983,scaleY:0.9983,skewX:-46.6542,skewY:133.3482,x:-19.05,y:35.15,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_mustache_upper
	this.instance_2 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(50.8,43.65,1,1,75.6728,0,0,-6.8,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({rotation:2.7026,x:82.75,y:69.7,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_mustache_upper
	this.instance_3 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(50.8,39.1,1,1,69.9912,0,0,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({rotation:-34.5386,x:29.3,y:-18.6,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_nose
	this.instance_4 = new lib.Mouse_nose_fear("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(28,42.05,1,1,0,0,0,0,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({regY:1,scaleX:0.1111,scaleY:1.1111,x:28.6,y:88.35,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_eye
	this.instance_5 = new lib.Mouse_eye_fear("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(42.05,33.8,0.5875,0.5875,0,0,180,-0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0,regY:0,scaleX:0.1481,scaleY:0.1869,x:51.2,y:-25.85,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_eye
	this.instance_6 = new lib.Mouse_eye_fear("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(14.05,33.8,0.6182,0.6182,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({regX:0,regY:0,scaleX:0.2909,scaleY:0.2909,x:-0.4,y:-34.25,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_face
	this.instance_7 = new lib.Mouse_face_fear("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(28,31.6);

	this.instance_8 = new lib.Mouse_face("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(32,57.4,1.4667,1.4667);
	this.instance_8.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_7}]}).to({state:[{t:this.instance_8}]},15).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_7).to({_off:true,scaleX:1.4667,scaleY:1.4667,x:32,y:57.4,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_Ear
	this.instance_9 = new lib.Mouse_Ear_fear("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(48,6.4);

	this.instance_10 = new lib.Mouse_Ear("synched",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(75.2,-2.45,2.3714,2.3714,0,0,0,0,-0.1);
	this.instance_10.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_9}]}).to({state:[{t:this.instance_10}]},15).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_9).to({_off:true,regY:-0.1,scaleX:2.3714,scaleY:2.3714,x:75.2,y:-2.45,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_Ear
	this.instance_11 = new lib.Mouse_Ear_fear("synched",0);
	this.instance_11.parent = this;
	this.instance_11.setTransform(8,6.4);

	this.instance_12 = new lib.Mouse_Ear("synched",0);
	this.instance_12.parent = this;
	this.instance_12.setTransform(-11.8,-16.6,2.0566,2.0566,0,0,0,-0.1,0);
	this.instance_12.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_11}]}).to({state:[{t:this.instance_12}]},15).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_11).to({_off:true,regX:-0.1,scaleX:2.0566,scaleY:2.0566,x:-11.8,y:-16.6,alpha:0},15,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-37.5,-42.3,142.6,145.5);


(lib.Mouse_face_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Mouse_face("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleX:0.9533},15,cjs.Ease.quadIn).wait(1).to({scaleX:0.9544},0).wait(1).to({scaleX:0.9561},0).wait(1).to({scaleX:0.9587},0).wait(1).to({scaleX:0.9624},0).wait(1).to({scaleX:0.9675},0).wait(1).to({scaleX:0.9741},0).wait(1).to({scaleX:0.982},0).wait(1).to({scaleX:0.9902},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-30,-28.3,60,56.7);


(lib.Mouse_ear_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Mouse_Ear("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:0.1,scaleX:0.8962,scaleY:1.095,rotation:-9.725,x:1.25,y:-0.95},11,cjs.Ease.quadInOut).wait(1).to({regX:0,scaleX:0.8977,scaleY:1.0936,rotation:-9.5832,x:1.1324,y:-0.9361},0).wait(1).to({scaleX:0.9014,scaleY:1.0903,rotation:-9.2344,x:1.0892,y:-0.9018},0).wait(1).to({scaleX:0.9077,scaleY:1.0845,rotation:-8.6431,x:1.0159,y:-0.8437},0).wait(1).to({scaleX:0.9167,scaleY:1.0762,rotation:-7.7826,x:0.9093,y:-0.7592},0).wait(1).to({scaleX:0.9286,scaleY:1.0653,rotation:-6.6588,x:0.7701,y:-0.649},0).wait(1).to({scaleX:0.9425,scaleY:1.0525,rotation:-5.3429,x:0.6072,y:-0.52},0).wait(1).to({scaleX:0.957,scaleY:1.0394,rotation:-3.9779,x:0.4383,y:-0.3863},0).wait(1).to({scaleX:0.9702,scaleY:1.0272,rotation:-2.724,x:0.2831,y:-0.2635},0).wait(1).to({scaleX:0.9812,scaleY:1.0171,rotation:-1.6877,x:0.155,y:-0.1622},0).wait(1).to({scaleX:0.9895,scaleY:1.0095,rotation:-0.9034,x:0.058,y:-0.0855},0).wait(1).to({scaleX:0.9952,scaleY:1.0043,rotation:-0.3601,x:-0.0091,y:-0.0324},0).wait(1).to({regX:0.2,scaleX:0.9987,scaleY:1.0011,rotation:-0.0288,x:0.1,y:0},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-12.7,-14.4,25.6,27);


(lib.Hedgehog_nose_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_nose("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleX:1.1915,scaleY:1.1915},9).to({scaleX:1,scaleY:1},10,cjs.Ease.quadOut).wait(21));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-3.5,-2.8,7.1,5.699999999999999);


(lib.Hedgehog_mouse_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_mouth("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleY:1.2944,y:1.3},9).to({scaleY:1,y:0},10).wait(21));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-10.5,-5.5,21.1,13.6);


(lib.Hedgehog_mouse_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_mouth_base_fear("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(-0.2,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({x:0.2},0).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-10,-5.6,19.5,6.8999999999999995);


(lib.Hedgehog_hand = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_nail("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(7.55,-3.3,1,1,59.23,0,0,0,-0.1);

	this.instance_1 = new lib.Hedgehog_nail("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(1.45,-2.3,1,1,27.9692,0,0,-0.1,-0.1);

	this.instance_2 = new lib.Hedgehog_nail("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(-4.25,0.7);

	this.shape = new cjs.Shape();
	this.shape.graphics.f("#B1305B").s().p("AglAhQgUgFgDgMQgDgNAOgNQAQgOAZgHQAYgGAVAFQAVACADANQADANgQAOQgPAOgZAHQgNAEgNAAQgKAAgJgCg");
	this.shape.setTransform(3.4214,4.3077);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape},{t:this.instance_2},{t:this.instance_1},{t:this.instance}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-7.2,-7,16.8,14.9);


(lib.Hedgehog_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_Face_fear("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(-0.6,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({x:0.85},0).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-35,-38.5,70.3,77);


(lib.Hedgehog_face_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_Face("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(19).to({startPosition:0},0).to({scaleY:1.2079},12).to({scaleY:1.1663},6).to({scaleY:1},24).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-34.4,-46.5,68.8,93);


(lib.Hedgehog_eye_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_eye("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:-1.45},9).to({x:0},10).wait(14).to({scaleY:0.043},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.043},0).wait(2).to({scaleY:1},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-6.1,-4.6,10.899999999999999,9.3);


(lib.Hedgehog_eye_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_eye_base_fear("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({x:0.4},0).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-7.3,-5.7,12.899999999999999,10.4);


(lib.Frog_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Ring("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30.05,52.3,0.5626,0.5626,0,0,0,54,19.1);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(23).to({_off:false},0).wait(1).to({regX:53.9,regY:19.4,scaleX:1.0368,scaleY:1.0368,x:30,y:52.6},0).to({regX:53.7,regY:19.1,scaleX:2.8412,scaleY:2.8412,x:29.45,y:51.9,alpha:0},6,cjs.Ease.quadOut).to({_off:true},1).wait(98));

	// レイヤー_1
	this.instance_1 = new lib.Frog_base("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regY:30.1,scaleY:0.7075,y:38.85},23).to({scaleY:1.0083,y:27.4},1).to({regY:30,scaleY:1.2008,y:-7.05},6,cjs.Ease.quadOut).to({regY:30.1,scaleY:0.7825,y:36.6},9).to({regY:30,scaleY:1,y:30},4).to({regY:30.1,scaleY:0.9167,y:32.6},16).to({regY:30,scaleY:1,y:30},26).wait(1).to({startPosition:0},0).to({regY:30.1,scaleY:0.9167,y:32.6},16).to({regY:30,scaleY:1,y:30},26).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-123.1,-43,306.6,149.2);


(lib.Frog_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.FrogFace_fear("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleY:0.9873,x:32.5,y:30.4},1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,62.5,60.1);


(lib.Frog_defeated = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_4
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#003701").s().p("AgPAyQgUgFgKgTIgDgFQgBhOBFAHQAOAHAIAOQAKATgFAVQgGAVgSAMQgNAHgMAAQgGAAgHgBg");
	this.shape.setTransform(51.5301,6.3208);

	this.instance = new lib.FrogEye_defeated("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(56.05,1.05,1,1,0,0,0,5.2,5.2);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape}]}).to({state:[{t:this.instance}]},1).to({state:[{t:this.instance}]},10).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1).to({_off:false},0).to({regX:5.3,regY:5,scaleX:2.9417,scaleY:2.9417,x:86.4,y:-15.4,alpha:0},10,cjs.Ease.quadOut).wait(1));

	// レイヤー_3
	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#003701").s().p("AgEAzQgVgDgOgRQgOgRACgVQACgRALgMQAxgrApBPIgBAGQgCAWgQANQgNALgRAAIgHgBg");
	this.shape_1.setTransform(7.5125,7.3342);

	this.instance_1 = new lib.FrogEye_defeated("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(-4.4,-1.65,1,1,0,0,0,5.2,5.2);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1}]}).to({state:[{t:this.instance_1}]},1).to({state:[{t:this.instance_1}]},10).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(1).to({_off:false},0).to({regX:5.1,regY:5,scaleX:2.8269,scaleY:2.8269,x:-14.15,y:-17.6,alpha:0},10,cjs.Ease.quadOut).wait(1));

	// レイヤー_6
	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#CFFF81").s().p("AAGD6IgDAAIgDAAQhxAAhThXIgHgIQgOgPgLgPIgohGQgWgzgGg5QAnhZBPg1QBRg2BhAAQBiAABRA2QBPA1AnBZQgFAqgMAmIggBHIgfAqIgMAPIgHAIIgKAKQhNBKhmADIgDAAg");
	this.shape_2.setTransform(30.725,43.05);

	this.instance_2 = new lib.FrogFace_defeated_lower("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30.85,56.75,1,1,0,0,0,29.7,31.9);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2}]}).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},10).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(1).to({_off:false},0).to({regY:31.8,scaleY:2.091,x:30.1,y:94.45,alpha:0},10,cjs.Ease.quadOut).wait(1));

	// レイヤー_5
	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#33CCFF").s().p("AEpC6QgnhahPg2QhSg2hhgBQhhABhRA2QhQA2gmBaQgDgZAAgZQAAhZAghIQgggqAAg4QAAg8AjgqQAjgqAyAAQAyAAAjAqIALAOQAogMArAAQAvAAApAOIAHgJQAjgqAyAAQAyAAAjAqQAjAqAAA9QgBA3gcAnQAdBGAABXQAABHgUA9QAMgnAFgrgACgi/QgPAUAAAZQAAAcAPASQAQAUAXgBQAVABARgUQALgOAEgTIhXg+IgFAEgAj6iHQACAUAMAPQAQAUAXgBQAVABAQgUQAQgSAAgcQAAgZgQgUIgFgFg");
	this.shape_3.setTransform(30.25,17.55);

	this.instance_3 = new lib.FrogFace_defeated("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(30.25,12.25,1,1,0,0,0,30,34.7);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_3}]}).to({state:[{t:this.instance_3}]},1).to({state:[{t:this.instance_3}]},10).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(1).to({_off:false},0).to({regY:34.6,scaleY:1.9222,y:12.05,alpha:0},10,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-28.5,-54.4,129.9,215.6);


(lib.Cancer_foot_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Cancer_foot("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(6,-0.15,1,1,14.9992,0,0,-0.2,-1.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:-0.1,regY:-1.6,rotation:22.4667,y:-0.05},15,cjs.Ease.quadInOut).to({regX:-0.2,regY:-1.7,rotation:14.9992,y:-0.15},16,cjs.Ease.quadInOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-8.7,-6.6,17,10.3);


(lib.Cancer_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Cancer_eye
	this.instance = new lib.Cancer_eye_fear("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(38.8,20.6,1,1,0,2.6858,-177.3142,2.5,-1.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({x:40.8},0).wait(2));

	// Cancer_eye
	this.instance_1 = new lib.Cancer_eye_fear("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(13.75,20.45,1,1,-5.231,0,0,2.5,-1.8);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(2).to({x:15.75},0).wait(2));

	// Cancer_cissor_minor
	this.instance_2 = new lib.Cancer_cissor_minor_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(44.85,29.45,1,1,0,0,180,-1.4,2.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(2).to({x:46.85},0).wait(2));

	// Cancer_cissor
	this.instance_3 = new lib.Cancer_cissor_fear("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(48.65,26.55,1.2249,1.2249,0,-14.9985,165.0015,0.3,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(2).to({x:50.65},0).wait(2));

	// Cancer_cissor_minor
	this.instance_4 = new lib.Cancer_cissor_minor_fear("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(8.05,29.45,1,1,0,0,0,-1.4,2.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(2).to({x:10.05},0).wait(2));

	// Cancer_cissor
	this.instance_5 = new lib.Cancer_cissor_fear("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(4.25,26.55,1.2249,1.2249,14.9985,0,0,0.3,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(2).to({x:6.25},0).wait(2));

	// Cancer_body
	this.instance_6 = new lib.Cancer_body_fear("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(26.25,37);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(2).to({x:28.25},0).wait(2));

	// Cancer_foot
	this.instance_7 = new lib.Cancer_foot_fear("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(39.85,44.65,1,1,0,2.9853,-177.0147,6.3,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(2).to({x:41.85},0).wait(2));

	// Cancer_foot
	this.instance_8 = new lib.Cancer_foot_fear("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(37.35,47.4,1,1,0,19.4389,-160.5611,7,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(2).to({x:39.35},0).wait(2));

	// Cancer_foot
	this.instance_9 = new lib.Cancer_foot_fear("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(40.65,38.2,1,1,0,-6.4984,173.5016,6.5,-0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_9).wait(2).to({x:42.65},0).wait(2));

	// Cancer_foot
	this.instance_10 = new lib.Cancer_foot_fear("synched",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(13.45,45.85,1,1,-8.9381,0,0,6.3,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_10).wait(2).to({x:15.45},0).wait(2));

	// Cancer_foot
	this.instance_11 = new lib.Cancer_foot_fear("synched",0);
	this.instance_11.parent = this;
	this.instance_11.setTransform(19.1,51.75,1,1,-11.4701,0,0,7.2,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_11).wait(2).to({x:21.1},0).wait(2));

	// Cancer_foot
	this.instance_12 = new lib.Cancer_foot_fear("synched",0);
	this.instance_12.parent = this;
	this.instance_12.setTransform(5.45,39.85);

	this.timeline.addTween(cjs.Tween.get(this.instance_12).wait(2).to({x:7.45},0).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-20.2,2.5,95.3,58);


(lib.Cancer_defeated = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Cancer_eye
	this.instance = new lib.Cancer_eye_fear("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(40.05,20.6,1,1,0,2.6858,-177.3142,2.5,-1.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regY:-2,scaleX:2.115,scaleY:4.6638,skewX:122.2405,skewY:-57.7595,x:79.75,y:9.9,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_eye
	this.instance_1 = new lib.Cancer_eye_fear("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(15,20.45,1,1,-5.231,0,0,2.5,-1.8);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regY:-1.7,scaleX:2.6454,scaleY:5.1352,rotation:-62.1589,x:-21.6,y:-23,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_cissor_minor
	this.instance_2 = new lib.Cancer_cissor_minor_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(46.1,29.45,1,1,0,0,180,-1.4,2.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({skewX:45.2281,skewY:225.2281,x:51.6,y:-4.75,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_cissor
	this.instance_3 = new lib.Cancer_cissor_fear("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(49.9,26.55,1.2249,1.2249,0,-14.9985,165.0015,0.3,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({regX:0.4,skewX:-95.4845,skewY:84.5155,x:80.35,y:58.3,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_cissor_minor
	this.instance_4 = new lib.Cancer_cissor_minor_fear("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(9.3,29.45,1,1,0,0,0,-1.4,2.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({x:-5.45,y:14.45,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_cissor
	this.instance_5 = new lib.Cancer_cissor_fear("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(5.5,26.55,1.2249,1.2249,14.9985,0,0,0.3,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0.2,scaleX:2.2962,scaleY:2.2962,rotation:104.9639,x:-17.95,y:-16.4,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_body
	this.instance_6 = new lib.Cancer_body_fear("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(27.5,37);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({scaleX:1.5714,scaleY:1.5714,x:29,y:27.75,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_foot
	this.instance_7 = new lib.Cancer_foot_fear("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(41.1,44.65,1,1,0,2.9853,-177.0147,6.3,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).to({skewX:-35.2087,skewY:-215.2087,x:91.2,y:34.9,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_foot
	this.instance_8 = new lib.Cancer_foot_fear("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(38.6,47.4,1,1,0,19.4389,-160.5611,7,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).to({skewX:48.1849,skewY:-131.8151,x:47.15,y:66.15,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_foot
	this.instance_9 = new lib.Cancer_foot_fear("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(41.9,38.2,1,1,0,-6.4984,173.5016,6.5,-0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_9).to({regX:6.4,skewX:-45.9898,skewY:134.0102,x:57.55,y:-13.3,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_foot
	this.instance_10 = new lib.Cancer_foot_fear("synched",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(14.7,45.85,1,1,-8.9381,0,0,6.3,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_10).to({rotation:-27.9016,x:-15.8,y:35.85,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_foot
	this.instance_11 = new lib.Cancer_foot_fear("synched",0);
	this.instance_11.parent = this;
	this.instance_11.setTransform(20.35,51.75,1,1,-11.4701,0,0,7.2,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_11).to({rotation:-81.6914,x:5.4,y:55.7,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_foot
	this.instance_12 = new lib.Cancer_foot_fear("synched",0);
	this.instance_12.parent = this;
	this.instance_12.setTransform(6.7,39.85);

	this.timeline.addTween(cjs.Tween.get(this.instance_12).to({rotation:44.9994,x:-20.55,y:0.85,alpha:0},12,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-98.2,-70.8,249,155.1);


(lib.Cancer_body_move_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Cancer_body_base("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(1.5,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:-1.5},15,cjs.Ease.quadInOut).to({x:1.5},16,cjs.Ease.quadInOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-22.5,-21,45,42);


(lib.Cancer_base = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Cancer_eye("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(12.3,-10.3,1,1,0,0,180,2.5,-1.8);

	this.instance_1 = new lib.Cancer_eye("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(-12.7,-10.3,1,1,0,0,0,2.5,-1.8);

	this.instance_2 = new lib.Cancer_cissor_minor_1("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(18.4,-1.35,1,1,0,0,180,-1.4,2.2);

	this.instance_3 = new lib.Cancer_cissor("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(22.2,-4.25,1.2249,1.2249,0,-14.9985,165.0015,0.3,0.1);

	this.instance_4 = new lib.Cancer_cissor_minor_1("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(-18.4,-1.35,1,1,0,0,0,-1.4,2.2);

	this.instance_5 = new lib.Cancer_cissor("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(-22.2,-4.25,1.2249,1.2249,14.9985,0,0,0.3,0.1);

	this.instance_6 = new lib.Cancer_body_base("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(-0.2,6.2);

	this.instance_7 = new lib.Cancer_foot("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(18.55,17.25,1,1,0,0,180,0.1,0);

	this.instance_8 = new lib.Cancer_foot("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(12.9,22.35,1,1,0,0,180,0.1,-0.8);

	this.instance_9 = new lib.Cancer_foot("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(18,8.9,1,1,0,-14.9992,165.0008,-0.2,-1.7);

	this.instance_10 = new lib.Cancer_foot("synched",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(-18.55,17.25,1,1,0,0,0,0.1,0);

	this.instance_11 = new lib.Cancer_foot("synched",0);
	this.instance_11.parent = this;
	this.instance_11.setTransform(-12.9,22.35,1,1,0,0,0,0.1,-0.8);

	this.instance_12 = new lib.Cancer_foot("synched",0);
	this.instance_12.parent = this;
	this.instance_12.setTransform(-18,8.9,1,1,14.9992,0,0,-0.2,-1.7);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_12},{t:this.instance_11},{t:this.instance_10},{t:this.instance_9},{t:this.instance_8},{t:this.instance_7},{t:this.instance_6},{t:this.instance_5},{t:this.instance_4},{t:this.instance_3},{t:this.instance_2},{t:this.instance_1},{t:this.instance}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-46.6,-27.1,93.30000000000001,55.5);


(lib.Bear_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bear_mouse
	this.instance = new lib.Bear_mouse("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(28,43,1,1,21.4869);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({rotation:-40.2213,x:32},0).wait(2));

	// Bear_ear
	this.instance_1 = new lib.Bear_ear_fear("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(50.25,8.05);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(2).to({x:54.25},0).wait(2));

	// Bear_ear
	this.instance_2 = new lib.Bear_ear_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(5.3,6.55);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(2).to({x:9.3},0).wait(2));

	// Bear_eye
	this.instance_3 = new lib.Bear_eye("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(46,28);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(2).to({x:50,y:24},0).wait(2));

	// Bear_eye
	this.instance_4 = new lib.Bear_eye("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(10,24);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(2).to({x:14,y:28},0).wait(2));

	// Bear_nose
	this.instance_5 = new lib.Bear_nose("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(28,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(2).to({x:32},0).wait(2));

	// Bear_face
	this.instance_6 = new lib.Bear_face_fear("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(28,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(2).to({x:32},0).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.5,-2.9,68.6,59.9);


(lib.Bear_defeated = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bear_mouse
	this.instance = new lib.Bear_mouse("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30,43);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regY:0.2,scaleX:7.3912,scaleY:3.65,rotation:-90,x:29.25,y:72.1,alpha:0},23,cjs.Ease.quadOut).wait(1));

	// Bear_ear
	this.instance_1 = new lib.Bear_ear_fear("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(52.25,8.05);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regX:0.1,regY:0.1,scaleX:2.1579,scaleY:2.1579,x:81.25,y:1.05,alpha:0},23,cjs.Ease.quadOut).wait(1));

	// Bear_ear
	this.instance_2 = new lib.Bear_ear_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(7.3,6.55);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({regY:-0.1,scaleX:2.1368,scaleY:2.1368,x:-10.5,y:-10.65,alpha:0},23,cjs.Ease.quadOut).wait(1));

	// Bear_eye
	this.instance_3 = new lib.Bear_eye("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(48,26);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({regY:0.4,scaleY:8,y:43.4,alpha:0},23,cjs.Ease.quadOut).wait(1));

	// Bear_eye
	this.instance_4 = new lib.Bear_eye("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(12,26);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({regY:0.2,scaleY:4.4,y:1.1,alpha:0},23,cjs.Ease.quadOut).wait(1));

	// Bear_nose
	this.instance_5 = new lib.Bear_nose("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0.1,regY:0.1,scaleX:2.6333,scaleY:2.6333,x:30.25,y:30.25,alpha:0},23,cjs.Ease.quadOut).wait(1));

	// Bear_face
	this.instance_6 = new lib.Bear_face_fear("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({scaleX:1.9222,scaleY:1.2815,alpha:0},23,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-31.5,-30.8,134,132.5);


(lib.Bear_nose_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bear_nose("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:1.8},13,cjs.Ease.quadOut).wait(1).to({x:1.4892},0).wait(1).to({x:1.184},0).wait(1).to({x:0.906},0).wait(1).to({x:0.6682},0).wait(1).to({x:0.4735},0).wait(1).to({x:0.3188},0).wait(1).to({x:0.1991},0).wait(1).to({x:0.1091},0).wait(1).to({x:0.044},0).wait(1).to({x:0},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-6,-6,13.8,12);


(lib.Bear_face_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bear_face("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(-1.4,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:2.1},15,cjs.Ease.quadInOut).wait(1).to({x:2.0044},0).wait(1).to({x:1.7437},0).wait(1).to({x:1.2868},0).wait(1).to({x:0.6511},0).wait(1).to({x:-0.0453},0).wait(1).to({x:-0.6417},0).wait(1).to({x:-1.0586},0).wait(1).to({x:-1.3},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-31.4,-27,63.5,54);


(lib.TitleAnim_scurve_no_guide = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.body = new lib.Body();
	this.body.name = "body";
	this.body.parent = this;
	this.body.setTransform(126.65,41.9);

	this.timeline.addTween(cjs.Tween.get(this.body).wait(1).to({x:113.35,y:17.85},0).wait(1).to({x:90.05,y:3.95},0).wait(1).to({x:64.05,y:0.05},0).wait(1).to({x:39.05,y:4.9},0).wait(1).to({x:18,y:17.65},0).wait(1).to({x:4.85,y:37.5},0).wait(1).to({x:2.8,y:60.55},0).wait(1).to({x:9.85,y:81.6},0).wait(1).to({x:25.65,y:96.6},0).wait(1).to({x:44.4,y:106.2},0).wait(1).to({x:63.35,y:113.2},0).wait(1).to({x:81.35,y:119.9},0).wait(1).to({x:98,y:126.85},0).wait(1).to({x:113.15,y:134.75},0).wait(1).to({x:125.05,y:146.3},0).wait(1).to({x:132.4,y:160.6},0).wait(1).to({x:134.3,y:175.8},0).wait(1).to({x:131.5,y:190.05},0).wait(1).to({x:124.75,y:202.05},0).wait(1).to({x:115.6,y:211.35},0).wait(1).to({x:105.2,y:218},0).wait(1).to({x:94.6,y:222.4},0).wait(1).to({x:84.2,y:225.05},0).wait(1).to({x:74.35,y:226.35},0).wait(1).to({x:65.25,y:226.65},0).wait(1).to({x:57,y:226.15},0).wait(1).to({x:49.55,y:225.05},0).wait(1).to({x:43,y:223.55},0).wait(1).to({x:37.35,y:221.85},0).wait(1).to({x:32.5,y:220.1},0).wait(1).to({x:28.55,y:218.4},0).wait(1).to({x:25.35,y:216.85},0).wait(1).to({x:22.9,y:215.6},0).wait(1).to({x:21.2,y:214.6},0).wait(1).to({x:20.15,y:214},0).wait(1).to({x:19.85,y:213.75},0).wait(1).to({x:18.95,y:213.25},0).wait(1).to({x:32.8,y:220.2},0).wait(1).to({x:47.6,y:224.65},0).wait(1).to({x:62.95,y:226.55},0).wait(1).to({x:78.3,y:225.95},0).wait(1).to({x:93.35,y:222.8},0).wait(1).to({x:107.5,y:216.75},0).wait(1).to({x:119.8,y:207.6},0).wait(1).to({x:129.1,y:195.35},0).wait(1).to({x:133.85,y:180.65},0).wait(1).to({x:133.55,y:165.3},0).wait(1).to({x:128.05,y:150.8},0).wait(1).to({x:118.25,y:138.75},0).wait(1).to({x:104.75,y:130.05},0).wait(1).to({x:90.1,y:123.4},0).wait(1).to({x:75.5,y:117.7},0).wait(1).to({x:60.9,y:112.3},0).wait(1).to({x:46.4,y:107.05},0).wait(1).to({x:32.5,y:100.6},0).wait(1).to({x:19.65,y:92.25},0).wait(1).to({x:9.4,y:80.9},0).wait(1).to({x:3.75,y:66.5},0).wait(1).to({x:2.45,y:51.05},0).wait(1).to({x:5.45,y:35.95},0).wait(1).to({x:13.25,y:22.65},0).wait(1).to({x:24.7,y:12.3},0).wait(1).to({x:38.45,y:5.1},0).wait(1).to({x:53.45,y:1.1},0).wait(1).to({x:68.9,y:0.05},0).wait(1).to({x:84.2,y:2.2},0).wait(1).to({x:98.65,y:7.6},0).wait(1).to({x:111.45,y:16.15},0).wait(1).to({x:121.55,y:27.75},0).wait(1).to({x:126.65,y:41.9},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-15.5,-17.9,167.8,262.59999999999997);


(lib.TitleAnim_scurve_head_no_guide = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.body = new lib.Head();
	this.body.name = "body";
	this.body.parent = this;
	this.body.setTransform(126.65,41.9);

	this.timeline.addTween(cjs.Tween.get(this.body).wait(1).to({scaleX:0.9984,scaleY:0.9984,rotation:-54.1623,x:113.35,y:17.8},0).wait(1).to({scaleX:0.9995,scaleY:0.9995,rotation:-81.2337,x:90.1,y:3.9},0).wait(1).to({scaleX:0.9992,scaleY:0.9992,rotation:-105.5583,x:64.05,y:0},0).wait(1).to({scaleX:0.9984,scaleY:0.9984,rotation:-127.0848,x:39,y:4.85},0).wait(1).to({scaleX:0.9987,scaleY:0.9987,rotation:-152.1808,x:17.95,y:17.6},0).wait(1).to({scaleX:0.9998,scaleY:0.9998,rotation:-183.0497,x:4.85,y:37.45},0).wait(1).to({scaleX:0.9986,scaleY:0.9986,rotation:-210.5758,x:2.75,y:60.55},0).wait(1).to({rotation:-240.6642,x:9.85,y:81.55},0).wait(1).to({scaleX:0.9998,scaleY:0.9998,rotation:-266.4396,x:25.6,y:96.55},0).wait(1).to({scaleX:0.9995,scaleY:0.9995,rotation:-279.0357,x:44.35,y:106.2},0).wait(1).to({scaleX:0.9992,scaleY:0.9992,rotation:-284.0691,x:63.3,y:113.2},0).wait(1).to({rotation:-284.7843,x:81.35,y:119.85},0).wait(1).to({scaleX:0.9993,scaleY:0.9993,rotation:-283.8066,x:98,y:126.8},0).wait(1).to({scaleX:0.9996,scaleY:0.9996,rotation:-277.279,x:113.15,y:134.7},0).wait(1).to({scaleX:0.9994,scaleY:0.9994,rotation:-258.9519,x:125,y:146.3},0).wait(1).to({scaleX:0.9986,scaleY:0.9986,rotation:-241.1596,x:132.3,y:160.55},0).wait(1).to({scaleX:0.9984,scaleY:0.9984,rotation:-223.3477,x:134.25,y:175.8},0).wait(1).to({scaleX:0.9987,scaleY:0.9987,rotation:-206.8199,x:131.45,y:190.05},0).wait(1).to({scaleX:0.9994,scaleY:0.9994,rotation:-191.2935,x:124.7,y:202},0).wait(1).to({scaleX:0.9999,scaleY:0.9999,rotation:-178.9569,x:115.55,y:211.3},0).wait(1).to({scaleX:0.9994,scaleY:0.9994,rotation:-168.9663,x:105.2,y:217.95},0).wait(1).to({scaleX:0.999,scaleY:0.999,rotation:-161.1934,x:94.6,y:222.35},0).wait(1).to({scaleX:0.9987,scaleY:0.9987,rotation:-154.6874,x:84.2,y:225},0).wait(1).to({scaleX:0.9986,scaleY:0.9986,rotation:-149.6825,x:74.35,y:226.3},0).wait(1).to({scaleX:0.9985,scaleY:0.9985,rotation:-145.1753,x:65.25,y:226.6},0).wait(1).to({scaleX:0.9984,scaleY:0.9984,rotation:-141.1604,x:56.95,y:226.1},0).wait(1).to({rotation:-137.3921,x:49.55,y:225},0).wait(1).to({rotation:-133.9008,x:43,y:223.5},0).wait(1).to({rotation:-130.8905,x:37.3,y:221.85},0).wait(1).to({rotation:-128.3324,x:32.5,y:220.05},0).wait(1).to({rotation:-125.8646,x:28.5,y:218.35},0).wait(1).to({scaleX:0.9985,scaleY:0.9985,rotation:-123.8484,x:25.3,y:216.85},0).wait(1).to({rotation:-122.1131,x:22.9,y:215.55},0).wait(1).to({scaleX:0.9986,scaleY:0.9986,rotation:-121.0544,x:21.15,y:214.55},0).wait(1).to({rotation:-120.108,x:20.15,y:213.95},0).wait(1).to({scaleX:1,scaleY:1,rotation:-120.0004,x:19.8,y:213.75},0).wait(1).to({rotation:0,x:18.95,y:213.25},0).wait(1).to({scaleX:0.9994,scaleY:0.9994,rotation:-11.5524,x:33.25,y:220.4},0).wait(1).to({scaleX:0.9988,scaleY:0.9988,rotation:-22.0727,x:48.55,y:224.85},0).wait(1).to({scaleX:0.9985,scaleY:0.9985,rotation:-32.3461,x:64.4,y:226.6},0).wait(1).to({scaleX:0.9984,scaleY:0.9984,rotation:-42.3798,x:80.25,y:225.7},0).wait(1).to({rotation:-54.1298,x:95.65,y:222.05},0).wait(1).to({scaleX:0.9989,scaleY:0.9989,rotation:-67.6635,x:109.95,y:215.25},0).wait(1).to({scaleX:0.9997,scaleY:0.9997,rotation:-84.2375,x:122.15,y:205.15},0).wait(1).to({scaleX:0.9993,scaleY:0.9993,rotation:-103.5408,x:130.8,y:191.8},0).wait(1).to({scaleX:0.9985,scaleY:0.9985,rotation:-124.1158,x:134.3,y:176.25},0).wait(1).to({rotation:-144.8874,x:132.4,y:160.55},0).wait(1).to({scaleX:0.9992,scaleY:0.9992,rotation:-164.9574,x:125.05,y:146.3},0).wait(1).to({scaleX:0.9997,scaleY:0.9997,rotation:-185.2923,x:113.45,y:134.95},0).wait(1).to({scaleX:0.9992,scaleY:0.9992,rotation:-194.768,x:98.75,y:127.15},0).wait(1).to({scaleX:0.999,scaleY:0.999,rotation:-198.0672,x:83.65,y:120.75},0).wait(1).to({rotation:-200.0783,x:68.65,y:115.1},0).wait(1).to({scaleX:0.9989,scaleY:0.9989,rotation:-201.5555,x:53.55,y:109.7},0).wait(1).to({scaleX:0.9991,scaleY:0.9991,rotation:-196.541,x:38.75,y:103.75},0).wait(1).to({scaleX:0.9995,scaleY:0.9995,rotation:-188.2638,x:24.95,y:96.1},0).wait(1).to({scaleX:0.9996,scaleY:0.9996,rotation:-173.2269,x:13.05,y:85.85},0).wait(1).to({scaleX:0.9986,scaleY:0.9986,rotation:-151.9153,x:5.3,y:72.05},0).wait(1).to({scaleX:0.9983,scaleY:0.9983,rotation:-136.1172,x:2.45,y:56.2},0).wait(1).to({scaleX:0.9986,scaleY:0.9986,rotation:-119.3445,x:4,y:40.45},0).wait(1).to({scaleX:0.9994,scaleY:0.9994,rotation:-99.8138,x:10.65,y:26.05},0).wait(1).to({scaleX:0.9996,scaleY:0.9996,rotation:-83.4445,x:21.6,y:14.55},0).wait(1).to({scaleX:0.9989,scaleY:0.9989,rotation:-69.9203,x:35.35,y:6.4},0).wait(1).to({scaleX:0.9985,scaleY:0.9985,rotation:-57.4317,x:50.6,y:1.6},0).wait(1).to({scaleX:0.9983,scaleY:0.9983,rotation:-47.4008,x:66.55,y:0},0).wait(1).to({scaleX:0.9984,scaleY:0.9984,rotation:-34.5773,x:82.4,y:1.75},0).wait(1).to({scaleX:0.9988,scaleY:0.9988,rotation:-22.04,x:97.4,y:7},0).wait(1).to({scaleX:0.9995,scaleY:0.9995,rotation:-8.2992,x:110.8,y:15.6},0).wait(1).to({rotation:8.2647,x:121.3,y:27.4},0).wait(1).to({scaleX:1,scaleY:1,rotation:44.9994,x:126.65,y:41.9},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-22.9,-25.4,182.6,277);


(lib.TitleAnim_s_no_guide = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// TitleAnim_scurve
	this.instance = new lib.TitleAnim_scurve_head_no_guide("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(-41.45,90,1,1,0,0,0,67.2,113.9);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(71));

	// TitleAnim_scurve
	this.instance_1 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(-41.45,90,1,1,0,0,0,67.2,113.9);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(36).to({_off:false},0).wait(35));

	// TitleAnim_scurve
	this.instance_2 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_2.parent = this;
	this.instance_2.setTransform(-41.45,90,1,1,0,0,0,67.2,113.9);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(33).to({_off:false},0).wait(38));

	// TitleAnim_scurve
	this.instance_3 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_3.parent = this;
	this.instance_3.setTransform(-41.45,90,1,1,0,0,0,67.2,113.9);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(30).to({_off:false},0).wait(41));

	// TitleAnim_scurve
	this.instance_4 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(-41.45,90,1,1,0,0,0,67.2,113.9);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(27).to({_off:false},0).wait(44));

	// TitleAnim_scurve
	this.instance_5 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_5.parent = this;
	this.instance_5.setTransform(-41.45,90,1,1,0,0,0,67.2,113.9);
	this.instance_5._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(24).to({_off:false},0).wait(47));

	// TitleAnim_scurve
	this.instance_6 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_6.parent = this;
	this.instance_6.setTransform(-41.45,90,1,1,0,0,0,67.2,113.9);
	this.instance_6._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(21).to({_off:false},0).wait(50));

	// TitleAnim_scurve
	this.instance_7 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_7.parent = this;
	this.instance_7.setTransform(-41.45,90,1,1,0,0,0,67.2,113.9);
	this.instance_7._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(18).to({_off:false},0).wait(53));

	// TitleAnim_scurve
	this.instance_8 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_8.parent = this;
	this.instance_8.setTransform(-41.45,90,1,1,0,0,0,67.2,113.9);
	this.instance_8._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(15).to({_off:false},0).wait(56));

	// TitleAnim_scurve
	this.instance_9 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_9.parent = this;
	this.instance_9.setTransform(-41.45,90,1,1,0,0,0,67.2,113.9);
	this.instance_9._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_9).wait(12).to({_off:false},0).wait(59));

	// TitleAnim_scurve
	this.instance_10 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_10.parent = this;
	this.instance_10.setTransform(-41.45,90,1,1,0,0,0,67.2,113.9);
	this.instance_10._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_10).wait(9).to({_off:false},0).wait(62));

	// TitleAnim_scurve
	this.instance_11 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_11.parent = this;
	this.instance_11.setTransform(-41.45,90,1,1,0,0,0,67.2,113.9);
	this.instance_11._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_11).wait(6).to({_off:false},0).wait(65));

	// TitleAnim_scurve
	this.instance_12 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_12.parent = this;
	this.instance_12.setTransform(-41.45,90,1,1,0,0,0,67.2,113.9);
	this.instance_12._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_12).wait(3).to({_off:false},0).wait(68));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-124.2,-41.9,167.9,262.7);


(lib.StartButton_anim = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Start("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(-0.15,0.15,0.1753,0.1753);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(3).to({_off:false},0).to({scaleX:1,scaleY:1,x:0.35,y:-0.35},5).wait(1));

	// レイヤー_4
	this.instance_1 = new lib.CircleFrame("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(0,0,0.0595,0.0595);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({scaleX:1,scaleY:1},3).wait(6));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFEDCC").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklg");

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f().s("#000000").ss(6,1,1).p("APoAAQAAGekkElQklElmfAAQmdAAklklQklklAAmeQAAmeElklQElkkGdAAQGfAAElEkQEkElAAGeg");

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FFEDCC").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklgAg/g/QgaAaAAAlQAAAmAaAaQAaAaAlAAQAmAAAagaQAagaAAgmQAAglgagaQgagagmAAQglAAgaAag");

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#FFEDCC").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklgAjAjAQhPBRAABvQAABwBPBRQBRBPBvAAQBwAABRhPQBPhRAAhwQAAhvhPhRQhRhPhwAAQhvAAhRBPg");

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#FFEDCC").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklgAlAlAQiFCFAAC7QAAC8CFCFQCFCFC7AAQC8AACFiFQCFiFAAi8QAAi7iFiFQiFiFi8AAQi7AAiFCFg");

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#FFEDCC").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklgAnAnBQi7C6AAEHQAAEIC7C5QC5C7EHAAQEIAAC6i7QC6i5AAkIQAAkHi6i6Qi6i6kIAAQkHAAi5C6g");

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#FFEDCC").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklgApCpCQjvDwAAFSQAAFSDvDxQDxDvFRAAQFTAADwjvQDvjxAAlSQAAlSjvjwQjwjvlTAAQlRAAjxDvg");

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("rgba(255,153,0,0.169)").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklg");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape}]}).to({state:[{t:this.shape_2},{t:this.shape_1}]},3).to({state:[{t:this.shape_3},{t:this.shape_1}]},1).to({state:[{t:this.shape_4},{t:this.shape_1}]},1).to({state:[{t:this.shape_5},{t:this.shape_1}]},1).to({state:[{t:this.shape_6},{t:this.shape_1}]},1).to({state:[{t:this.shape_7},{t:this.shape_1}]},1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-103,-103,206,206);


(lib.StartButton = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Start("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0.35,-0.35);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	// レイヤー_4
	this.instance_1 = new lib.CircleFrame("synched",0);
	this.instance_1.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(1));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#000000").ss(6,1,1).p("APoAAQAAGekkElQklElmfAAQmdAAklklQklklAAmeQAAmeElklQElkkGdAAQGfAAElEkQEkElAAGeg");

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("rgba(255,153,0,0.169)").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklg");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-103,-103,206,206);


(lib.AreaAnim_8 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Stage_e
	this.instance = new lib.Stage_e("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(788.75,1010.1);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(14).to({_off:false},0).to({y:802.1},7,cjs.Ease.quadOut).wait(51));

	// Stage_g
	this.instance_1 = new lib.Stage_g("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(628.05,1007.1);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(13).to({_off:false},0).to({y:799.1},7,cjs.Ease.quadOut).wait(52));

	// Stage_a
	this.instance_2 = new lib.Stage_a("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(458.55,1006.4);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(12).to({_off:false},0).to({y:798.4},7,cjs.Ease.quadOut).wait(53));

	// Stage_t
	this.instance_3 = new lib.Stage_t("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(306.35,1008.55);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(11).to({_off:false},0).to({y:800.55},7,cjs.Ease.quadOut).wait(54));

	// TitleAnim_s_no_guide
	this.instance_4 = new lib.TitleAnim_s_no_guide("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(133.7,733.6,1,1,0,0,0,-40.3,89.2);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1).to({_off:false},0).wait(71));

	// 1
	this.instance_5 = new lib.Num_8("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(736.9,395.5,1.1872,1.1872,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0,regY:0,scaleX:0.9697,scaleY:0.9697,x:1165.6,y:540.95},6,cjs.Ease.quadOut).wait(66));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(72));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-279.4,1335.3,1441.1);


(lib.AreaAnim_7 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Stage_e
	this.instance = new lib.Stage_e("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(788.75,1010.1);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(14).to({_off:false},0).to({y:802.1},7,cjs.Ease.quadOut).wait(51));

	// Stage_g
	this.instance_1 = new lib.Stage_g("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(628.05,1007.1);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(13).to({_off:false},0).to({y:799.1},7,cjs.Ease.quadOut).wait(52));

	// Stage_a
	this.instance_2 = new lib.Stage_a("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(458.55,1006.4);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(12).to({_off:false},0).to({y:798.4},7,cjs.Ease.quadOut).wait(53));

	// Stage_t
	this.instance_3 = new lib.Stage_t("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(306.35,1008.55);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(11).to({_off:false},0).to({y:800.55},7,cjs.Ease.quadOut).wait(54));

	// TitleAnim_s_no_guide
	this.instance_4 = new lib.TitleAnim_s_no_guide("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(133.7,733.6,1,1,0,0,0,-40.3,89.2);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1).to({_off:false},0).wait(71));

	// 1
	this.instance_5 = new lib.Num_7("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(736.9,395.5,1.1872,1.1872,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0,regY:0,scaleX:0.9697,scaleY:0.9697,x:1165.6,y:540.95},6,cjs.Ease.quadOut).wait(66));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(72));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-279.4,1335.3,1441.1);


(lib.AreaAnim_6 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Stage_e
	this.instance = new lib.Stage_e("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(788.75,1010.1);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(14).to({_off:false},0).to({y:802.1},7,cjs.Ease.quadOut).wait(51));

	// Stage_g
	this.instance_1 = new lib.Stage_g("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(628.05,1007.1);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(13).to({_off:false},0).to({y:799.1},7,cjs.Ease.quadOut).wait(52));

	// Stage_a
	this.instance_2 = new lib.Stage_a("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(458.55,1006.4);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(12).to({_off:false},0).to({y:798.4},7,cjs.Ease.quadOut).wait(53));

	// Stage_t
	this.instance_3 = new lib.Stage_t("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(306.35,1008.55);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(11).to({_off:false},0).to({y:800.55},7,cjs.Ease.quadOut).wait(54));

	// TitleAnim_s_no_guide
	this.instance_4 = new lib.TitleAnim_s_no_guide("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(133.7,733.6,1,1,0,0,0,-40.3,89.2);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1).to({_off:false},0).wait(71));

	// 1
	this.instance_5 = new lib.Num_6("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(736.9,395.5,1.1872,1.1872,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0,regY:0,scaleX:0.9697,scaleY:0.9697,x:1165.6,y:540.95},6,cjs.Ease.quadOut).wait(66));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(72));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-279.4,1335.3,1441.1);


(lib.AreaAnim_5 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Stage_e
	this.instance = new lib.Stage_e("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(788.75,1010.1);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(14).to({_off:false},0).to({y:802.1},7,cjs.Ease.quadOut).wait(51));

	// Stage_g
	this.instance_1 = new lib.Stage_g("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(628.05,1007.1);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(13).to({_off:false},0).to({y:799.1},7,cjs.Ease.quadOut).wait(52));

	// Stage_a
	this.instance_2 = new lib.Stage_a("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(458.55,1006.4);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(12).to({_off:false},0).to({y:798.4},7,cjs.Ease.quadOut).wait(53));

	// Stage_t
	this.instance_3 = new lib.Stage_t("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(306.35,1008.55);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(11).to({_off:false},0).to({y:800.55},7,cjs.Ease.quadOut).wait(54));

	// TitleAnim_s_no_guide
	this.instance_4 = new lib.TitleAnim_s_no_guide("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(133.7,733.6,1,1,0,0,0,-40.3,89.2);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1).to({_off:false},0).wait(71));

	// 1
	this.instance_5 = new lib.Num_5("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(736.9,395.5,1.1872,1.1872,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0,regY:0,scaleX:0.9697,scaleY:0.9697,x:1165.6,y:540.95},6,cjs.Ease.quadOut).wait(66));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(72));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-279.4,1335.3,1441.1);


(lib.AreaAnim_4 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Stage_e
	this.instance = new lib.Stage_e("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(788.75,1010.1);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(14).to({_off:false},0).to({y:802.1},7,cjs.Ease.quadOut).wait(51));

	// Stage_g
	this.instance_1 = new lib.Stage_g("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(628.05,1007.1);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(13).to({_off:false},0).to({y:799.1},7,cjs.Ease.quadOut).wait(52));

	// Stage_a
	this.instance_2 = new lib.Stage_a("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(458.55,1006.4);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(12).to({_off:false},0).to({y:798.4},7,cjs.Ease.quadOut).wait(53));

	// Stage_t
	this.instance_3 = new lib.Stage_t("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(306.35,1008.55);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(11).to({_off:false},0).to({y:800.55},7,cjs.Ease.quadOut).wait(54));

	// TitleAnim_s_no_guide
	this.instance_4 = new lib.TitleAnim_s_no_guide("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(133.7,733.6,1,1,0,0,0,-40.3,89.2);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1).to({_off:false},0).wait(71));

	// 1
	this.instance_5 = new lib.Num_4("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(736.9,395.5,1.1872,1.1872,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0,regY:0,scaleX:0.9697,scaleY:0.9697,x:1165.6,y:540.95},6,cjs.Ease.quadOut).wait(66));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(72));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-279.4,1335.3,1441.1);


(lib.AreaAnim_3 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Stage_e
	this.instance = new lib.Stage_e("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(788.75,1010.1);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(14).to({_off:false},0).to({y:802.1},7,cjs.Ease.quadOut).wait(51));

	// Stage_g
	this.instance_1 = new lib.Stage_g("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(628.05,1007.1);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(13).to({_off:false},0).to({y:799.1},7,cjs.Ease.quadOut).wait(52));

	// Stage_a
	this.instance_2 = new lib.Stage_a("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(458.55,1006.4);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(12).to({_off:false},0).to({y:798.4},7,cjs.Ease.quadOut).wait(53));

	// Stage_t
	this.instance_3 = new lib.Stage_t("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(306.35,1008.55);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(11).to({_off:false},0).to({y:800.55},7,cjs.Ease.quadOut).wait(54));

	// TitleAnim_s_no_guide
	this.instance_4 = new lib.TitleAnim_s_no_guide("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(133.7,733.6,1,1,0,0,0,-40.3,89.2);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1).to({_off:false},0).wait(71));

	// 1
	this.instance_5 = new lib.Num_3("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(676.9,407.5,1.1872,1.1872,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0,regY:0,scaleX:0.9697,scaleY:0.9697,x:1125.6,y:500.95},6,cjs.Ease.quadOut).wait(66));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(72));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-355.7,1381.5,1598.9);


(lib.AreaAnim_2 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Stage_e
	this.instance = new lib.Stage_e("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(788.75,1010.1);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(14).to({_off:false},0).to({y:802.1},7,cjs.Ease.quadOut).wait(51));

	// Stage_g
	this.instance_1 = new lib.Stage_g("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(628.05,1007.1);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(13).to({_off:false},0).to({y:799.1},7,cjs.Ease.quadOut).wait(52));

	// Stage_a
	this.instance_2 = new lib.Stage_a("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(458.55,1006.4);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(12).to({_off:false},0).to({y:798.4},7,cjs.Ease.quadOut).wait(53));

	// Stage_t
	this.instance_3 = new lib.Stage_t("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(306.35,1008.55);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(11).to({_off:false},0).to({y:800.55},7,cjs.Ease.quadOut).wait(54));

	// TitleAnim_s_no_guide
	this.instance_4 = new lib.TitleAnim_s_no_guide("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(133.7,733.6,1,1,0,0,0,-40.3,89.2);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1).to({_off:false},0).wait(71));

	// 1
	this.instance_5 = new lib.Num_2("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(736.9,395.5,1.1872,1.1872,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0,regY:0,scaleX:0.9697,scaleY:0.9697,x:1165.6,y:540.95},6,cjs.Ease.quadOut).wait(66));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(72));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-279.4,1335.3,1441.1);


(lib.AreaAnim_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Stage_e
	this.instance = new lib.Stage_e("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(788.75,1010.1);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(14).to({_off:false},0).to({y:802.1},7,cjs.Ease.quadOut).wait(51));

	// Stage_g
	this.instance_1 = new lib.Stage_g("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(628.05,1007.1);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(13).to({_off:false},0).to({y:799.1},7,cjs.Ease.quadOut).wait(52));

	// Stage_a
	this.instance_2 = new lib.Stage_a("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(458.55,1006.4);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(12).to({_off:false},0).to({y:798.4},7,cjs.Ease.quadOut).wait(53));

	// Stage_t
	this.instance_3 = new lib.Stage_t("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(306.35,1008.55);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(11).to({_off:false},0).to({y:800.55},7,cjs.Ease.quadOut).wait(54));

	// TitleAnim_s_no_guide
	this.instance_4 = new lib.TitleAnim_s_no_guide("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(133.7,733.6,1,1,0,0,0,-40.3,89.2);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1).to({_off:false},0).wait(71));

	// 1
	this.instance_5 = new lib.Num_1("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(596.9,435.5,1.1872,1.1872,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0,regY:0,scaleX:0.9697,scaleY:0.9697,x:1025.6,y:562.95},6,cjs.Ease.quadOut).wait(66));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(72));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-265,1299.2,1434.9);


(lib.GoButton_anim = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Go("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(-0.15,0.15,0.1753,0.1753);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(3).to({_off:false},0).to({scaleX:1,scaleY:1,x:0.35,y:-0.35},5).wait(1));

	// レイヤー_4
	this.instance_1 = new lib.CircleFrame("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(0,0,0.0595,0.0595);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({scaleX:1,scaleY:1},3).wait(6));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklg");

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f().s("#000000").ss(6,1,1).p("APoAAQAAGekkElQklElmfAAQmdAAklklQklklAAmeQAAmeElklQElkkGdAAQGfAAElEkQEkElAAGeg");

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#75FF6D").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklgAg/g/QgaAaAAAlQAAAmAaAaQAaAaAlAAQAmAAAagaQAagaAAgmQAAglgagaQgagagmAAQglAAgaAag");

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#75FF6D").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklgAjAjAQhPBRAABvQAABwBPBRQBRBPBvAAQBwAABRhPQBPhRAAhwQAAhvhPhRQhRhPhwAAQhvAAhRBPg");

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#75FF6D").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklgAlAlAQiFCFAAC7QAAC8CFCFQCFCFC7AAQC8AACFiFQCFiFAAi8QAAi7iFiFQiFiFi8AAQi7AAiFCFg");

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#75FF6D").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklgAnAnBQi7C6AAEHQAAEIC7C5QC5C7EHAAQEIAAC6i7QC6i5AAkIQAAkHi6i6Qi6i6kIAAQkHAAi5C6g");

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#75FF6D").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklgApCpCQjvDwAAFSQAAFSDvDxQDxDvFRAAQFTAADwjvQDvjxAAlSQAAlSjvjwQjwjvlTAAQlRAAjxDvg");

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#BAD5F7").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklg");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape}]}).to({state:[{t:this.shape_2},{t:this.shape_1}]},3).to({state:[{t:this.shape_3},{t:this.shape_1}]},1).to({state:[{t:this.shape_4},{t:this.shape_1}]},1).to({state:[{t:this.shape_5},{t:this.shape_1}]},1).to({state:[{t:this.shape_6},{t:this.shape_1}]},1).to({state:[{t:this.shape_7},{t:this.shape_1}]},1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-103,-103,206,206);


(lib.GoButton = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Go("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0.35,-0.35);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	// レイヤー_4
	this.instance_1 = new lib.CircleFrame("synched",0);
	this.instance_1.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(1));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#000000").ss(6,1,1).p("APoAAQAAGekkElQklElmfAAQmdAAklklQklklAAmeQAAmeElklQElkkGdAAQGfAAElEkQEkElAAGeg");

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#BAD5F7").s().p("ArCLDQklklAAmeQAAmdElklQElklGdAAQGeAAElElQElElAAGdQAAGeklElQklElmeAAQmdAAklklg");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-103,-103,206,206);


(lib.exp_text_7 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEAAgCgDQgCgEAAgEQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADADAAAFQAAAEgCADQgDACgEABIgJABIgWAAIgdAAIgfABIgbAAg");
	this.shape.setTransform(697.375,230.25);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#006600").s().p("AhqBmQgEgEAAgFIABgFIAEgEQAIgHAIgLQAIgLAHgNQAHgNAFgOQAEgKADgNIAEgfIABggIAAgGIAAgDIgCgEIgBgCIAAgBQAAgFADgEQAEgDAFAAIAFACIAEADQACADABAFQACAEAAAHQAAASgCASQgCASgDAQQgDAQgEALQgEAOgIAOQgHAOgJANQgIANgIAIIgHAGIgFABQgGAAgDgDgABFBlQgEgDgHgIQgJgLgIgNQgIgMgGgNQgGgNgEgLIgGgdQgDgQgCgSQgCgRAAgPQAAgLAEgGQAEgHAHAAQAEAAADAEQADACAAAGIAAADIgCADIgBAEIAAACIAAAHQAAAPACARQACARADAQQAEAOAEAMIAMAWIAPAXQAIAJAIAIIAEAEIABAFQAAAGgEAEQgDADgFAAIgBAAQgDAAgEgDgABGggIgGgHIgKgQIgLgUQgEgFAAgDQAAgDADgCQACgCAEAAQABgBAAAAQABAAABABQAAAAABAAQAAAAABABIADAEIAIAPIAJAOIAIAMIABADIABACQAAAEgDACQgCACgDAAQgBAAAAAAQgBAAgBAAQAAAAgBAAQAAgBgBAAgABggxIgLgQIgNgVQgFgJAAgBQAAgEADgDQACgBAEgBIAEABIAEAGIAEAHIAGALIAIAMIAGAJIACADIABAEQAAADgDACQgCACgEAAIAAAAQgDAAgDgEg");
	this.shape_1.setTransform(673.975,231.05);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEAAgCgDQgCgEAAgEQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADADAAAFQAAAEgCADQgDACgEABIgJABIgWAAIgdAAIgfABIgbAAg");
	this.shape_2.setTransform(649.375,230.25);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#006600").s().p("AAMBnQgDgBAAgFIgBgTIgBgdIAAglQgTAXgTASQgTASgSANIgNAJQgEADgDgBQgEAAgDgDQgDgDgBgFQAAgCACgDIACgEIACAAIAHgGQARgKAQgOQARgOAPgQQAQgPAMgRIAAgRIgFAAIg3AAIgdABQgFgBgDgCQgDgCAAgGIACgGQABgDADgBIACgBIAEAAIALAAIAGAAIAJAAIAPAAIAZAAIAWAAIAAgnQAAgGADgDQADgCAFAAQAFAAACADQAEADAAAEIAAAdIAAADIAAADIAAAEIAWAAIAPAAIAIgBIAKAAIAGgBQAEAAADADQACADABAFQAAAEgDADQgBADgEAAIgOAAIgRABIgSABIgOAAIAAAbIAAASIAAASIABARIAAAYIAAAYQAAAGgCADQgDAEgFAAQgFAAgDgDg");
	this.shape_3.setTransform(625.6,230.95);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#006600").s().p("ABUBjIgIgJIgPgTQgKAIgLAFQgMAFgPACQgKACgOABIggACIglABQgLAAgGgDQgFgDAAgGQAAgFADgDQACgDAFgBQAWgiAUgoQATgpARgxQABgEADgDQACgCAFAAQAEAAADADQADADAAAFIgEANIgHAXIgMAeIgNAcIgTAlQgIARgLAQIAHAAIAEAAIAEAAIAagBIAYgCIASgDQAKgCAIgEQAIgEAHgFIgQgXIgHgMIgCgGQAAgGADgDQADgDAFgBQAEAAACACQADACADAHIAMASIAOAUIAPASIALAOIADADIABAEQAAAFgEAEQgDAEgFAAQgDAAgEgCg");
	this.shape_4.setTransform(601.825,231.025);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEAAgCgDQgCgEAAgEQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADADAAAFQAAAEgCADQgDACgEABIgJABIgWAAIgdAAIgfABIgbAAg");
	this.shape_5.setTransform(577.375,230.25);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#006600").s().p("Ag5BmQgEgEAAgEIABgGQABgCADgCIABAAIAEgCQAPgJAJgHQAKgHAFgIQAFgHACgKQACgIAAgOIAAgqIgWAAIgTABIgHAAIgJgBQgFALgHAIQgHAJgJAHIgGAEQAAAAgBABQAAAAgBAAQAAAAgBAAQgBABAAAAQgGgBgCgDQgDgEAAgEIAAgEIAEgEQAJgGAGgJQAHgIADgIIAEgMIACgQIABgRIgBgKQAAgFADgDQADgDAFABQAEAAADACQADACABADIAAANIgBARIgCASIAOAAIAJAAIAqgBIAogCIgIgPIgCgHQAAgEACgCQADgCADgBQABAAABAAQAAAAABAAQAAABABAAQAAAAABAAIADAGIAJAQIAJAPIAIANIABACIAAACQAAAEgCACQgDADgDAAQgDAAgDgDQgDgDgDgGIgMAAIgMAAIgNABIgJAAIAAArQAAARgCANQgDAMgGAJQgEAHgHAHQgJAJgLAHIgQAKQgGADgDAAQgEAAgDgEgABhgpIgGgIIgKgSIgJgPIgFgJIgBgEQAAgEADgCQACgCAEAAIAEAAIAEAHIAGALIAKAQIAJAPIACADIAAACQAAAEgCADQgDACgDAAQgBAAAAAAQgBAAgBAAQAAgBgBAAQAAAAgBAAg");
	this.shape_6.setTransform(554.325,230.95);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#006600").s().p("AgQBjQgQAAgKgCQgJgBgFgCQgJgEgFgHQgFgGAAgIQAAgHAEgIQADgHAHgGIAcgZIAegYIgfgWIgbgXIgTgRIgHgJQgCgEAAgEQAAgFADgDQADgDAFgBQAEABACABIAEAEQAEAIAKAKQAKAJAQANIAoAgIANgLIALgIIALgIIADgDIAEgDIAHgGIAFgGIADgDIAFgBQAFAAADADQAEADAAAFQAAAFgFAHQgFAGgMAHIgcAVIgfAXIgbAXIgUAUIgHAHQgCADAAADQAAAEADACQADADAHABIAVACIAiAAIAZAAIAQgBIAJgCIAFgCIAEgBIADgBQAFAAADADQADADAAAFQAAAEgCADQgCACgDACQgFADgHABIgSACIgeAAIgnAAg");
	this.shape_7.setTransform(528.875,230.9);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.f("#006600").s().p("AguBcQgNgIAAgOQAAgQARgNQARgNAfgJIgPgJIgTgMIgGgGQgBgCAAgDQAAgEACgEQADgEAEgEIAYgTIAngeIgBgBIgXABIgZACIgZABIgUAAQgJAAgDgDQgEgCABgFQgBgGADgCQADgDAGAAIACAAIAFAAIAGAAIAIAAIAvgBIArgCIADAAIABAAQAHAAAFADQAFAEAAAEIgBAGIgDAEIgCACIgGADIgRAPIgVAQIgTAPIgNAMIAPAMQAIAEAOAGQARAKALAIQAKAGAFAHQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAGgIAGQgIAHAAAIQAAAFAGADQAGACAPAAQAQAAANgDQANgEAIgHQAIgGAAgHQAAgEgFgFQgEgFgKgFQgVAEgOAFg");
	this.shape_8.setTransform(505.1237,231.45);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.f("#006600").s().p("AhoBmQgEgDAAgGIAAgEIAEgEIAHgFQAcgUASgYQASgYAKgcQAKgeACglIg5AAQgFAAgCgDQgDgDgBgFQABgFADgDQACgCAFAAIA+AAQAJAAAEADQAFAFAAAKQAAAwAXAoQAWApAtAkIAFAGQACACAAADQAAAFgEAEQgDADgFABIgHgBIgHgGQgLgIgMgMQgLgMgJgOQgLgOgHgOQgHgMgGgNQgFgNgDgPQgFAdgLAXQgLAWgRAVQgKALgKAKIgTAPQgJAFgEAAQgGAAgDgDg");
	this.shape_9.setTransform(481.75,231.3);

	this.shape_10 = new cjs.Shape();
	this.shape_10.graphics.f("#006600").s().p("AhXBmQgDgCgBgEIAAgLIgBgWIAAgZIAAgXIAAghIABgiIAAgcIABgPQABgEADgCQADgDAEAAQAFAAADADQACADAAAFIAAAFIAAAHIgCAgIAAAvIAAAmIABAhIABAXIAAACIAAABQAAAEgDADQgDADgFAAQgEAAgDgDgAAKBcQgKgFgJgKQgGgGgDgGQgEgHAAgFQAAgFADgDQADgDAFAAIAFABIADADIABABIACAEQADALAJAHQAJAGALAAQAOAAAKgHQALgHADgNQABgDADgCQADgCADAAQAFAAADADQADADAAAEIgBAJIgFAJQgIANgOAHQgNAHgRABQgMAAgLgFgAA4gHQgEgDAAgFQAAAAAAgBQAAgBABAAQAAgBAAAAQAAgBABAAIAEgFQAHgGADgHQAEgHAAgHQAAgLgLgGQgKgFgSgBQgLAAgJADQgKACgKAEIgEACIgDAAQgEAAgDgDQgDgDAAgFQAAgEADgDQAEgDAIgDQAHgDAKgCQALgBAOAAQASAAAOAFQANAFAIAKQAHAKAAANQAAAMgFALQgGALgJAIIgFADIgFABQgEAAgDgDg");
	this.shape_10.setTransform(756.975,188.525);

	this.shape_11 = new cjs.Shape();
	this.shape_11.graphics.f("#006600").s().p("AhfBuQgDgEAAgEIAAiZQAAgKAFgFQAFgFAKgBIBEAAIAAgeQAAgDADgDQADgCAEgBQAEABADACQADADAAADIAAAeIBFAAQAKABAFAFQAFAFAAAKIAACHQAAAKgDAGQgCAGgGACIgJACIgPABIgLgBIgMAAIgJgBQgFgBgDgDQgCgDAAgFQAAgFADgDQADgCAGgBIACAAIADABIANABIAOAAQAHAAACgCQACgCAAgFIAAh9QAAAAAAgBQAAgBAAAAQAAgBgBAAQAAgBAAAAQgCgBgDAAIg9AAIgBALIgCALIAXAWIAPANIAKALIAMANIADAFIABAFQAAAEgEAEQgDADgFAAIgEgBIgFgDIgBgBIgDgFIgKgLIgHgJIgKgLIgSgTIgIARIgLARQgHAJgIAHQgHAIgHAEQgHAEgFABQgEgBgDgDQgDgDAAgEIABgFIACgDIABgBIAEgDQAXgRANgVQANgWABgaIg7AAQgDAAgCABQAAAAAAABQgBAAAAABQAAAAAAABQAAABAAAAIAACUQAAAEgDAEQgDACgFAAQgFAAgDgCg");
	this.shape_11.setTransform(733.075,188.55);

	this.shape_12 = new cjs.Shape();
	this.shape_12.graphics.f("#006600").s().p("AhcBgQgDgEAAgFIAAgEIADgDIACgBIAFgEQASgLARgMQARgNAOgOQANgNAJgNQAJgMAIgNIAOgZQAFgMADgLIgXACIgaAAIgcABIgYAAQgFAAgDgCQgCgDAAgFQAAgEABgDQACgDADgBIACAAIAEAAIALAAIAkAAIAfgBIAagBIAGgDIAFgBQAGAAACADQAEAEAAAGIgCAHIgDAKIgJASQgKAVgKARQgLARgMAPIAfAUIAYARIAXARQAFAFAAAGQAAAFgEAEQgDADgFABIgEgBIgEgDIgSgPIgbgUIgfgXIgaAYIgZAUIgUAOQgJAFgEAAQgEAAgEgDg");
	this.shape_12.setTransform(709.05,189.025);

	this.shape_13 = new cjs.Shape();
	this.shape_13.graphics.f("#006600").s().p("AARBcIgEgDIgHgIIgRgUIgXgWIgTgSIgDgEIgBgFQAAgFADgDQAEgEAFAAIAFACIAJAHIAUATIAFAFQAUgMARgQQAQgPAMgSQAMgSAEgTIgfAAIgTAAIgNABIgOAAIg2AAIgPAAIgJABIgLgBIgGgCIgCgEIAAgEQgBgEADgEQACgDAEAAIABAAIADAAIAIAAIAPAAIAvgBIAiAAIAZAAIAUAAIARAAIAFgEIAFgBQAFAAAEADQACAEAAAGIgBALIgEAPQgGARgKAQQgKARgNAMQgKAKgLAKQgLAJgQAJIARARIAHAJQABADAAACQAAAGgEADQgDAEgGAAIgDAAg");
	this.shape_13.setTransform(684.95,189.075);

	this.shape_14 = new cjs.Shape();
	this.shape_14.graphics.f("#006600").s().p("AgfBlQgDgBgDgDQgCgCAAgFQAAgEACgCQACgDADgBIAGAAIAKgBIAMgBIAAiSIgNALIgLAIQgGAEgCgBQgFABgDgEQgDgEAAgFQgBgEACgCIAFgDIAMgIIALgJIAJgIQAEgDAEgDQACgCAEAAQAFAAAEAFQADADAAAGIAACkIAFAAIADAAIAKABIAHAAQACABACADQACADABADQgBAEgCADQgCADgDABIgDAAIgCgBIgHAAIgLAAIgSAAIgRABIgMABg");
	this.shape_14.setTransform(655.35,188.45);

	this.shape_15 = new cjs.Shape();
	this.shape_15.graphics.f("#006600").s().p("AhKBmQgFAAgDgDQgEgEAAgFIABgFIADgEIACgBIAGgDQARgMASgRQATgRAUgVIgWgPIgRgOIgEgFIgBgGQAAgEADgEQAEgDAFAAIAEABIAFAEIAIAHIAPALIAOAMIATgcQAKgPAIgQIANgdQACgEACgCQADgBAEAAQAFAAADADQADADABAEQAAADgFALIgQAeIgRAcQgIAOgKAMIAUAOIASAMIAFAEQACACAAAEQAAAFgEAEQgDADgFABIgDgBIgEgCIgJgGIgPgKIgQgMQgTAVgUASQgUATgSAMIgIAGIgFABIgBAAg");
	this.shape_15.setTransform(624.625,188.8313);

	this.shape_16 = new cjs.Shape();
	this.shape_16.graphics.f("#006600").s().p("AhDBmQgDgDAAgFQAAgEABgCQACgCAGgDQAUgLAOgNQAOgMAFgLIAEgLIACgQIAAgYIAAgNIgTAAIgYAAIgYABIgTAAQgHAAgEgDQgDgCAAgFQAAgEACgDQACgEADAAIABgBIAEAAIALAAIAeAAIAvgBIAAguQAAgEACgDQADgCAFAAQAFAAAEACQADADAAAEIAAAtIAcgBIARAAIAHgBIALAAIAHAAIAHABQADABABAEIABACIABACQgBAEgCAEQgCADgEAAIgJABIgTABIgYAAIgWABIAAAOQAAAWgCAOQgCAPgEAKQgEAJgIAJQgIAKgNAKQgOAKgPAIIgGAEIgDAAQgFAAgDgEg");
	this.shape_16.setTransform(601.575,188.575);

	this.shape_17 = new cjs.Shape();
	this.shape_17.graphics.f("#006600").s().p("AhDBmQgDgDAAgFQAAgEABgCQACgCAGgDQAUgLAOgNQAOgMAFgLIAEgLIACgQIAAgYIAAgNIgTAAIgYAAIgYABIgTAAQgHAAgEgDQgDgCAAgFQAAgEACgDQACgEADAAIABgBIAEAAIALAAIAeAAIAvgBIAAguQAAgEACgDQADgCAFAAQAFAAAEACQADADAAAEIAAAtIAcgBIARAAIAHgBIALAAIAHAAIAHABQADABABAEIABACIABACQgBAEgCAEQgCADgEAAIgJABIgTABIgYAAIgWABIAAAOQAAAWgCAOQgCAPgEAKQgEAJgIAJQgIAKgNAKQgOAKgPAIIgGAEIgDAAQgFAAgDgEg");
	this.shape_17.setTransform(577.575,188.575);

	this.shape_18 = new cjs.Shape();
	this.shape_18.graphics.f("#006600").s().p("AghBtQgLAAgEgFQgGgFAAgKIAAg6IgNARIgPAPIgKAIQgDACgDAAQgEAAgDgEQgEgDAAgFIAAgDIADgDIAGgGQAOgMAMgQQANgQAKgRQAKgRAHgTIg7AAQgEAAgDgCQgCgDAAgFQgBgEADgDQACgCAFgBIBBAAIAFgQIADgNQABgGACgCQACgDAFAAQAFAAADADQACADAAAEIgBALIgEATIBqAAQAEABACACQACADABAEQgBAFgCADQgCACgEAAIhwAAIgKAZQgGAMgGALIBuAAQAJAAAGAEQAEAFAAALIAABFQAAAKgEAFQgGAFgJAAgAgfAUIgBAEIAAA8IABAEIADACIBiAAIAEgCQAAAAAAAAQAAgBABAAQAAgBAAAAQAAgBAAgBIAAg8QAAgFgFAAIhiAAIgDABg");
	this.shape_18.setTransform(553.4,188.2);

	this.shape_19 = new cjs.Shape();
	this.shape_19.graphics.f("#006600").s().p("AhCBrQgEAAgCgDQgDgCAAgFQAAgEADgDQACgDAEAAIBMAAIAAhDIg0AAIgTAgQgKANgJALIgMAKQgEACgDAAQgFAAgDgDQgDgDgBgFIABgDIACgEIAFgEQAOgOAMgSQANgSALgUQAKgUAGgWIg8AAQgDAAgDgCQgCgDAAgFQAAgEACgDQADgCADgBIBBAAIACgJIADgLIACgJQABgMAJAAQAGAAACADQADACAAAFIgBALIgEAUIBvAAQAEABADACQACADAAAEQAAAFgCADQgDACgEAAIh1AAIgHAYIgKAWIB8AAQAEAAACADQACACAAAFQAAAEgCADQgCADgEAAIg8AAIAABDIBGAAQAEAAADADQADADgBAEQABAFgDACQgDADgEAAg");
	this.shape_19.setTransform(529.5,188);

	this.shape_20 = new cjs.Shape();
	this.shape_20.graphics.f("#006600").s().p("AgNBkQgDgDAAgEIAAitIhRAAQgEAAgDgDQgCgDAAgFQAAgEACgDQADgDAEAAIDDAAQAEAAADADQACADAAAFQAAAFgCACQgDADgEAAIhdAAIAAAaIAcAPIAcARIAVAOIALAHIAEAEIABAFQAAAFgDAEQgEAEgFAAIgDAAIgEgCIgHgGIgXgPIgXgQIgVgNIAAB8QAAAEgDADQgCACgFAAQgFAAgDgCg");
	this.shape_20.setTransform(505.575,189.375);

	this.shape_21 = new cjs.Shape();
	this.shape_21.graphics.f("#006600").s().p("AhiBnQgEAAgDgDQgCgDAAgFQAAgFACgDQADgDAEAAIBRAAIAAitQAAgFADgCQADgDAFAAQAFAAADADQADACAAAFIAAA5IBSAAQAEAAACACQADADAAAFQAAAFgDADQgCACgEAAIhSAAIAABgIBeAAQAEAAADADQACADAAAFQAAAFgCADQgDADgEAAg");
	this.shape_21.setTransform(481.575,188.05);

	this.shape_22 = new cjs.Shape();
	this.shape_22.graphics.f("#006600").s().p("AhXBmQgDgCgBgEIAAgLIgBgWIAAgZIAAgXIAAghIABgiIAAgcIABgPQABgEADgCQADgDAEAAQAFAAADADQACADAAAFIAAAFIAAAHIgCAgIAAAvIAAAmIABAhIABAXIAAACIAAABQAAAEgDADQgDADgFAAQgEAAgDgDgAAKBcQgKgFgJgKQgGgGgDgGQgEgHAAgFQAAgFADgDQADgDAFAAIAFABIADADIABABIACAEQADALAJAHQAJAGALAAQAOAAAKgHQALgHADgNQABgDADgCQADgCADAAQAFAAADADQADADAAAEIgBAJIgFAJQgIANgOAHQgNAHgRABQgMAAgLgFgAA4gHQgEgDAAgFQAAAAAAgBQAAgBABAAQAAgBAAAAQAAgBABAAIAEgFQAHgGADgHQAEgHAAgHQAAgLgLgGQgKgFgSgBQgLAAgJADQgKACgKAEIgEACIgDAAQgEAAgDgDQgDgDAAgFQAAgEADgDQAEgDAIgDQAHgDAKgCQALgBAOAAQASAAAOAFQANAFAIAKQAHAKAAANQAAAMgFALQgGALgJAIIgFADIgFABQgEAAgDgDg");
	this.shape_22.setTransform(721.475,146.175);

	this.shape_23 = new cjs.Shape();
	this.shape_23.graphics.f("#006600").s().p("AAkBrIgSgDIgSgFIgSgFQgQgEgMgGQgNgFgHgGQgFgDgCgFQgCgFAAgHQAAgIAEgGQAEgGAGAAQAFAAADADQADADAAAFIAAACIgBACIgBADIAAACQAAACADADIAKAGQAJAEAOAEIAeAIQARAEAQABQAGABADADQADADAAAFQAAAFgDADQgDADgFAAIgMgBgAAMAuQgDgEAAgFIAAgDIADgDQAFgFADgEQACgEAAgDIgBgFIgCgHIgSABIgbAAIgdABIgSABIgLAAIgDAAIgBAAQgHAAgDgCQgDgDAAgEQAAgEABgCQACgCADgBIACgBIAEAAIAWAAIAZgBIAjgBIASAAIgGgOIgFgSIgMAAIguABIgYABIgCAAIgCAAQgFAAgDgCQgDgDAAgFQAAgFADgCQACgDAGAAIARAAIAUAAIAcgBIAPAAIgCgGIgCgHIgBgCIAAgBIgBgHIgBgGQAAgFADgDQADgEAGAAQAEAAADAEQADADAAAFIACANIAEAPIAhgBIAogDIABAAIACAAQAFAAACADQADACAAAFQAAAFgCACQgDADgEAAIgSABIgqACIgLAAIAHATIAFANIAbgBIAfgCIABAAIABAAQAEAAACADQADADAAAFQAAAEgCACQgDACgEAAIgIAAIgOABIgPABIgOAAIACAIIABAHQAAAGgEAHQgEAHgFAGQgDADgDACIgGABQgEAAgEgDg");
	this.shape_23.setTransform(697.475,146.425);

	this.shape_24 = new cjs.Shape();
	this.shape_24.graphics.f("#006600").s().p("AgQBjQgQgBgKgBQgJgBgFgCQgJgEgFgHQgFgGAAgIQAAgHAEgIQADgHAHgHIAcgYIAegYIgfgXIgbgWIgTgRIgHgJQgCgEAAgEQAAgFADgDQADgDAFAAQAEgBACACIAEAEQAEAIAKAJQAKAKAQANIAoAfIANgKIALgIIALgIIADgDIAEgDIAHgGIAFgHIADgCIAFgBQAFAAADADQAEADAAAFQAAAGgFAGQgFAGgMAHIgcAVIgfAXIgbAXIgUAUIgHAHQgCADAAADQAAAEADACQADADAHABIAVACIAiAAIAZAAIAQgBIAJgCIAFgCIAEgBIADgBQAFAAADADQADADAAAFQAAAEgCADQgCACgDACQgFADgHABIgSACIgeAAIgnAAg");
	this.shape_24.setTransform(672.875,146.2);

	this.shape_25 = new cjs.Shape();
	this.shape_25.graphics.f("#006600").s().p("Ag+BXQgMgHgGgOIgEgNIgBgRIgBgSIgBgZIAAgcIAAgXIgBgMIgBgJIAAgBIAAgBQAAgGADgCQADgDAGAAQAGAAAEAGQADAGAAANIAAADIAAAFIgBAMIAAAQIABArIABAbQABAKADAFQACAFADADQAFAEAGADQAHACAJAAIAMgBIANgDIACAAIAAgBQAEABADADQADADAAAGQAAAEgCADQgCADgFABIgHACIgLABIgLAAQgVAAgNgGgABIAqQgDgCgBgDIgBgCIAAgDIAAgHIgBgZIgCgbIgDgYIgEgTIgBgDIAAgCQAAgEADgDQADgDAFAAQAEAAADABIAEAFIABAGIADALIAEAcIADAfIABAcQAAALgCAEQgDAEgGAAQgEAAgDgCg");
	this.shape_25.setTransform(649.7042,146.475);

	this.shape_26 = new cjs.Shape();
	this.shape_26.graphics.f("#006600").s().p("AgfBhQgKgKAAgSQAAgOAHgMQAIgNAMgHQALgIAMAAIAJABIAJACIgCgQIgDgUIgBgCIAAgBQAAgEADgDQADgDAFAAQACAAADACQADABACADIAAACIABAHIADASIACANIACASIAIAIIAGAFIAFAFIACACIABAAIABABIAFAFIAKAFIAFAEQABACAAADQgBAGgCADQgDADgEAAQgDAAgEgDIgLgGIgEgEIgFgFIgJgJQgIAYgOANQgOANgTAAQgPAAgJgLgAgEAnQgHAFgFAHQgEAHABAJQgBAJAEAFQAEAFAIAAQANAAAIgMQAKgMABgUIgKgGQgEgBgFgBQgIABgFAEgAheAiQgEgDAAgGIAAgCIACgDIAEgFQAMgMAKgPQALgQAIgRIgKAAIgNABIgLAAIgHAAQgFABgEgDQgCgDAAgFQAAgDACgEQADgDADAAIACAAIAEAAIAKAAIAZgBIAKAAIgBgRIgCgLIAAgDIAAgBQAAgEACgDQADgDAFAAQAIAAACAIQADAIABARIAAADIgBAGIAIAAIAKgBIATgBIAOgBIANgBIgEgLIgCgJQAAgEADgEQADgDAFAAQADABADABQADABAAAEIABABIAAAGQADAPALAOQAMAOASAJIAEAEQABACABADQgBAEgCADQgEAEgDAAQgFAAgOgKQgIgGgHgGQgGgGgFgHIgHAAIgHABIgFAAIgJAAIgUABIgOABIgRAAQgIAUgLASQgLASgPASIgCAFIgBABIgFADIgEABQgFAAgDgEg");
	this.shape_26.setTransform(625.75,146.4);

	this.shape_27 = new cjs.Shape();
	this.shape_27.graphics.f("#006600").s().p("AAABWIgDgCIgCgCIgCgHIgJgXIgNgcIgNgcIgFADIgHADIgEACIgIADIgIACQgFAAgCgDQgDgCAAgEQAAgEACgCQADgCAEgBIAEgBIAHgDIAGgDIAIgDIgGgNIgLgVIgHgMIgCgFIAAgDQAAgEADgCQADgDAEAAIAEABQABAAAAABQABAAAAABQAAAAABABQAAAAAAABIABAAIACAEIAFAKIAJAUIAEAGIAEAKIAFgDIAHgDIANgGIAFgDIAFgCIAAgGIgBgLIAAgKIAAgFIAAgBIAAgBQAAgDABgDQADgCAEAAQADAAADACQACABABADIAAAFIABAIIAAAJIABAFIATgHQAIgCAGAAQAQAAAIAKQAJAJAAATQAAAMgGAMQgGALgMAKIgLAIIgLAFIgIACQgEAAgCgCQgDgDAAgEIABgEIACgDIACgBIAHgDQAJgEAHgGQAHgGAEgIQAEgIAAgIQAAgKgEgFQgDgFgIAAQgFAAgHACIgSAIIAAAMIABAMIAAAJIAAAEIgBACQgBADgCABQgCACgDAAQgFAAgCgDQgCgCAAgFIgBgMIAAgOIgGACIgGAEIgKAFIgGADIATAoIALAaIAGAOIADAGIAAADQAAAEgDADQgDACgEAAIgDgBg");
	this.shape_27.setTransform(601.725,148.675);

	this.shape_28 = new cjs.Shape();
	this.shape_28.graphics.f("#006600").s().p("AgxBjQgNgGgHgMIgEgJIgBgMIgBgVIABgbIABgeIABgdIABgXIABgEIAAgEIAAgGIgCgGIAAgCIAAgCQAAgFADgCQADgDAGgBQAGAAAEAHQAEAFAAAMIAAACIgBAEIAAAKIgDAgIgBAiIgBAgIABAUIABALIADAIQAEAFAHAEQAIACALAAQAOAAAKgDQALgFAJgJIAJgLIAJgPIAIgQQACgEACgBQADgCADAAQAFAAAEADQADAEABAFIgEALIgJARQgFAKgGAHQgMAQgRAIQgSAHgWABQgTAAgNgHgAAUgGIgGgGIgLgOIgOgVQgFgHAAgCQABgDACgDQADgCADAAQABAAAAAAQABAAAAAAQABAAAAAAQAAABABAAIADAEIAFAIIAJAMIAJAMIAHAJIACACIAAACQAAAEgCADQgDADgDAAIgEgCgAAzgaIgGgGIgLgOQgLgOgEgIQgFgGAAgCQABgDACgDQADgCADgBIAEACIAEAEIAFAIIAJALIAJANIAHAJIACACIAAACQAAAEgCADQgDACgDAAIgBABIgDgCg");
	this.shape_28.setTransform(578.775,146.2);

	this.shape_29 = new cjs.Shape();
	this.shape_29.graphics.f("#006600").s().p("AgcBwQgMgBgGgCQgGgCgCgEQgCgFAAgHIAAghQABgEACgDQADgCAEAAQAFAAADACQADADAAAEIAAAZQAAAFACACQACACAIACIAXAAIASAAIAOgCQAGAAACgEQACgEABgLQAAgEACgCQADgDAEAAQAGAAACADQADADAAAGQAAANgEAIQgDAJgHACQgFACgMACIgeABIgegBgAhsBpQgDgEAAgEIABgDIADgFIAIgNIAJgRQACgFACgCQADgBADAAQAEAAADACQAEAEAAAEIgCAHIgFALIgGAMQgGAJgEAFQgEADgEAAQgEAAgEgDgABgBoQgDgCgDgEIgMgTIgKgOIgCgEIgBgDQAAgEADgDQADgDAEAAIAFACQADABADADIAKANIANASQAEAHAAAEQAAAEgEADQgCADgFAAQgEgBgCgBgAAIBTQgDgBgCgEIgHgKIgEgHIgEgDIgCgEIgBgDQAAgEADgDQADgCAEAAIAEABIAEADIAIAKIAJAMQADAFAAADQAAADgDADQgDADgEAAQgDAAgCgCgAhiArQgDgDAAgDIAAhEQAAgJAFgFQAEgDAIAAIA/AAQAJgBAEAFQAFAEAAAJIAAA1QAAAHgDAFQgCAEgFACQgCABgFABIgMABIgKgBIgIAAIgFgEQgBgCAAgDQAAgFACgCQADgCADAAIABAAIACAAIAIABIAHAAQAEAAACgBQABgCAAgFIAAgEIg6AAIAAAYQAAAEgDACQgDACgEAAQgEAAgDgCgAhRAAIA6AAIAAgKIg6AAgAhQghQAAAAAAABQgBAAAAABQAAAAAAABQAAAAAAABIAAAEIA6AAIAAgEIgBgEIgEgBIgwAAIgEABgAAeApQgKgCgEgFQgDgEAAgKIAAgsQAAgEACgCQADgCAFgBQAEABADACQACACAAAEIAAAOIAdgGIAagHIAEgBIACAAQAEAAADADQADACAAAEQAAADgCADQgCACgGABQgMAEgPACIgiAFIAAAKQAAAEACACQACACAFABIAQABIAYgBQAHgBACgEQACgCAAgIQAAgDACgCQADgDAEAAQAFAAADADQACADAAAEQAAANgDAHQgEAHgHACIgJACIgMABIgOAAIgIAAQgPAAgJgCgAAdglQgKgCgDgFQgDgFAAgJIAAgrQAAgFACgCQADgCAFAAQAEAAADACQACACAAAFIAAAMIASgDIASgFIASgFIADAAIACgBQAEAAADADQACADAAAEQAAADgCACQgCACgFACIgSAEIgUAFIgVADIAAAJQAAAFACACQACABAGABIASABIAUgBQAGgBACgDQACgEAAgHQAAgEACgCQADgDAEAAQAFAAADADQACACAAAGQAAAIgCAGQgBAHgDADQgDACgFACIgOACIgWABQgUAAgKgBgAgGg2IgFgFIgCgCIgBgCIgYACIgbACIgXACIgOAAQgFAAgCgCQgDgCAAgFIABgFQACgDADAAIACAAIAGAAIADAAIABAAIAKgQIAIgPIAEgEIAGgCQAEAAACADQADACAAADQAAADgEAHIgMASIACAAIAUgBIAQgCIADAAIACAAIADAAIgDgEIgEgFQgDgDAAgDQAAgEADgDQACgCAEAAQADAAADACIAKAJIAQAVIADAEIABAEQAAAEgDADQgDACgDAAQgDABgCgCg");
	this.shape_29.setTransform(553.575,145.95);

	this.shape_30 = new cjs.Shape();
	this.shape_30.graphics.f("#006600").s().p("Ag6BuQgDgCAAgEIAAhLIgQANIgRAMIgEADIgEAAQgFAAgDgDQgCgDAAgFQgBgEACgCQACgDAFgDIANgIIAPgLIAPgKIAAhpQAAgEADgCQADgDAEAAQAFAAADADQADACAAAEIAADMQAAAEgDACQgDACgFABQgFAAgCgDgAgeBsQgDgDAAgFQAAgBAAAAQAAgBAAAAQAAgBABAAQAAgBAAAAIAGgGQAXgXAMgfQANgeADglIgvAAQgEAAgDgCQgCgDAAgEQAAgFACgCQADgDAEAAIAwAAIAAg1QAAgEADgCQADgDAEAAQAFAAADADQADACAAAEIAAA1IA3AAQAEAAACADQACADABAEQgBAEgCADQgCACgEAAIg0AAQAIAlAOAfQAPAeAWAXIADAEIABAEQAAAFgDADQgDAEgFAAQgEAAgGgFQgGgGgJgMQgNgSgJgXQgKgWgFgYQgFAagJAXQgJAWgOATQgIAKgGAFQgHAGgEAAQgFgBgDgCgAhYgNIgDgDIgBgCIgBgGIgEgPIgEgOIgEgPIgBgEIgBgDQABgEACgDQADgDAFAAQADAAADACQACABABAEIADAIIAEANIADAOIADAMIABAGIABADQgBAFgCADQgDADgFAAIgFgCgABTg7IgFgGIgEgIIgEgHIgHgLIgCgEIAAgDQAAgEADgDQADgDAEAAQADAAACACIAFAFIAOAXQAEAIAAADQAAAEgDADQgDADgFAAQgDAAgCgCg");
	this.shape_30.setTransform(529.67,146.325);

	this.shape_31 = new cjs.Shape();
	this.shape_31.graphics.f("#006600").s().p("AhpBwQgCgCAAgDIAAiFQAAgIAEgEQAEgDAHAAIAKAAIgDgLIgDgLIgDgJIgQAAQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAxAAIAAgPQAAgDADgDQACgCAFAAQAEAAADACQADADAAADIAAAPIAvAAQADAAACADQACACAAAEQAAAEgCADQgCACgDAAIgRAAIgEAOIgFARIALAAQAHAAAEADQAEAEAAAIIAAB3QAAALgGAEQgEAEgPAAQgNAAgFgCQgFgCAAgGQAAgEACgDQACgCAEAAIADAAIAGAAIACABIACAAQAGAAACgCQACgBAAgFIAAhqQAAgBAAAAQAAgBgBAAQAAgBAAAAQAAAAgBgBQAAAAAAAAQgBgBAAAAQgBAAAAAAQgBAAAAAAIgcAAIAAAQIAVAAQAEAAABACQACACAAAEQAAADgCACQgBACgEAAIgVAAIAAARIAIAAQAHAAADADQADADAAAHIAAAjQAAANgNAAIggAAQgNAAAAgNIAAgjQAAgHAEgDQADgDAGAAIAIAAIAAgRIgUAAQgDAAgCgCQgCgCAAgDIACgGQACgCADAAIAUAAIAAgQIgbAAQgBAAAAAAQgBAAAAAAQgBAAAAABQAAAAgBAAQAAABAAAAQgBAAAAABQAAAAAAABQAAAAAAABIAAB/QAAADgDACQgCACgEAAQgEAAgDgCgAg9AnIgBADIAAAWIABAEIAEABIARAAIADgBIABgEIAAgWIgBgDIgDgBIgRAAIgEABgAhFg+IADAMIACAJIAdAAIADgMIADgJIACgKIgtAAIADAKgABkBwIgGgGQgJgJgHgJQgHgKgHgMIgPAWQgIALgIAHIgGAGIgFABQgFAAgDgDQgDgDAAgEIABgFIAGgGQALgMAJgLQAIgLAHgOIgKgZIgJgcQgEAJgDAEQgDAEgEAAQgEAAgDgDQgDgCAAgDIAAgDIACgGQAJgWAGgYQAGgYACgYQABgFACgCQADgDAEAAQAFAAACADQADACAAAEIgBALIgDARIA2AAQAEAAACACQACADAAAEQAAAFgCACQgCADgEAAIgHAAQgBATgEATIgIAiQgFARgGANQAGALAKANQAKANALALIAEAFIABAFQgBAEgCADQgDADgFAAIgFgBgAAug0IAAACIgBADIgBADIgBAEQADARAFAQIALAdQAHgTAEgUQAFgUACgUIggAAg");
	this.shape_31.setTransform(505.725,146.175);

	this.shape_32 = new cjs.Shape();
	this.shape_32.graphics.f("#006600").s().p("AhhBxQgEAAgEgDQgDgDAAgFIABgEIAEgGIALgOIAKgSQABgDADgBIAFgCQAFAAADADQADADAAAFQAAADgCAFIgHAMIgJAOQgGAIgEAEQgDACgDAAIgBAAgAgdBwQAAgBgBAAQAAAAgBgBQAAAAgBgBQAAAAAAgBIgBgCIgBgEIgCgRIgEgSIAAgCIAAgBQAAgEADgDQADgDAFAAQAEAAADADQACACACAGIADAOIADAPIABAKQAAAEgDADQgDACgGAAQgDAAgDgBgABbBvQgCgCgDgFIgLgUIgLgQIgCgEIAAgDQAAgEADgDQAEgDAEAAQADAAADACQADACAFAGIALARIAJAPQACAGAAADQAAAEgDADQgEADgFAAQgDAAgDgBgAAdBuQgDgCgBgFIgGgQIgEgKIgDgIIgBgDIAAgDQAAgEADgDQADgCAFgBQAEAAACADQADACADAIIAHAPIAEANIACAIQAAAEgDADQgEADgFAAQgEAAgCgCgAhjAtQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAXAAIAAgoIgcAAQgDAAgDgCQgCgDAAgEQAAgEACgCQACgDAEAAIAcAAIAAgfQgIALgFAEQgFAEgDAAQgFAAgCgDQgDgDAAgEQAAAAAAgBQAAgBAAAAQAAgBAAAAQAAgBABAAIAFgHQAKgKAIgLQAIgKAGgLQABgDADgCQACgBADAAQAEAAADACQADADAAAEQAAACgBADIgGAKICaAAQAEAAACADQACACABAEQAAAFgDACQgCACgEAAIgQAAIAAAnIAYAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAIgYAAIAAAoIATAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAgAAiAbIAcAAIAAgoIgcAAgAgLAbIAbAAIAAgoIgbAAgAg5AbIAcAAIAAgoIgcAAgAAigfIAcAAIAAgnIgcAAgAgLgfIAbAAIAAgnIgbAAgAg5gfIAcAAIAAgnIgcAAg");
	this.shape_32.setTransform(481.575,146.1286);

	this.instance = new lib.Text_new_enemy("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(344.65,57.15,1,1,0,0,0,312.9,65.4);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance},{t:this.shape_32},{t:this.shape_31},{t:this.shape_30},{t:this.shape_29},{t:this.shape_28},{t:this.shape_27},{t:this.shape_26},{t:this.shape_25},{t:this.shape_24},{t:this.shape_23},{t:this.shape_22},{t:this.shape_21},{t:this.shape_20},{t:this.shape_19},{t:this.shape_18},{t:this.shape_17},{t:this.shape_16},{t:this.shape_15},{t:this.shape_14},{t:this.shape_13},{t:this.shape_12},{t:this.shape_11},{t:this.shape_10},{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(28));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(39.9,25.7,785.9,226.60000000000002);


(lib.exp_text_6 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Text_new_enemy("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(344.65,57.15,1,1,0,0,0,312.9,65.4);

	this.shape = new cjs.Shape();
	this.shape.graphics.f("#006600").s().p("Ag+BXQgMgHgGgOIgEgNIgBgRIgBgSIgBgZIAAgcIAAgXIgBgMIgBgJIAAgBIAAgBQAAgGADgCQADgDAGAAQAGAAAEAGQADAGAAANIAAADIAAAFIgBAMIAAAQIABArIABAbQABAKADAFQACAFADADQAFAEAGADQAHACAJAAIAMgBIANgDIACAAIAAgBQAEABADADQADADAAAGQAAAEgCADQgCADgFABIgHACIgLABIgLAAQgVAAgNgGgABIAqQgDgCgBgDIgBgCIAAgDIAAgHIgBgZIgCgbIgDgYIgEgTIgBgDIAAgCQAAgEADgDQADgDAFAAQAEAAADABIAEAFIABAGIADALIAEAcIADAfIABAcQAAALgCAEQgDAEgGAAQgEAAgDgCg");
	this.shape.setTransform(367.7042,194.725);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#006600").s().p("AggBhQgJgKAAgSQAAgOAHgNQAIgMALgHQAMgIAMAAIAJAAIAKADIgDgPIgEgVIAAgCIAAgBQAAgEADgDQADgDAEAAQAEAAACACQADACACACIAAACIABAHIADASIACANIABASIAJAIIAGAFIAFAFIADACIABAAIAAABIAGAFIAJAFIAEAEQACADAAACQAAAGgDADQgDADgFAAQgCAAgFgDIgKgGIgDgEIgGgFIgKgJQgGAYgOANQgPANgTAAQgPgBgKgKgAgFAnQgHAEgEAIQgDAIAAAIQAAAJADAFQAEAFAHAAQANgBAKgLQAJgMABgUIgJgGQgFgBgFgBQgIABgGAEgAhfAiQgDgDAAgGIAAgCIACgDIAFgFQALgMAKgPQALgQAIgRIgKAAIgMABIgNAAIgFAAQgHAAgCgCQgEgDAAgFQAAgEADgDQACgDAEgBIABAAIAFAAIAKAAIAaAAIAJAAIgBgRIgCgLIAAgCIAAgCQAAgEADgDQACgDAGAAQAGAAAEAIQACAHAAASIAAADIAAAGIAIAAIAKgBIATgBIAOgBIAMAAIgDgMIgBgJQAAgFACgDQADgDAFAAQAEABACABQACACABADIABABIAAAGQACAPAMAOQAMAOASAJIAEAEQACACAAADQgBAEgDADQgCAEgFAAQgEAAgPgKQgHgFgGgHQgHgGgFgHIgHAAIgHABIgGAAIgIAAIgUABIgOAAIgQABQgJAUgLASQgLASgOASIgEAFIgBABIgDADIgFABQgFAAgEgEg");
	this.shape_1.setTransform(343.75,194.65);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#006600").s().p("AgXBkIgRgCQgHgDgDgGQgDgFAAgMIAAgDIAAgFIAAgPIAAgRIAAgaIAAgRIgRAAIgIABIgFAAIgJgBIgGAAIgCgDIgBgDIgBgEQAAgEACgDQACgDAEgBIAIAAIAhAAIAAgOIAAgSIAAgJIAAgIIAAgGQAAgFADgDQADgCAFAAQAFAAACACQADACAAAEIAAAKIAAATIABAcIALgBIALAAIAPAAIALAAIAKAAIAAgPIAAgIIAAgGIgBgSIAAgKQABgFACgCQADgDAFAAQAFAAADACQACADAAAEIAAAHIABANIAAATIAAASIAVgBIAWAAIABgBIACAAQAFAAACACQADADAAAFQAAAFgCACQgCACgEABIgKABIgcABIgJAAIAAAZQAAAIgDAGQgDAHgFAEQgEAFgEgBQgEAAgEgDQgDgDAAgFIAAgEIADgEIAEgGIABgHIAAgOIAAgHIgKAAIgPABIgJAAIgOABIgLAAIAABOQAAAFADACQACADAJABIAVABIARAAIAQgBIAJgCIAGgCIAGgDIAFgEIAEgBQAFAAACAEQAEAEAAAFQAAAEgEAGQgFAEgGADIgLADIgSABIgaABIgegBg");
	this.shape_2.setTransform(319.55,194.35);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#006600").s().p("AhPBvQgCgDgBgDIAAh6IgLARQgEAFgDAAQgEAAgDgDQgDgCAAgEIABgDIADgFQAHgLAHgPQAIgQAGgRIALgiIADgFQADgCADAAQAEAAADADQADACAAAEIgCAJIgGARIgHATIAACjQAAADgDADQgCACgEAAQgFAAgCgCgABCBuQgHgBgDgDQgDgCAAgFQABgEACgDQADgDAEAAIADABIAGAAIAHABIAEAAQAFAAABgCQACgCAAgFIAAi2QAAgEADgCQACgDAFAAQAEAAADADQACACAAAEIAAC/QABALgFAEQgGAFgMAAIgWgBgAgzBoQgCgDAAgFQAAgDABgCQACgCADgBIACAAIAFgBIAMgCIANgCIADgBIAAgsIgeAAQgEAAgCgCQgDgCAAgFQAAgEACgCQADgDAEAAIAeAAIAAgWQAAgDADgDQACgCAFAAQADAAACACQADADAAADIAAAWIAcAAQADAAACADQADACAAAEQAAAEgDADQgCACgDAAIgcAAIAAApIAMgCIAIgCIAIgCIADgBIACAAQAEAAACADQADACAAAEQAAADgCACQgBACgDABIgOAEIgUAFIgVAEIgTADIgLACQgFAAgDgDgAA3A8QgCgCAAgDIAAiIQAAgDACgDQADgCAEAAQAEAAADACQACADABADIAACIQgBADgCACQgDADgEAAQgEAAgDgDgAAhgJIgDgCIgBgCIgBgDIgBgDIgBgCIgUADIgUAEIgTACIgLACQgEgBgDgCQgCgDAAgFQAAgDABgCQACgDADAAIADgBIAEAAIABAAQAFgLAFgOIAIgbIgUAAQgEAAgCgCQgCgDAAgEQAAgEACgDQACgCAEAAIBOAAQAEAAACACQADADAAAEQAAAEgDADQgCACgEAAIgnAAIgIAbIgJAXIAUgCIATgCIgEgJIgFgKIgBgFQAAgEACgCQADgCAEAAIAEABIAEAEIAFAJIAGAOIAFAMIADAHIABADIAAACQAAAEgDACQgDACgEAAIgEgBg");
	this.shape_3.setTransform(294.9523,194.525);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#006600").s().p("AgQBeQgMgJAAgUIABg7IgXAAIgVABIgOAAQgJABgDgDQgEgCAAgFIADgHQACgCACgBIABAAIAEAAIAHAAIAJAAIANAAIATgBIAOAAIABgjIgEAAIgcABIgPAAIgHAAIgGAAQgGABgDgDQgDgDAAgFQAAgDACgDQADgDADgBIAIAAIAiAAIAKAAIAMAAIABgaQAAgFADgDQACgCAFAAQAFAAADACQACADAAAEIAAAbIAVgBIAaAAIAZgBIARgBIADAAQAEAAADACQADADAAAEQAAAEgDADQgCADgFAAIgMABIgXABIgcAAIgdABIgBAjIAcgBIARAAIALgBIAKAAIARgBIAOAAQAEAAAEACQADADAAAFQgBAEgCACQgCACgEABIgBAAIgIAAIgSABIgkABIgSAAIgSAAIgBA7QAAAJAHAFQAFAGANAAQAQAAAIgHQAJgGgBgMIAAgKIgDgIIgBgCIAAgCQAAgFADgDQADgDAFAAQAHAAAEAJQAFAJAAAPQAAAVgPANQgPAMgZgBQgWABgMgLg");
	this.shape_4.setTransform(271.45,194.4);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#006600").s().p("AAeBcIgUgGIgSgHQgWgKgLgOQgLgNAAgQQAAgMAKgPQALgQATgSQASgSAagSIgnABIgsAAIgrABQgEAAgDgDQgDgDAAgFQAAgDACgCIAEgEIADgBIAFAAIAZAAIAlAAIAlgBIAkgBIAcgBIARgBIACAAQADABADADQADADAAADQAAAEgDADQgCAEgDAAIgGAAIgJABIgIAAQgUALgSAOQgSAOgOANQgNAOgIALQgIAMAAAIQgBAPARALQAQALAkAJIADABIADAAIABAAIADgBIACAAIACAAQAEAAADADQADADAAAFQAAAGgEADQgFAEgJAAIgPgDgAA/AfIgGgGIgLgPQgLgNgEgHQgFgGAAgCQAAgEADgCQACgDAEAAIAEABIAEAFIAGAJIAJAMIAJALIAGAHIACADIABACQgBAEgCACQgDADgDAAIgBAAIgDgBgABdAKIgGgGIgLgNIgQgVQgEgHAAgCQAAgDACgDQADgCADgBQABAAAAAAQABAAAAABQABAAAAAAQABAAAAABIAEAEIAIAMIAMAPIAKAMIACADIABADQAAADgDADQgCACgDAAIgBAAIgDgBg");
	this.shape_5.setTransform(247.3333,195.125);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#006600").s().p("AgcBwQgMgBgGgCQgGgCgCgEQgCgFAAgHIAAghQABgEACgDQADgCAEAAQAFAAADACQADADAAAEIAAAZQAAAFACACQACACAIACIAXAAIASAAIAOgBQAGgBACgEQACgEABgLQAAgEACgCQADgDAEAAQAGAAACADQADADAAAGQAAAOgEAHQgDAJgHACQgFACgMACIgeABIgegBgAhsBpQgDgEAAgEIABgDIADgGIAIgMIAJgRQACgFACgCQADgBADAAQAEAAADACQAEADAAAFIgCAHIgFALIgGAMQgGAKgEAEQgEADgEAAQgEAAgEgDgABgBoQgDgCgDgEIgMgTIgKgOIgCgEIgBgDQAAgEADgDQADgDAEAAIAFACQADABADADIAKANIANASQAEAHAAAEQAAAEgEADQgCADgFAAQgEgBgCgBgAAIBUQgDgCgCgEIgHgKIgEgHIgEgDIgCgEIgBgDQAAgEADgDQADgCAEAAIAEAAIAEAEIAIAKIAJAMQADAFAAADQAAADgDADQgDADgEAAQgDAAgCgBgAhiArQgDgDAAgDIAAhEQAAgJAFgFQAEgDAIAAIA/AAQAJgBAEAFQAFAEAAAJIAAA1QAAAHgDAFQgCAEgFACQgCABgFABIgMAAIgKAAIgIAAIgFgDQgBgDAAgDQAAgEACgDQADgCADAAIABAAIACAAIAIAAIAHABQAEAAACgBQABgCAAgFIAAgEIg6AAIAAAYQAAADgDACQgDADgEAAQgEAAgDgCgAhRAAIA6AAIAAgKIg6AAgAhQghQAAAAAAABQgBAAAAABQAAAAAAABQAAAAAAABIAAAEIA6AAIAAgEIgBgEIgEgBIgwAAIgEABgAAeApQgKgCgEgFQgDgEAAgKIAAgrQAAgEACgDQADgCAFAAQAEAAADACQACADAAAEIAAANIAdgGIAagHIAEgBIACAAQAEAAADADQADACAAAFQAAACgCADQgCACgGACQgMADgPACIgiAFIAAAKQAAADACADQACACAFABIAQAAIAYAAQAHgBACgEQACgCAAgIQAAgDACgCQADgDAEAAQAFAAADADQACACAAAGQAAAMgDAHQgEAHgHACIgJACIgMAAIgOAAIgIABQgPAAgJgCgAAdgmQgKgBgDgFQgDgFAAgJIAAgrQAAgEACgDQADgCAFAAQAEAAADACQACADAAAEIAAAMIASgDIASgFIASgFIADAAIACgBQAEAAADADQACACAAAFQAAADgCACQgCADgFABIgSAEIgUAFIgVADIAAAJQAAAFACACQACABAGABIASABIAUgBQAGgBACgDQACgEAAgHQAAgEACgCQADgDAEAAQAFAAADADQACACAAAGQAAAIgCAGQgBAHgDADQgDACgFACIgOACIgWABQgUAAgKgCgAgGg2IgFgFIgCgCIgBgCIgYACIgbACIgXACIgOAAQgFAAgCgCQgDgCAAgFIABgFQACgDADAAIACAAIAGAAIADAAIABAAIAKgRIAIgOIAEgFIAGgBQAEAAACACQADACAAAEQAAADgEAHIgMASIACAAIAUgBIAQgBIADAAIACAAIADgBIgDgFIgEgEQgDgDAAgDQAAgEADgDQACgDAEABQADAAADACIAKAJIAQAVIADAEIABAEQAAAEgDADQgDACgDAAQgDAAgCgBg");
	this.shape_6.setTransform(223.575,194.2);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#006600").s().p("Ag6BuQgDgCAAgEIAAhLIgQANIgRAMIgEADIgEAAQgFAAgDgDQgCgDAAgFQgBgEACgCQACgDAFgDIANgIIAPgLIAPgKIAAhpQAAgEADgCQADgDAEAAQAFAAADADQADACAAAEIAADMQAAAEgDACQgDACgFABQgFAAgCgDgAgeBsQgDgDAAgFQAAgBAAAAQAAgBAAAAQAAgBABAAQAAgBAAAAIAGgGQAXgXAMgfQANgeADglIgvAAQgEAAgDgCQgCgDAAgEQAAgFACgCQADgDAEAAIAwAAIAAg1QAAgEADgCQADgDAEAAQAFAAADADQADACAAAEIAAA1IA3AAQAEAAACADQACADABAEQgBAEgCADQgCACgEAAIg0AAQAIAlAOAfQAPAeAWAXIADAEIABAEQAAAFgDADQgDAEgFAAQgEAAgGgFQgGgGgJgMQgNgSgJgXQgKgWgFgYQgFAagJAXQgJAWgOATQgIAKgGAFQgHAGgEAAQgFgBgDgCgAhYgNIgDgDIgBgCIgBgGIgEgPIgEgOIgEgPIgBgEIgBgDQABgEACgDQADgDAFAAQADAAADACQACABABAEIADAIIAEANIADAOIADAMIABAGIABADQgBAFgCADQgDADgFAAIgFgCgABTg7IgFgGIgEgIIgEgHIgHgLIgCgEIAAgDQAAgEADgDQADgDAEAAQADAAACACIAFAFIAOAXQAEAIAAADQAAAEgDADQgDADgFAAQgDAAgCgCg");
	this.shape_7.setTransform(199.67,194.575);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.f("#006600").s().p("AhpBwQgCgCAAgDIAAiFQAAgIAEgEQAEgDAHAAIAKAAIgDgLIgDgLIgDgJIgQAAQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAxAAIAAgPQAAgDADgDQACgCAFAAQAEAAADACQADADAAADIAAAPIAvAAQADAAACADQACACAAAEQAAAEgCADQgCACgDAAIgRAAIgEAOIgFARIALAAQAHAAAEADQAEAEAAAIIAAB3QAAALgGAEQgEAEgPAAQgNAAgFgCQgFgCAAgGQAAgEACgDQACgCAEAAIADAAIAGAAIACABIACAAQAGAAACgCQACgBAAgFIAAhqQAAgBAAAAQAAgBgBAAQAAgBAAAAQAAAAgBgBQAAAAAAAAQgBgBAAAAQgBAAAAAAQgBAAAAAAIgcAAIAAAQIAVAAQAEAAABACQACACAAAEQAAADgCACQgBACgEAAIgVAAIAAARIAIAAQAHAAADADQADADAAAHIAAAjQAAANgNAAIggAAQgNAAAAgNIAAgjQAAgHAEgDQADgDAGAAIAIAAIAAgRIgUAAQgDAAgCgCQgCgCAAgDIACgGQACgCADAAIAUAAIAAgQIgbAAQgBAAAAAAQgBAAAAAAQgBAAAAABQAAAAgBAAQAAABAAAAQgBAAAAABQAAAAAAABQAAAAAAABIAAB/QAAADgDACQgCACgEAAQgEAAgDgCgAg9AnIgBADIAAAWIABAEIAEABIARAAIADgBIABgEIAAgWIgBgDIgDgBIgRAAIgEABgAhFg+IADAMIACAJIAdAAIADgMIADgJIACgKIgtAAIADAKgABkBwIgGgGQgJgJgHgJQgHgKgHgMIgPAWQgIALgIAHIgGAGIgFABQgFAAgDgDQgDgDAAgEIABgFIAGgGQALgMAJgLQAIgLAHgOIgKgZIgJgcQgEAJgDAEQgDAEgEAAQgEAAgDgDQgDgCAAgDIAAgDIACgGQAJgWAGgYQAGgYACgYQABgFACgCQADgDAEAAQAFAAACADQADACAAAEIgBALIgDARIA2AAQAEAAACACQACADAAAEQAAAFgCACQgCADgEAAIgHAAQgBATgEATIgIAiQgFARgGANQAGALAKANQAKANALALIAEAFIABAFQgBAEgCADQgDADgFAAIgFgBgAAug0IAAACIgBADIgBADIgBAEQADARAFAQIALAdQAHgTAEgUQAFgUACgUIggAAg");
	this.shape_8.setTransform(175.725,194.425);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.f("#006600").s().p("AhhBxQgEAAgEgDQgDgDAAgFIABgEIAEgGIALgOIAKgSQABgDADgBIAFgCQAFAAADADQADADAAAFQAAADgCAFIgHAMIgJAOQgGAIgEAEQgDACgDAAIgBAAgAgdBwQAAgBgBAAQAAAAgBgBQAAAAgBgBQAAAAAAgBIgBgCIgBgEIgCgRIgEgSIAAgCIAAgBQAAgEADgDQADgDAFAAQAEAAADADQACACACAGIADAOIADAPIABAKQAAAEgDADQgDACgGAAQgDAAgDgBgABbBvQgCgCgDgFIgLgUIgLgQIgCgEIAAgDQAAgEADgDQAEgDAEAAQADAAADACQADACAFAGIALARIAJAPQACAGAAADQAAAEgDADQgEADgFAAQgDAAgDgBgAAdBuQgDgCgBgFIgGgQIgEgKIgDgIIgBgDIAAgDQAAgEADgDQADgCAFgBQAEAAACADQADACADAIIAHAPIAEANIACAIQAAAEgDADQgEADgFAAQgEAAgCgCgAhjAtQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAXAAIAAgoIgcAAQgDAAgDgCQgCgDAAgEQAAgEACgCQACgDAEAAIAcAAIAAgfQgIALgFAEQgFAEgDAAQgFAAgCgDQgDgDAAgEQAAAAAAgBQAAgBAAAAQAAgBAAAAQAAgBABAAIAFgHQAKgKAIgLQAIgKAGgLQABgDADgCQACgBADAAQAEAAADACQADADAAAEQAAACgBADIgGAKICaAAQAEAAACADQACACABAEQAAAFgDACQgCACgEAAIgQAAIAAAnIAYAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAIgYAAIAAAoIATAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAgAAiAbIAcAAIAAgoIgcAAgAgLAbIAbAAIAAgoIgbAAgAg5AbIAcAAIAAgoIgcAAgAAigfIAcAAIAAgnIgcAAgAgLgfIAbAAIAAgnIgbAAgAg5gfIAcAAIAAgnIgcAAg");
	this.shape_9.setTransform(151.575,194.3786);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape},{t:this.instance}]}).wait(28));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(39.9,25.7,609.7,232.5);


(lib.exp_text_4 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Text_new_enemy("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(344.65,57.15,1,1,0,0,0,312.9,65.4);

	this.shape = new cjs.Shape();
	this.shape.graphics.f("#006600").s().p("AgSAhQgJgFgFgJQgFgIAAgLQAAgKAFgIQAFgJAJgFQAJgGAJABQALgBAIAGQAJAFAFAJQAFAJAAAJQAAALgFAIQgFAJgJAFQgJAFgKAAQgKAAgIgFgAgOgOQgGAGgBAIQABAJAGAGQAGAGAIAAQAJAAAGgGQAGgGABgJQgBgIgGgHQgGgFgJgBQgIAAgGAHg");
	this.shape.setTransform(484.625,251.4);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#006600").s().p("AguBcQgNgHAAgQQAAgQARgNQARgNAfgHIgPgKIgTgMIgGgFQgBgDAAgEQAAgDACgEQADgEAEgEIAYgUIAngdIgBAAIgXAAIgZABIgZABIgUABQgJAAgDgDQgEgCABgGQgBgFADgDQADgCAGAAIACAAIAFAAIAGAAIAIAAIAvAAIArgDIADAAIABAAQAHAAAFADQAFAEAAAFIgBAEIgDAFIgCABIgGAFIgRANIgVARIgTAQIgNALIAPALQAIAFAOAHQARAJALAHQAKAIAFAGQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAFgIAIQgIAGAAAHQAAAHAGACQAGADAPAAQAQgBANgEQANgDAIgGQAIgGAAgJQAAgEgFgEQgEgEgKgHQgVAEgOAGg");
	this.shape_1.setTransform(466.6237,245);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#006600").s().p("AgWBkIgSgDQgHgCgDgGQgDgGAAgLIAAgEIAAgEIAAgOIAAgSIAAgbIAAgQIgRAAIgHAAIgGAAIgJAAIgGgBIgCgBIgBgEIgBgEQgBgFADgCQACgDAEAAIAIAAIAhgBIAAgOIAAgSIAAgKIAAgIIAAgFQAAgFADgCQADgDAGAAQAEAAACACQACACABAEIABAKIAAAUIAAAbIALAAIAKAAIAQAAIAKgBIALAAIAAgPIAAgIIAAgGIgBgTIAAgJQABgFACgCQADgDAFAAQAFAAACACQADACABAFIAAAHIAAAOIAAASIABASIAUgBIAWgBIACAAIABAAQAFAAACADQACADABAEQgBAEgBADQgCADgEABIgKAAIgcABIgJABIAAAZQgBAGgCAHQgDAHgEAEQgFAEgEAAQgFAAgDgDQgDgDAAgFIAAgEIADgDIAEgHIABgIIAAgNIAAgHIgKABIgOAAIgKAAIgOAAIgKABIAABOQAAAFACADQADACAHABIAWABIARgBIAPgBIAKAAIAGgCIAHgFIAEgCIAFgBQADAAADADQAEAEAAAEQAAAGgEAEQgEAFgIADIgKADIgSACIgbAAIgcgBg");
	this.shape_2.setTransform(443.05,244.35);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#006600").s().p("AhPBvQgCgDgBgDIAAh6IgLARQgEAFgDAAQgEAAgDgDQgDgCAAgEIABgDIADgFQAHgLAHgPQAIgQAGgRIALgiIADgFQADgCADAAQAEAAADADQADACAAAEIgCAJIgGARIgHATIAACjQAAADgDADQgCACgEAAQgFAAgCgCgABCBuQgHgBgDgDQgDgCAAgFQABgEACgDQADgDAEAAIADABIAGAAIAHABIAEAAQAFAAABgCQACgCAAgFIAAi2QAAgEADgCQACgDAFAAQAEAAADADQACACAAAEIAAC/QABALgFAEQgGAFgMAAIgWgBgAgzBoQgCgDAAgFQAAgDABgCQACgCADgBIACAAIAFgBIAMgCIANgCIADgBIAAgsIgeAAQgEAAgCgCQgDgCAAgFQAAgEACgCQADgDAEAAIAeAAIAAgWQAAgDADgDQACgCAFAAQADAAACACQADADAAADIAAAWIAcAAQADAAACADQADACAAAEQAAAEgDADQgCACgDAAIgcAAIAAApIAMgCIAIgCIAIgCIADgBIACAAQAEAAACADQADACAAAEQAAADgCACQgBACgDABIgOAEIgUAFIgVAEIgTADIgLACQgFAAgDgDgAA3A8QgCgCAAgDIAAiIQAAgDACgDQADgCAEAAQAEAAADACQACADABADIAACIQgBADgCACQgDADgEAAQgEAAgDgDgAAhgJIgDgCIgBgCIgBgDIgBgDIgBgCIgUADIgUAEIgTACIgLACQgEgBgDgCQgCgDAAgFQAAgDABgCQACgDADAAIADgBIAEAAIABAAQAFgLAFgOIAIgbIgUAAQgEAAgCgCQgCgDAAgEQAAgEACgDQACgCAEAAIBOAAQAEAAACACQADADAAAEQAAAEgDADQgCACgEAAIgnAAIgIAbIgJAXIAUgCIATgCIgEgJIgFgKIgBgFQAAgEACgCQADgCAEAAIAEABIAEAEIAFAJIAGAOIAFAMIADAHIABADIAAACQAAAEgDACQgDACgEAAIgEgBg");
	this.shape_3.setTransform(418.4523,244.525);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#006600").s().p("AAeBcIgUgGIgSgHQgWgKgLgOQgLgNAAgQQAAgMAKgPQALgQATgSQASgSAagSIgnABIgsAAIgrABQgEAAgDgDQgDgDAAgFQAAgDACgCIAEgEIADgBIAFAAIAZAAIAlAAIAlgBIAkgBIAcgBIARgBIACAAQADABADADQADADAAADQAAAEgDADQgCAEgDAAIgGAAIgJABIgIAAQgUALgSAOQgSAOgOANQgNAOgIALQgIAMAAAIQgBAPARALQAQALAkAJIADABIADAAIABAAIADgBIACAAIACAAQAEAAADADQADADAAAFQAAAGgEADQgFAEgJAAIgPgDgAA/AfIgGgGIgLgPQgLgNgEgHQgFgGAAgCQAAgEADgCQACgDAEAAIAEABIAEAFIAGAJIAJAMIAJALIAGAHIACADIABACQgBAEgCACQgDADgDAAIgBAAIgDgBgABdAKIgGgGIgLgNIgQgVQgEgHAAgCQAAgDACgDQADgCADgBQABAAAAAAQABAAAAABQABAAAAAAQABAAAAABIAEAEIAIAMIAMAPIAKAMIACADIABADQAAADgDADQgCACgDAAIgBAAIgDgBg");
	this.shape_4.setTransform(394.8333,245.125);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#006600").s().p("AgQBsQgFAAgDgEQgDgDgBgGQAAgDACgCIAGgGQAVgQANgQQAMgRABgOIABgSIAAgkIgaABIggABIgZAAIgVAAIAAALIgBAJIAAAHQAAAMACAKQABAJADAGQADAHAFAFIADAEIACAFQgBAFgDAEQgDADgFAAQgDAAgDgCIgHgIQgGgIgEgKQgDgKgBgKIgBgNIAAgPIAAgTIABgUIABgRIABgKQABgEADgBQACgCAFAAQAFAAADADQACADAAAFIAAABIAAACIAAAGIgBAHIAAAFIA0gBIAzgBIgBgRIAAgNIgBgMIAAgBQAAgFADgDQADgDAFAAQAJAAACAJIABAMIABAZIAAAHIAGAAIAKgBIAJAAIAFAAIAEgBIAEAAQAFAAADADQADADAAAFQAAAFgDADQgDACgHAAIgIABIgUAAIgIAAIAAALIAAAHIAAAYIgBASIgDAMIgEALQgEAHgGAIIgPASIgRAQIgJAIQgDACgDAAIgBAAg");
	this.shape_5.setTransform(371.525,244.6792);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#006600").s().p("AhvBpQgDgEAAgEIAAgDIADgEIAHgHIAXgWIAWgbIAVgaQAJgMAFgKIACgEIACgIIABgPIgWABIgeAAIgPgBIgLAAIgFAAQgEgBgCgCQgCgEAAgDQAAgFADgDQACgDAFAAIACAAIADABIAQAAIAWABIARAAIAXgBIABgNIABgKIAAgJIAAgDIABgDQAAAAABgBQAAAAABAAQAAgBABAAQAAgBABAAIAFgBQADAAACABIAEAEIAAADIABAEIgBAKIAAAQIgBAEIAJAAIAQAAIAMgBIALAAIgIgLQgEgFAAgDQAAgDADgDQACgCAEAAQAAAAABAAQABAAAAAAQABAAAAABQAAAAABAAIAEAFIAGAJIAIALIAJALIAHAIIACADIAAACQAAAEgCADQgDADgDAAQgDAAgEgEIgHgKIgVABIgWABIgVAAIgCAOIgBAJIgCAIIAHgBIAHgBQAOAAAMAGQAMAGAKAKIADAEIABADQgBAFgDADQgDAEgFAAIgDgBIgDgCIgEgFQgGgGgHgEQgIgEgIAAQgIAAgHACQgIACgIAEQgVAbgTAWQgSAWgPAPIgGAGIgFABQgEAAgEgDgAAQBnQgIgFgIgKIgIgMQgDgGAAgEQAAgEADgDQADgDAEAAIAEABIADACIABABIABAEQAFAKAHAGQAIAGAHABQAFgBAHgEQAHgEAHgIQAHgIAGgKQAAAAAAgBQABAAAAgBQAAAAABgBQAAAAABAAIAFgBQAEAAAEADQADADAAAFQAAADgDAFIgHAKIgKALQgKAKgKAFQgKAFgJAAQgJAAgJgFgABngxIgGgGIgLgOIgPgVQgFgHAAgCQABgDACgDQACgCAEAAIAEABIAEAEIAFAIIAJAMIAJALIAHAJIACADIAAADQAAADgCADQgDADgDAAIgEgCg");
	this.shape_6.setTransform(347.275,244.225);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#006600").s().p("AguBcQgNgHAAgQQAAgQARgNQARgNAfgHIgPgKIgTgMIgGgFQgBgDAAgEQAAgDACgEQADgEAEgEIAYgUIAngdIgBAAIgXAAIgZABIgZABIgUABQgJAAgDgDQgEgCABgGQgBgFADgDQADgCAGAAIACAAIAFAAIAGAAIAIAAIAvAAIArgDIADAAIABAAQAHAAAFADQAFAEAAAFIgBAEIgDAFIgCABIgGAFIgRANIgVARIgTAQIgNALIAPALQAIAFAOAHQARAJALAHQAKAIAFAGQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAFgIAIQgIAGAAAHQAAAHAGACQAGADAPAAQAQgBANgEQANgDAIgGQAIgGAAgJQAAgEgFgEQgEgEgKgHQgVAEgOAGg");
	this.shape_7.setTransform(322.6237,245);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.f("#006600").s().p("AhuBrQgDgDgBgEQAAgEACgCQACgCAFgDIANgKIAOgMIAAg9IgBgDQgBgBAAAAQgBAAAAAAQgBgBAAAAQgBAAAAAAIgWAAQgEAAgCgBQgCgDgBgEQABgFACgDQACgCAEgBIAcAAQAKAAAFAFQAEAFAAAIIAABBQAGAGAIAEQAHAFALACQAKADAQABIAkABIAWgBIAYAAIATgCIACAAIACAAQAFAAACADQADACAAAFQAAAFgDACQgCADgEABIgJAAIgPABIgSAAIgSABIgmgBIgZgCIgUgEQgJgDgHgFQgHgEgHgGQgNAOgJAHQgJAHgEAAQgFAAgDgDgAA2BKQgGgCABgGQAAgEACgDQACgCAEAAIACAAIAEAAIAEABIAEAAIAIgBQABgCAAgDIAAgVIgqAAIAAAjQAAAEgCACQgDACgEAAQgEAAgDgCQgCgCAAgEIAAgjIgnAAIAAAlQgBAEgCACQgDACgEAAQgEAAgDgCQgDgCAAgEIAAhoQAAgJAFgEQAEgFAJAAIAjAAIgJgGIgGgEIgJgFIgEgEQAAAAAAgBQgBAAAAAAQAAgBAAgBQAAAAAAgBQAAgDADgDQACgCAEAAIADAAIAEACIAOAJIALAHIARgJIAMgHQAFgEAAgBIgBgBIgDAAIhZAAQgDAAgCgDQgCgCAAgEQAAgDACgDQACgCADAAIBwAAQAHAAAEACQAEADAAAEQAAADgCADIgGAGIgNAJIgRALIgPAIIABACIABABIAnAAQAJAAAEAFQAFAEAAAJIAABcQAAAJgCAEQgDAEgFACQgGACgKAAQgPAAgFgDgAAmAQIAqAAIAAgTIgqAAgAgTAQIAnAAIAAgTIgnAAgAAmgTIAqAAIAAgOIgBgEIgEgBIglAAgAgSglIgBAEIAAAOIAnAAIAAgTIgiAAIgEABgAhKg7IgFgGIgMgOIgJgMIgEgEIgBgEQABgEADgDQADgDAEAAIAFABIAEADIANANIALAOIADAFIABAFQAAAEgEADQgDADgEABQgDAAgDgCg");
	this.shape_8.setTransform(299.125,244.625);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_9.setTransform(274.925,244.075);

	this.shape_10 = new cjs.Shape();
	this.shape_10.graphics.f("#006600").s().p("AhcBgQgDgEAAgFIAAgEIADgDIACgBIAFgEQATgLAQgMQARgNAOgOQAOgNAIgNQAJgMAIgNIAOgZQAFgMADgLIgXACIgbAAIgbABIgYAAQgFAAgDgCQgCgDgBgFQABgEABgDQACgDADgBIACAAIAEAAIALAAIAkAAIAfgBIAagBIAGgDIAFgBQAGAAACADQAEAEAAAGIgBAHIgFAKIgIASQgKAVgKARQgLARgMAPIAfAUIAYARIAXARQAFAFAAAGQAAAFgEAEQgDADgFABIgEgBIgEgDIgSgPIgbgUIgfgXIgaAYIgZAUIgUAOQgJAFgEAAQgEAAgEgDg");
	this.shape_10.setTransform(251.05,244.925);

	this.shape_11 = new cjs.Shape();
	this.shape_11.graphics.f("#006600").s().p("AAQBcIgDgDIgHgIIgRgUIgXgWIgTgSIgDgEIgBgFQAAgFADgDQAEgEAFAAIAFACIAJAHIAUATIAFAFQAUgMARgQQAQgPAMgSQAMgSAEgTIgfAAIgTAAIgNABIgOAAIg2AAIgQAAIgIABIgLgBIgGgCIgCgEIgBgEQABgEACgEQACgDAEAAIABAAIADAAIAIAAIAPAAIAvgBIAhAAIAaAAIATAAIASAAIAFgEIAFgBQAFAAADADQADAEAAAGIgBALIgEAPQgHARgJAQQgLARgMAMQgKAKgLAKQgLAJgQAJIARARIAHAJQABADAAACQAAAGgEADQgDAEgGAAIgEAAg");
	this.shape_11.setTransform(226.95,244.975);

	this.shape_12 = new cjs.Shape();
	this.shape_12.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_12.setTransform(202.975,244.725);

	this.shape_13 = new cjs.Shape();
	this.shape_13.graphics.f("#006600").s().p("ABKBwQgCgCAAgEIAAgaIgqAAQgDAAgCgCQgCgDAAgDQAAgEACgCQACgCADgBIAJAAIAAgkIgCAAQgDAAgDgCQgCgCAAgEQAAgEACgCQACgCAEAAIAjAAIAAgMQAAgDACgCQADgDAEAAQAEAAACADQADACAAADIAAAMIAJAAQAEAAACACQACACAAAEQAAAEgCACQgCACgEAAIgJAAIAAAkIAMAAQADAAACADIACAGQAAAEgCACQgCACgDAAIgMAAIAAAaQAAAEgDACQgCACgEAAQgEAAgDgCgAA4A/IAQAAIAAgkIgQAAgAhqBwQgCgCAAgEIAAi/QAAgJAEgFQAEgEAJAAIAiAAQAHAAADADQAEADAAAGIgDANIgFAUIgIAXIgBACIAAACIAAADIACADQAHAOAEAMQADAMAAAQQAAAQgHAHQgIAHgRAAIgHAAIgHgBIAAAwQAAAEgCACQgDACgEAAQgEAAgDgCgAhZhUIgBAEIAAB4IAHAAIAHAAQAIABADgEQADgEAAgLQAAgMgDgKQgEgLgGgJIgCgFIgBgEIAAgEIADgHIAFgPIAEgQIACgJIgBgEIgEgBIgQAAIgEABgAgpBuQgDgDAAgEQAAgBAAAAQAAgBAAAAQAAgBABAAQAAgBAAAAQACgCAHgEQAHgFAHgHIAMgOIgIgKIgJgIQgFAJgEAEQgFAEgDAAQgEAAgCgCQgDgDAAgDIABgDIADgFQAJgKAHgPQAHgOAEgPQABgEACgBQACgCADAAQAEABACACQACACABAEIgBACIgBAEIASAAQAIAAADADQAEAEAAAGIgBAIIgDALIgDALQgIAUgMAQQgMAQgQAKIgFADIgDABQgEgBgCgCgAgNAcIgEAIIAKAJIAHAHIAEgKIAEgLIABgIQAAgEgEAAIgPAAIgDAJgAAagEQgDgCAAgEIAAgkQgIALgJAHQgIAIgLAHIgNAIIgHACQgEAAgCgDQgDgDAAgEIABgEIADgDIACgBIAEgCQAMgFAKgHQAKgHAJgKIgqAAQgDAAgCgCQgCgDAAgDQAAgEABgCQACgCAEAAIA4AAIAAgkQAAgEADgCQADgDAEAAQAEAAACADQADACAAAEIAAAkIA7AAQADAAACACQACACAAAEQAAADgCADQgCACgDAAIgtAAQAKAJALAHQALAHAMAFIAGAEQACACAAADQAAAEgDADQgCACgEABIgFgBIgGgDQgMgGgMgJQgLgJgKgMIgBgBIAAAkQAAAEgDACQgCACgFAAQgEAAgCgCgAgKhIIgEgFIgEgHIgGgJIgBgCIAAgDQAAgEACgDQADgDAEAAQADAAADADIAIAJIAEAKQACADAAADQAAAEgDACQgCADgEAAQgDAAgCgBgABAhKQgDgDAAgDIABgEIADgEIAEgGIAGgJQACgDACgBQAAgBABAAQAAAAABAAQAAgBABAAQAAAAABAAQAEABADACQADADAAAEQAAADgDAFIgIAMIgGAGQgCACgDAAQgEgBgDgCg");
	this.shape_13.setTransform(179.475,244.425);

	this.shape_14 = new cjs.Shape();
	this.shape_14.graphics.f("#006600").s().p("AhGBnQgDgDAAgFQAAgEACgDQACgCADgCIABAAIAFAAQAQgBAQgDQAQgEAOgEQAPgGAKgGQAMgHAFgIQAGgJAAgIQAAgJgGgDQgGgFgPABIgSAAIgYACIgaADIgDAAIgDAAQgHAAgDgDQgEgDgBgIIgBgVIAAgOIAAgOIABgOIABgIQABgEADgBQACgCAFAAQAEAAADADQADACAAAFIAAACIgBAEIgBAOIgBAPIAAANIAAAGIABAFIAAAEIAjgDIAVgBIAPAAQAYAAANAHQAMAJAAARQAAASgQAQQgPAQgdAMIgTAGQgKADgLACIgVAFIgQABQgFAAgCgDgAgGgiQgDgDAAgEIABgEQAAgBABAAQAAgBAAAAQABgBAAAAQABgBAAAAIANgNIALgKIACgBIABgCIgGgDIgOgDIgUgDQgEgCgDgCQgCgCAAgFQAAgEADgDQACgDAFAAIAKABIANADIAQADQAMAEAGAFQAGAFAAAHQAAAEgDADQgCAFgGAFIgHAGIgHAIIgMAKIgEAEIgFABQgDAAgDgDg");
	this.shape_14.setTransform(299.675,202.1);

	this.shape_15 = new cjs.Shape();
	this.shape_15.graphics.f("#006600").s().p("AggBhQgJgKAAgSQAAgOAHgMQAIgNALgHQAMgIANAAIAIAAIAKADIgDgPIgEgVIAAgCIAAgBQAAgEADgDQADgDAEAAQAEAAADACQACACABACIAAACIACAHIADASIACANIABASIAJAIIAGAFIAFAFIADACIABAAIABABIAFAFIAJAFIAEAEQACADAAACQAAAGgDADQgDADgFAAQgCAAgFgDIgKgGIgDgEIgGgFIgKgJQgGAYgOANQgPANgTAAQgPgBgKgKgAgFAnQgGAEgEAIQgEAIAAAIQAAAJAEAFQADAFAHAAQANgBAKgLQAIgMADgUIgKgGQgFgBgFgBQgIABgGAEgAhfAiQgDgDAAgGIABgCIABgDIAFgFQALgMAKgPQAMgQAHgRIgKAAIgMABIgNAAIgFAAQgHAAgCgCQgEgDAAgFQABgEACgDQACgDAEgBIABAAIAGAAIAJAAIAaAAIAJAAIgBgRIgCgLIgBgCIAAgCQABgEADgDQACgDAGAAQAHAAADAIQACAIAAARIAAADIAAAGIAIAAIAKgBIATgBIAOgBIAMAAIgDgMIgBgJQAAgFADgDQACgDAFAAQAEABACABQACACACADIAAABIAAAGQACAPAMAOQALAOAUAJIADAEQABACAAADQAAAEgDADQgCAEgFAAQgEAAgPgKQgHgFgGgHQgHgGgFgHIgHAAIgGABIgHAAIgIAAIgUABIgOABIgQAAQgJAUgLASQgLASgOASIgEAFIgBABIgDADIgFABQgGAAgDgEg");
	this.shape_15.setTransform(275.25,202.3);

	this.shape_16 = new cjs.Shape();
	this.shape_16.graphics.f("#006600").s().p("AgcBwQgMgBgGgCQgGgCgCgEQgCgFAAgHIAAghQABgEACgDQADgCAEAAQAFAAADACQADADAAAEIAAAZQAAAFACACQACACAIACIAXAAIASAAIAOgBQAGgBACgEQACgEABgLQAAgEACgCQADgDAEAAQAGAAACADQADADAAAGQAAAOgEAHQgDAJgHACQgFACgMACIgeABIgegBgAhsBpQgDgEAAgEIABgDIADgGIAIgMIAJgRQACgFACgCQADgBADAAQAEAAADACQAEADAAAEIgCAIIgFAKIgGANQgGAKgEAEQgEADgEAAQgEAAgEgDgABgBoQgDgCgDgEIgMgUIgKgNIgCgEIgBgDQAAgEADgDQADgDAEAAIAFACQADABADADIAKANIANASQAEAHAAAEQAAAEgEADQgCACgFAAQgEAAgCgBgAAIBUQgDgCgCgEIgHgKIgEgHIgEgDIgCgEIgBgDQAAgEADgDQADgCAEAAIAEAAIAEAEIAIAKIAJAMQADAFAAADQAAADgDADQgDADgEAAQgDAAgCgBgAhiArQgDgDAAgDIAAhEQAAgJAFgFQAEgDAIAAIA/AAQAJgBAEAFQAFAEAAAJIAAA1QAAAHgDAEQgCAFgFACQgCABgFABIgMAAIgKAAIgIAAIgFgDQgBgDAAgDQAAgEACgDQADgCADAAIABAAIACAAIAIABIAHAAQAEAAACgBQABgCAAgFIAAgEIg6AAIAAAYQAAADgDACQgDADgEAAQgEAAgDgCgAhRAAIA6AAIAAgLIg6AAgAhQghQAAAAAAABQgBAAAAABQAAAAAAABQAAAAAAABIAAAEIA6AAIAAgEIgBgEIgEgBIgwAAIgEABgAAeApQgKgCgEgFQgDgEAAgKIAAgrQAAgEACgDQADgCAFAAQAEAAADACQACADAAAEIAAAMIAdgFIAagHIAEgBIACAAQAEAAADADQADACAAAFQAAACgCADQgCACgGACQgMADgPACIgiAFIAAAKQAAADACADQACACAFABIAQABIAYgBQAHgBACgEQACgCAAgIQAAgDACgCQADgDAEAAQAFAAADADQACACAAAGQAAAMgDAHQgEAHgHACIgJACIgMAAIgOAAIgIABQgPAAgJgCgAAdglQgKgCgDgFQgDgFAAgJIAAgrQAAgEACgDQADgCAFAAQAEAAADACQACADAAAEIAAAMIASgDIASgFIASgFIADAAIACgBQAEAAADADQACACAAAFQAAADgCACQgCADgFABIgSAEIgUAFIgVADIAAAJQAAAFACACQACABAGABIASABIAUgBQAGgBACgDQACgEAAgHQAAgEACgCQADgDAEAAQAFAAADADQACACAAAGQAAAIgCAGQgBAHgDADQgDACgFACIgOACIgWABQgUAAgKgBgAgGg2IgFgFIgCgCIgBgCIgYACIgbACIgXACIgOAAQgFAAgCgCQgDgCAAgFIABgFQACgCADgBIACAAIAGAAIADAAIABAAIAKgRIAIgOIAEgEIAGgCQAEAAACACQADACAAAEQAAADgEAHIgMASIACAAIAUgBIAQgBIADAAIACAAIADgBIgDgEIgEgFQgDgDAAgDQAAgEADgDQACgDAEABQADAAADABIAKAKIAQAVIADAEIABAEQAAAEgDACQgDADgDAAQgDAAgCgBg");
	this.shape_16.setTransform(251.075,201.85);

	this.shape_17 = new cjs.Shape();
	this.shape_17.graphics.f("#006600").s().p("Ag6BuQgDgCAAgEIAAhLIgQANIgRAMIgEADIgEAAQgFAAgDgDQgCgDAAgFQgBgEACgCQACgDAFgDIANgIIAPgLIAPgKIAAhpQAAgEADgCQADgDAEAAQAFAAADADQADACAAAEIAADMQAAAEgDACQgDACgFABQgFAAgCgDgAgeBsQgDgDAAgFQAAgBAAAAQAAgBAAAAQAAgBABAAQAAgBAAAAIAGgGQAXgXAMgfQANgeADglIgvAAQgEAAgDgCQgCgDAAgEQAAgFACgCQADgDAEAAIAwAAIAAg1QAAgEADgCQADgDAEAAQAFAAADADQADACAAAEIAAA1IA3AAQAEAAACADQACADABAEQgBAEgCADQgCACgEAAIg0AAQAIAlAOAfQAPAeAWAXIADAEIABAEQAAAFgDADQgDAEgFAAQgEAAgGgFQgGgGgJgMQgNgSgJgXQgKgWgFgYQgFAagJAXQgJAWgOATQgIAKgGAFQgHAGgEAAQgFgBgDgCgAhYgNIgDgDIgBgCIgBgGIgEgPIgEgOIgEgPIgBgEIgBgDQABgEACgDQADgDAFAAQADAAADACQACABABAEIADAIIAEANIADAOIADAMIABAGIABADQgBAFgCADQgDADgFAAIgFgCgABTg7IgFgGIgEgIIgEgHIgHgLIgCgEIAAgDQAAgEADgDQADgDAEAAQADAAACACIAFAFIAOAXQAEAIAAADQAAAEgDADQgDADgFAAQgDAAgCgCg");
	this.shape_17.setTransform(227.17,202.225);

	this.shape_18 = new cjs.Shape();
	this.shape_18.graphics.f("#006600").s().p("AhpBwQgCgCAAgDIAAiFQAAgIAEgEQAEgDAHAAIAKAAIgDgLIgDgLIgDgJIgQAAQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAxAAIAAgPQAAgDADgDQACgCAFAAQAEAAADACQADADAAADIAAAPIAvAAQADAAACADQACACAAAEQAAAEgCADQgCACgDAAIgRAAIgEAOIgFARIALAAQAHAAAEADQAEAEAAAIIAAB3QAAALgGAEQgEAEgPAAQgNAAgFgCQgFgCAAgGQAAgEACgDQACgCAEAAIADAAIAGAAIACABIACAAQAGAAACgCQACgBAAgFIAAhqQAAgBAAAAQAAgBgBAAQAAgBAAAAQAAAAgBgBQAAAAAAAAQgBgBAAAAQgBAAAAAAQgBAAAAAAIgcAAIAAAQIAVAAQAEAAABACQACACAAAEQAAADgCACQgBACgEAAIgVAAIAAARIAIAAQAHAAADADQADADAAAHIAAAjQAAANgNAAIggAAQgNAAAAgNIAAgjQAAgHAEgDQADgDAGAAIAIAAIAAgRIgUAAQgDAAgCgCQgCgCAAgDIACgGQACgCADAAIAUAAIAAgQIgbAAQgBAAAAAAQgBAAAAAAQgBAAAAABQgBAAAAAAQAAABAAAAQgBAAAAABQAAAAAAABQAAAAAAABIAAB/QAAADgDACQgCACgEAAQgEAAgDgCgAg9AnIgBADIAAAWIABAEIAEABIARAAIADgBIABgEIAAgWIgBgDIgDgBIgRAAIgEABgAhFg+IADAMIACAJIAdAAIADgMIADgJIACgKIgtAAIADAKgABkBwIgGgGQgJgJgHgJQgHgKgHgMIgPAWQgIALgIAHIgGAGIgFABQgFAAgDgDQgDgDAAgEIABgFIAGgGQALgMAJgLQAIgLAHgOIgKgZIgJgcQgEAJgDAEQgDAEgEAAQgEAAgDgDQgDgCAAgDIAAgDIACgGQAJgWAGgYQAGgYACgYQABgFACgCQADgDAEAAQAFAAACADQADACAAAEIgBALIgDARIA2AAQAEAAACACQACADAAAEQAAAFgCACQgCADgEAAIgHAAQgBATgEATIgIAiQgFARgGANQAGALAKANQAKANALALIAEAFIABAFQgBAEgCADQgDADgFAAIgFgBgAAug0IAAACIgBADIgBADIgBAEQADARAFAQIALAdQAHgTAEgUQAFgUACgUIggAAg");
	this.shape_18.setTransform(203.225,202.075);

	this.shape_19 = new cjs.Shape();
	this.shape_19.graphics.f("#006600").s().p("AhhBxQgEAAgEgDQgDgDAAgFIABgEIAEgGIALgOIAKgSQABgDADgBIAFgCQAFAAADADQADADAAAFIgCAIIgHAMIgJAOQgGAIgEAEQgDACgDAAIgBAAgAgdBwQAAgBgBAAQAAAAgBgBQAAAAgBgBQAAAAAAgBIgBgCIgBgEIgCgRIgEgSIAAgCIAAgBQAAgEADgDQADgDAFAAQAEAAADADQACACACAGIADAOIADAPIABAKQAAAEgDADQgDACgGAAQgDAAgDgBgABbBvQgCgCgDgFIgLgUIgLgQIgCgEIAAgDQAAgEADgDQAEgDAEAAQADAAADACQADACAFAGIALARIAJAPQACAGAAADQAAAEgDADQgEADgFAAQgDAAgDgBgAAdBuQgDgCgBgFIgGgQIgEgKIgDgIIgBgDIAAgDQAAgEADgDQADgCAFgBQAEAAACADQADACADAIIAHAPIAEANIACAIQAAAEgDADQgEADgFAAQgEAAgCgCgAhjAtQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAXAAIAAgoIgcAAQgDAAgDgCQgCgDAAgEQAAgEACgCQACgDAEAAIAcAAIAAgfQgIALgFAEQgFAEgDAAQgFAAgCgDQgDgDAAgEQAAAAAAgBQAAgBAAAAQAAgBAAAAQAAgBABAAIAFgHQAKgKAIgLQAIgKAGgLQABgDADgCQACgBADAAQAEAAADACQADADAAAEQAAACgBADIgGAKICaAAQAEAAACADQACACABAEQAAAFgDACQgCACgEAAIgQAAIAAAnIAYAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAIgYAAIAAAoIATAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAgAAiAbIAcAAIAAgoIgcAAgAgLAbIAbAAIAAgoIgbAAgAg5AbIAcAAIAAgoIgcAAgAAigfIAcAAIAAgnIgcAAgAgLgfIAbAAIAAgnIgbAAgAg5gfIAcAAIAAgnIgcAAg");
	this.shape_19.setTransform(179.075,202.0286);

	this.shape_20 = new cjs.Shape();
	this.shape_20.graphics.f("#006600").s().p("Ag1BhQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgWAjQgCgDgBgEIABgCIACgFIAFgLIAKgUIAQgiIAOgbIAMgXIAFgGQADgCAEAAQAFAAAEAEQAEADAAAFIAAADIgCAEIgEAHIgKARIgOAaIgRAfIgRAgQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_20.setTransform(346.875,159.725);

	this.shape_21 = new cjs.Shape();
	this.shape_21.graphics.f("#006600").s().p("Ag+BXQgMgHgGgOIgEgNIgBgRIgBgSIgBgZIAAgcIAAgXIgBgMIgBgJIAAgBIAAgBQAAgGADgCQADgDAGAAQAGAAAEAGQADAGAAANIAAADIAAAFIgBAMIAAAQIABArIABAbQABAKADAFQACAFADADQAFAEAGADQAHACAJAAIAMgBIANgDIACAAIAAgBQAEABADADQADADAAAGQAAAEgCADQgCADgFABIgHACIgLABIgLAAQgVAAgNgGgABIAqQgDgCgBgDIgBgCIAAgDIAAgHIgBgZIgCgbIgDgYIgEgTIgBgDIAAgCQAAgEADgDQADgDAFAAQAEAAADABIAEAFIABAGIADALIAEAcIADAfIABAcQAAALgCAEQgDAEgGAAQgEAAgDgCg");
	this.shape_21.setTransform(323.2042,160.025);

	this.shape_22 = new cjs.Shape();
	this.shape_22.graphics.f("#006600").s().p("AgHBpQgDgDAAgEIAAgxIheAAQgDAAgCgDQgDgCAAgFQAAgEADgDQACgDADAAIBeAAIAAgbIg5AAQgKAAgFgEQgFgGAAgJIAAhGQAAgJAFgFQAFgFAKAAICGAAQAKAAAFAFQAFAFAAAJIAABGQAAAJgFAGQgFAEgKAAIg5AAIAAAbIBeAAQAEAAACADQACACAAAFQAAAFgCACQgCADgEAAIheAAIAAAxQgBAEgCADQgDACgEAAQgEAAgDgCgAhCgWQAAABABABQAAAAAAABQAAAAAAABQABAAAAABQAAAAABAAQAAABABAAQAAAAABAAQABAAAAAAIB3AAQABAAABAAQABAAAAAAQABAAAAgBQABAAAAAAQAAgBABAAQAAgBAAAAQAAgBAAAAQAAgBAAgBIAAgWIiDAAgAhAhWIgCAEIAAAVICDAAIAAgVQAAAAAAgBQAAgBAAAAQAAgBAAAAQgBgBAAAAQAAgBgBAAQAAAAgBAAQAAgBgBAAQgBAAgBAAIh3AAQgBAAAAAAQgBAAAAABQgBAAAAAAQgBAAAAABg");
	this.shape_22.setTransform(299.1,160.375);

	this.shape_23 = new cjs.Shape();
	this.shape_23.graphics.f("#006600").s().p("AgcBqQgJgFgJgJIgGgGIgBgGQAAgFADgDQADgEAFAAIAEABIAFAFIALAKQAGAEAEAAQACAAADgCQACgDABgEQACgGABgLIABgYIABgbIAAgLIgBgNIAAgJIgBgCIgBgBIgCAAIgCABIgHAAIgMABIgLAAIgFAeQgCANgEAKQgDALgFAIQgHANgJAMQgJANgMALIgFAFIgFABQgFAAgEgDQgDgEAAgFQAAgDACgDIAHgIQAJgHAIgLQAIgKAGgLQAHgLACgJIAFgSIADgXIgGAAIgRABIgJAAIgEAAIgBAAQgGAAgDgDQgDgCAAgFQAAgGADgDQADgDAGAAIAYABIAHAAIAIgBIABgUIABgWQAAgHADgDQADgDAFAAQAFAAADADQADACAAAFIgBAJIgBAQIgBAUIAMgBIAJAAIALgBIADgBIADAAQAGAAAEADQAEACABAFIACAMIABASIABAWQAAAWgCATQgCASgDAMQgEALgHAGQgFAGgKAAQgJAAgJgEgABPAjIgKgLQgJgLgIgNIgQgXIgKgUQgEgJAAgEQAAgEACgDQADgDAFAAIAFABIAEAEIABABIACAGIANAYIARAZIASAWIADAEIABAFQAAAFgDADQgDADgFAAIgBAAQgDAAgCgCgABOghIgGgGIgLgOIgPgVQgFgHAAgCQABgDACgDQACgCAEAAIAEABIAEAFIAFAIIAJALIAJAMIAHAJIACACIAAADQAAADgCADQgDADgDAAIgEgCgABngzIgGgGIgLgOIgQgVQgEgHAAgCQAAgDADgDQACgCAEAAIAEABIADAFIAGAHIAIAMIAJAMIAIAJIACACIAAADQAAADgDADQgCADgDAAIgBAAIgDgCg");
	this.shape_23.setTransform(275.375,159.225);

	this.shape_24 = new cjs.Shape();
	this.shape_24.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_24.setTransform(250.975,160.025);

	this.shape_25 = new cjs.Shape();
	this.shape_25.graphics.f("#006600").s().p("AguBcQgNgHAAgQQAAgQARgNQARgNAfgHIgPgKIgTgMIgGgFQgBgDAAgEQAAgDACgEQADgEAEgEIAYgUIAngdIgBAAIgXABIgZABIgZAAIgUABQgJAAgDgCQgEgDABgGQgBgFADgDQADgCAGAAIACAAIAFAAIAGABIAIAAIAvgBIArgDIADAAIABAAQAHAAAFAEQAFACAAAGIgBAEIgDAFIgCACIgGADIgRAOIgVARIgTAQIgNALIAPALQAIAFAOAGQARAKALAHQAKAIAFAGQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAFgIAIQgIAHAAAGQAAAGAGADQAGACAPAAQAQAAANgEQANgDAIgGQAIgHAAgIQAAgEgFgEQgEgEgKgHQgVAFgOAFg");
	this.shape_25.setTransform(226.6237,160.3);

	this.shape_26 = new cjs.Shape();
	this.shape_26.graphics.f("#006600").s().p("AAKBnQgJgBgBgEQgDgEAAgJIAAgZIAAgRIABgOIgcAZIgYAWIgMALIgMALIgFAEIgFABQgEgBgEgDQgDgEAAgFIABgEIADgEIACgDIAKgHIAggbIAkgfIAggdIAYgXIgLABIgPABIgKABIgTAAIgVABIgTABIgJAAQgFAAgDgCQgDgDABgFQAAgEACgDQABgDADgBIAEgBIAJAAIALAAIAaAAIALAAIgCgTIgCgRIAAgCIAAgBQAAgEADgDQADgCAEAAQAFAAACACQACACABAFIABAJIABAPIABAOIAPgBIAPAAIALgBIAGgDIAEgBQAEABAEADQAEAEAAAEIgCAFIgDAFIgNANIgRAQIgWATIgBAcIAAAPIAAAIIAAAGIAAAGIAAAFIAAABQAAAAAAABQAAABAAAAQABABAAAAQAAABAAAAQACABAEABIANAAQARAAAIgBQAIgBACgEQADgEABgIQACgFACgCQADgDAEAAQAFAAAEADQADAEAAAFIgBAHIgCAJQgEAIgFAFQgHAFgMACQgNABgUAAIgagBg");
	this.shape_26.setTransform(202.8,159.575);

	this.shape_27 = new cjs.Shape();
	this.shape_27.graphics.f("#006600").s().p("AABBwQgIAAgFgFQgEgFAAgIIAAg4QAAgJAEgFQAFgDAIAAIBUAAQAJAAAEADQAFAFAAAJIAAA4QAAAIgFAFQgEAFgJAAgAACBaQAAABAAAAQAAABABAAQAAABAAAAQAAAAABABQAAAAAAAAQABAAAAABQABAAAAAAQABAAABAAIBGAAQAAAAABAAQABAAAAAAQABgBAAAAQABAAAAAAQAAgBAAAAQABAAAAgBQAAgBAAAAQAAgBAAgBIAAgQIhRAAgAADAmIgBAEIAAAPIBRAAIAAgPIgBgEQAAAAgBgBQAAAAgBAAQAAAAgBAAQgBgBAAAAIhHAAQAAAAgBABQAAAAgBAAQAAAAgBAAQAAABgBAAgAhsBYQgDgEAAgFQAAgCACgCQABgDADgCIACAAIAFgBIAEgBIAGgBIAKgEIAAheIgWAAQgDAAgDgDQgCgDAAgEQAAgEACgDQACgDAEAAIAWAAIAAgtQAAgEADgCQADgDAEAAQAFAAADADQADACAAAEIAAAtIATAAQAEAAACADQACADAAAEQAAAEgCADQgCADgEAAIgTAAIAABYIAGgDIAFgCIAGgCIAEAAQAEAAADADQADADAAAEQAAADgBACQgCACgFACIgQAHIgWAHIgSAFIgLACQgEAAgDgCgAgHAHQgJAAgFgEQgEgEAAgJIAAg1QAAgIAEgFQAFgEAJAAIAOAAIgDgGIgEgIIgBgEIgBgDQAAgEACgDQADgCAFAAQADAAADACQACACAEAGIAIAUIAcAAIAGgNIAFgLQABgEACgBQACgCADABQAFgBADADQADADABAEIgDAIIgHANIARAAQAJAAAEAFQAFADAAAJIAAA1QAAAJgFAEQgEAEgJAAgAAzgIIAjAAQAEAAABgBQABAAAAgBQAAAAAAgBQABAAAAgBQAAgBAAAAIAAgQIgqAAgAgGgNQAAAAAAABQAAABAAAAQAAABABAAQAAABAAAAQACABADAAIAgAAIAAgVIgmAAgAAzgtIAqAAIAAgNQAAgBAAgBQAAgBgBAAQAAgBAAAAQAAgBgBAAQAAAAgBgBQAAAAgBAAQAAAAgBAAQgBAAAAgBIgkAAgAgFg/QAAAAAAABQgBAAAAABQAAAAAAABQAAABAAABIAAANIAmAAIAAgUIggAAQgDABgCABg");
	this.shape_27.setTransform(178.725,159.55);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_27},{t:this.shape_26},{t:this.shape_25},{t:this.shape_24},{t:this.shape_23},{t:this.shape_22},{t:this.shape_21},{t:this.shape_20},{t:this.shape_19},{t:this.shape_18},{t:this.shape_17},{t:this.shape_16},{t:this.shape_15},{t:this.shape_14},{t:this.shape_13},{t:this.shape_12},{t:this.shape_11},{t:this.shape_10},{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape},{t:this.instance}]}).wait(28));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(39.9,25.7,609.7,282.5);


(lib.exp_text_3 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Text_new_enemy("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(344.65,57.15,1,1,0,0,0,312.9,65.4);

	this.shape = new cjs.Shape();
	this.shape.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape.setTransform(358.575,244.375);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_1.setTransform(342.475,244.375);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#006600").s().p("AgZAMIgVAAIgWAAIgQAAIgJgBQgEgBgCgDQgCgDAAgEQAAgFADgDQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAADgCADQgDADgEABIgJABIgWAAIgdABIgfAAIgbAAg");
	this.shape_2.setTransform(322.875,243.8);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#006600").s().p("AhqBmQgEgDAAgGIABgFIAEgEQAIgHAIgKQAIgLAHgOQAHgMAFgPQAEgKADgOIAEgeIABghIAAgEIAAgFIgCgDIgBgBIAAgDQAAgEADgDQAEgEAFAAIAFABIAEAFQACACABAFQACAEAAAHQAAASgCASQgCASgDARQgDAPgEALQgEANgIAPQgHAOgJAOQgIAMgIAIIgHAGIgFABQgGAAgDgDgABFBlQgEgDgHgJQgJgKgIgMQgIgNgGgNQgGgNgEgMIgGgcQgDgQgCgSQgCgRAAgOQAAgMAEgGQAEgGAHAAQAEAAADACQADADAAAFIAAADIgCAEIgBADIAAAEIAAAGQAAAPACARQACARADAPQAEAPAEALIAMAXIAPAWQAIALAIAGIAEAFIABAFQAAAFgEAEQgDAEgFAAIgBAAQgDAAgEgDgABGggIgGgHIgKgQIgLgTQgEgHAAgCQAAgDADgDQACgCAEAAQABAAAAAAQABAAABAAQAAABABAAQAAAAABAAIADAGIAIANIAJAPIAIALIABAEIABADQAAADgDACQgCACgDABQgBAAAAgBQgBAAgBAAQAAAAgBAAQAAgBgBAAgABggwIgLgQIgNgWQgFgIAAgDQAAgDADgCQACgCAEAAIAEABIAEAFIAEAHIAGALIAIAMIAGAKIACACIABADQAAAEgDACQgCACgEAAIAAAAQgDAAgDgDg");
	this.shape_3.setTransform(299.475,244.6);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#006600").s().p("AgZAMIgVAAIgWAAIgQAAIgJgBQgEgBgCgDQgCgDAAgEQAAgFADgDQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAADgCADQgDADgEABIgJABIgWAAIgdABIgfAAIgbAAg");
	this.shape_4.setTransform(274.875,243.8);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#006600").s().p("AAMBoQgDgCAAgEIgBgTIgBgeIAAgkQgTAWgTASQgTASgRANIgOAJQgEACgDABQgEgBgDgDQgDgDgBgEQAAgDACgDIADgEIABgBIAHgEQARgLAQgOQAQgOAQgQQAQgQAMgQIAAgSIgFAAIg4ABIgcAAQgFAAgDgCQgDgDAAgFIACgHQACgCACgBIACgBIAEAAIALAAIAGAAIAJAAIAQAAIAYAAIAWAAIAAgnQAAgFADgDQADgDAFAAQAFAAACADQAEACAAAGIAAAcIAAADIAAACIAAAGIAWgBIAPAAIAIAAIAKgBIAGAAQAEAAADACQACADABAFQgBAEgCADQgCADgDAAIgOAAIgRABIgSAAIgOABIAAAbIAAASIAAARIABASIAAAYIABAXQgBAHgCAEQgDADgFAAQgFAAgDgCg");
	this.shape_5.setTransform(251.1,244.5);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#006600").s().p("ABUBjIgIgJIgPgTQgKAIgLAFQgMAFgPACQgKACgOABIggACIglABQgLAAgGgDQgFgDAAgGQAAgFADgDQACgDAFgBQAWgiAUgoQATgpARgxQABgEADgDQACgCAFAAQAEAAADADQADADAAAFIgEANIgHAXIgMAeIgNAcIgTAlQgIARgLAQIAHAAIAEAAIAEAAIAagBIAYgCIASgDQAKgCAIgEQAIgEAHgFIgQgXIgHgMIgCgGQAAgGADgDQADgDAFgBQAEAAACACQADACADAHIAMASIAOAUIAPASIALAOIADADIABAEQAAAFgEAEQgDAEgFAAQgDAAgEgCg");
	this.shape_6.setTransform(227.325,244.575);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#006600").s().p("AgZAMIgVAAIgWAAIgQAAIgJgBQgEgBgCgDQgCgDAAgEQAAgFADgDQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAADgCADQgDADgEABIgJABIgWAAIgdABIgfAAIgbAAg");
	this.shape_7.setTransform(202.875,243.8);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.f("#006600").s().p("Ag5BnQgEgFAAgEIABgGQABgDADgBIABgBIAEgCQAPgIAJgHQAKgIAFgGQAFgIACgKQACgJAAgMIAAgrIgWABIgTAAIgHAAIgJAAQgFAKgHAJQgHAJgJAGIgGAEQAAAAgBABQAAAAgBAAQAAAAgBAAQgBAAAAAAQgGAAgCgDQgDgDAAgFIAAgEIAEgEQAJgGAGgJQAHgIADgIIAEgNIACgPIABgRIgBgLQAAgFADgCQADgDAFAAQAEAAADADQADABABAEIAAANIgBARIgCARIAOAAIAJAAIAqAAIAogCIgIgPIgCgHQAAgEACgCQADgDADABQABgBABAAQAAAAABABQAAAAABAAQAAAAABABIADAFIAJAPIAJAQIAIAMIABADIAAADQAAADgCACQgDACgDABQgDAAgDgDQgDgDgDgHIgMABIgMABIgNAAIgJABIAAArQAAAQgCANQgDAMgGAJQgEAGgHAJQgJAHgLAIIgQAKQgGADgDAAQgEAAgDgDgABhgqIgGgHIgKgRIgJgQIgFgJIgBgEQAAgDADgDQACgCAEAAIAEABIAEAFIAGAMIAKAQIAJAPIACADIAAADQAAADgCACQgDADgDAAQgBAAAAAAQgBAAgBAAQAAgBgBAAQAAAAgBgBg");
	this.shape_8.setTransform(179.825,244.5);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.f("#006600").s().p("AgQBjQgQAAgKgCQgJgBgFgCQgJgEgFgHQgFgGAAgIQAAgHAEgIQADgHAHgGIAcgZIAegYIgfgWIgbgXIgTgRIgHgJQgCgEAAgEQAAgFADgDQADgDAFgBQAEABACABIAEAEQAEAIAKAKQAKAJAQANIAoAgIANgLIALgIIALgIIADgDIAEgDIAHgGIAFgGIADgDIAFgBQAFAAADADQAEADAAAFQAAAFgFAHQgFAGgMAHIgcAVIgfAXIgbAXIgUAUIgHAHQgCADAAADQAAAEADACQADADAHABIAVACIAiAAIAZAAIAQgBIAJgCIAFgCIAEgCIADAAQAFAAADADQADADAAAFQAAAEgCADQgCACgDACQgFADgHABIgSACIgeAAIgnAAg");
	this.shape_9.setTransform(370.375,202.1);

	this.shape_10 = new cjs.Shape();
	this.shape_10.graphics.f("#006600").s().p("AguBcQgNgIAAgOQAAgQARgNQARgNAfgJIgPgJIgTgMIgGgGQgBgCAAgDQAAgEACgEQADgEAEgEIAYgTIAngeIgBgBIgXABIgZACIgZABIgUAAQgJAAgDgDQgEgCABgFQgBgGADgCQADgDAGAAIACAAIAFAAIAGAAIAIAAIAvgBIArgCIADAAIABAAQAHAAAFADQAFAEAAAEIgBAGIgDAEIgCACIgGAEIgRAOIgVAQIgTAPIgNAMIAPAMQAIAEAOAGQARAKALAIQAKAGAFAHQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAGgIAGQgIAHAAAIQAAAFAGADQAGACAPAAQAQAAANgDQANgEAIgHQAIgGAAgHQAAgEgFgFQgEgFgKgFQgVAEgOAFg");
	this.shape_10.setTransform(346.6237,202.65);

	this.shape_11 = new cjs.Shape();
	this.shape_11.graphics.f("#006600").s().p("AhpBmQgDgDAAgGIAAgEIAEgEIAHgFQAcgUASgYQASgYAKgcQAKgeACglIg6AAQgEAAgCgDQgDgDgBgFQABgFADgDQACgCAEAAIA/AAQAJAAAFADQAEAFAAAKQAAAwAXAoQAWApAtAkIAFAGQACACAAADQAAAFgDAEQgEADgFABIgHgBIgHgGQgLgIgLgMQgMgMgJgOQgLgOgHgOQgHgMgGgNQgEgNgEgPQgFAdgLAXQgLAWgRAVQgKALgKAKIgTAPQgIAFgGAAQgEAAgFgDg");
	this.shape_11.setTransform(323.25,202.5);

	this.shape_12 = new cjs.Shape();
	this.shape_12.graphics.f("#006600").s().p("AhXBmQgDgCgBgEIAAgLIgBgWIAAgZIAAgXIAAghIABgiIAAgcIABgPQABgEADgCQADgDAEAAQAFAAADADQACADAAAFIAAAFIAAAHIgCAgIAAAvIAAAmIABAhIABAXIAAACIAAABQAAAEgDADQgDADgFAAQgEAAgDgDgAAKBcQgKgFgJgKQgGgGgDgGQgEgHAAgFQAAgFADgDQADgDAFAAIAFABIADADIABABIACAEQADALAJAHQAJAGALAAQAOAAAKgHQALgHADgNQABgDADgCQADgCADAAQAFAAADADQADADAAAEIgBAJIgFAJQgIANgOAHQgNAHgRABQgMAAgLgFgAA4gHQgEgDAAgFQAAAAAAgBQAAgBABAAQAAgBAAAAQAAgBABAAIAEgFQAHgGADgHQAEgHAAgHQAAgLgLgGQgKgFgSgBQgLAAgJADQgKACgKAEIgEACIgDAAQgEAAgDgDQgDgDAAgFQAAgEADgDQAEgDAIgDQAHgDAKgCQALgBAOAAQASAAAOAFQANAFAIAKQAHAKAAANQAAAMgFALQgGALgJAIIgFADIgFABQgEAAgDgDg");
	this.shape_12.setTransform(298.975,202.075);

	this.shape_13 = new cjs.Shape();
	this.shape_13.graphics.f("#006600").s().p("AhcBgQgDgEAAgFIABgEIACgDIABgBIAGgEQASgLARgMQARgNANgOQAOgNAJgNQAKgMAHgNIANgZQAGgMADgLIgXACIgaAAIgcABIgXAAQgGAAgDgCQgDgDABgFQgBgEACgDQACgDADgBIACAAIAEAAIAKAAIAkAAIAggBIAbgBIAFgDIAFgBQAFAAADADQAEAEAAAGIgCAHIgDAKIgJASQgKAVgKARQgLARgMAPIAeAUIAZARIAXARQAFAFAAAGQAAAFgDAEQgEADgFABIgEgBIgEgDIgSgPIgbgUIgggXIgZAYIgYAUIgVAOQgJAFgEAAQgFAAgDgDg");
	this.shape_13.setTransform(275.05,202.575);

	this.shape_14 = new cjs.Shape();
	this.shape_14.graphics.f("#006600").s().p("AARBcIgEgDIgHgIIgSgUIgVgWIgUgSIgEgEIgBgFQABgFAEgDQADgEAGAAIAEACIAJAHIAUATIAFAFQAUgMARgQQAQgPAMgSQALgSAFgTIgfAAIgTAAIgNABIgPAAIg1AAIgPAAIgJABIgLgBIgGgCIgBgEIgBgEQAAgEACgEQACgDAEAAIABAAIADAAIAJAAIAOAAIAvgBIAiAAIAZAAIAUAAIARAAIAFgEIAFgBQAFAAAEADQACAEABAGIgCALIgFAPQgGARgJAQQgLARgMAMQgKAKgLAKQgMAJgPAJIARARQAFAGABADQACADAAACQAAAGgEADQgDAEgGAAIgDAAg");
	this.shape_14.setTransform(250.95,202.625);

	this.shape_15 = new cjs.Shape();
	this.shape_15.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_15.setTransform(226.975,202.375);

	this.shape_16 = new cjs.Shape();
	this.shape_16.graphics.f("#006600").s().p("AgNBkQgDgDAAgEIAAitIhRAAQgEAAgDgDQgCgDAAgFQAAgEACgDQADgDAEAAIDDAAQAEAAADADQACADAAAFQAAAFgCACQgDADgEAAIhdAAIAAAaIAcAPIAcARIAVAOIALAHIAEAEIABAFQAAAFgDAEQgEAEgFAAIgDAAIgEgCIgHgGIgXgPIgXgQIgVgNIAAB8QAAAEgDADQgCACgFAAQgFAAgDgCg");
	this.shape_16.setTransform(203.075,202.925);

	this.shape_17 = new cjs.Shape();
	this.shape_17.graphics.f("#006600").s().p("AhiBnQgEAAgDgDQgCgDAAgFQAAgFACgCQADgDAEAAIBRAAIAAivQAAgEADgDQADgCAFAAQAFAAADACQADAEAAADIAAA5IBSAAQAEABACADQADADAAAEQAAAFgDACQgCAEgEAAIhSAAIAABgIBeAAQAEAAADADQACACAAAFQAAAFgCADQgDADgEAAg");
	this.shape_17.setTransform(179.075,201.6);

	this.shape_18 = new cjs.Shape();
	this.shape_18.graphics.f("#006600").s().p("AAkBrIgSgDIgSgFIgSgFQgQgEgMgGQgNgFgHgGQgFgDgCgFQgCgFAAgHQAAgIAEgGQAEgGAGAAQAFAAADADQADADAAAFIAAACIgBACIgBADIAAACQAAACADADIAKAGQAJAEAOAEIAeAIQARAEAQABQAGABADADQADADAAAFQAAAFgDADQgDADgFAAIgMgBgAAMAuQgDgEAAgFIAAgDIADgDQAFgFADgEQACgEAAgDIgBgFIgCgHIgSABIgbAAIgdABIgSABIgLAAIgDAAIgBAAQgHAAgDgCQgDgDAAgEQAAgEABgCQACgCADgBIACgBIAEAAIAWAAIAZgBIAjgBIASAAIgGgOIgFgSIgMAAIguABIgYABIgCAAIgCAAQgFAAgDgCQgDgDAAgFQAAgFADgCQACgDAGAAIARAAIAUAAIAcgBIAPAAIgCgGIgCgHIgBgCIAAgBIgBgHIgBgGQAAgFADgDQADgEAGAAQAEAAADAEQADADAAAFIACANIAEAPIAhgBIAogDIABAAIACAAQAFAAACADQADACAAAFQAAAFgCACQgDADgEAAIgSABIgqACIgLAAIAHATIAFANIAbgBIAfgCIABAAIABAAQAEAAACADQADADAAAFQAAAEgCACQgDACgEAAIgIAAIgOABIgPABIgOAAIACAIIABAHQAAAGgEAHQgEAHgFAGQgDADgDACIgGABQgEAAgEgDg");
	this.shape_18.setTransform(394.975,159.975);

	this.shape_19 = new cjs.Shape();
	this.shape_19.graphics.f("#006600").s().p("AgQBjQgQAAgKgCQgJgBgFgCQgJgEgFgGQgFgHAAgJQAAgGAEgHQADgIAHgGIAcgZIAegYIgfgXIgbgVIgTgRIgHgJQgCgFAAgDQAAgGADgDQADgEAFAAQAEAAACACIAEAEQAEAIAKAJQAKALAQANIAoAeIANgKIALgIIALgIIADgDIAEgDIAHgGIAFgHIADgCIAFgBQAFAAADADQAEAEAAAFQAAAFgFAFQgFAHgMAIIgcAUIgfAXIgbAXIgUATIgHAIQgCADAAADQAAAEADACQADACAHACIAVABIAiABIAZAAIAQgBIAJgBIAFgDIAEgCIADAAQAFAAADADQADADAAAFQAAADgCADQgCAEgDACQgFACgHABIgSACIgeABIgngBg");
	this.shape_19.setTransform(370.375,159.75);

	this.shape_20 = new cjs.Shape();
	this.shape_20.graphics.f("#006600").s().p("Ag+BXQgMgHgGgOIgEgNIgBgRIgBgSIgBgZIAAgcIAAgXIgBgMIgBgJIAAgBIAAgBQAAgGADgCQADgDAGAAQAGAAAEAGQADAGAAANIAAADIAAAFIgBAMIAAAQIABArIABAbQABAKADAFQACAFADADQAFAEAGADQAHACAJAAIAMgBIANgDIACAAIAAgBQAEABADADQADADAAAGQAAAEgCADQgCADgFABIgHACIgLABIgLAAQgVAAgNgGgABIAqQgDgCgBgDIgBgCIAAgDIAAgHIgBgZIgCgbIgDgYIgEgTIgBgDIAAgCQAAgEADgDQADgDAFAAQAEAAADABIAEAFIABAGIADALIAEAcIADAfIABAcQAAALgCAEQgDAEgGAAQgEAAgDgCg");
	this.shape_20.setTransform(347.2042,160.025);

	this.shape_21 = new cjs.Shape();
	this.shape_21.graphics.f("#006600").s().p("AgfBhQgKgLAAgRQAAgOAHgNQAIgLALgJQAMgHAMgBIAJABIAJAEIgCgRIgDgUIgBgCIAAgBQAAgFADgCQADgDAFAAQACAAADACQADACACADIAAABIABAHIADASIACANIACASIAIAHIAGAHIAFADIACADIABABIABABIAGADIAJAGIAEAEQACADAAADQgBAFgCADQgDADgFAAQgCAAgEgCIgLgIIgEgDIgFgFIgKgJQgGAXgPANQgOAOgTAAQgPAAgJgLgAgEAnQgHAEgFAIQgDAHAAAJQAAAJADAFQAEAFAIAAQAMAAAJgMQAKgMABgUIgKgGQgEgBgFAAQgIgBgFAFgAheAjQgEgEAAgFIAAgEIACgCIAFgFQALgMAKgPQALgQAIgRIgKABIgMAAIgMABIgGAAQgHgBgCgCQgDgDAAgFQAAgDACgDQADgEADgBIACAAIAEAAIAKAAIAZAAIAKAAIgBgRIgCgMIAAgBIAAgBQAAgFACgDQAEgDAEAAQAIAAACAIQADAIAAAQIAAAFIAAAEIAIAAIAKAAIATgBIAOgBIANAAIgEgLIgCgKQAAgEADgDQAEgDAEAAQADAAADABQADABAAADIABACIAAAGQACAPAMAOQAMAOASAKIAEADQABACABADQgBAEgDAEQgDADgDAAQgFAAgOgKQgJgGgGgFQgGgHgFgIIgHABIgHAAIgFAAIgJABIgUABIgOAAIgQABQgJATgLAUQgLARgOATIgDADIgCACIgEADIgEABQgFAAgDgDg");
	this.shape_21.setTransform(323.25,159.95);

	this.shape_22 = new cjs.Shape();
	this.shape_22.graphics.f("#006600").s().p("AAABWIgDgCIgCgCIgCgHIgJgXIgNgcIgNgcIgFADIgHADIgEACIgIADIgIACQgFAAgCgDQgDgCAAgEQAAgEACgCQADgCAEgBIAEgBIAHgDIAGgDIAIgDIgGgNIgLgVIgHgMIgCgFIAAgDQAAgEADgCQADgDAEAAIAEABQABABAAAAQABAAAAABQAAAAABABQAAAAAAABIABAAIACAEIAFAKIAJAUIAEAGIAEAKIAFgDIAHgDIANgGIAFgDIAFgCIAAgGIgBgLIAAgKIAAgFIAAgBIAAgBQAAgDABgDQADgCAEAAQADAAADACQACABABADIAAAFIABAIIAAAJIABAFIATgHQAIgCAGAAQAQAAAIAKQAJAJAAATQAAAMgGAMQgGALgMAKIgLAIIgLAFIgIACQgEAAgCgCQgDgDAAgEIABgEIACgDIACgBIAHgDQAJgEAHgGQAHgGAEgIQAEgIAAgIQAAgKgEgFQgDgFgIAAQgFAAgHACIgSAIIAAAMIABAMIAAAJIAAAEIgBACQgBADgCABQgCACgDAAQgFAAgCgDQgCgCAAgFIgBgMIAAgOIgGACIgGAEIgKAFIgGADIATAoIALAaIAGAOIADAGIAAADQAAAEgDADQgDACgEAAIgDgBg");
	this.shape_22.setTransform(299.225,162.225);

	this.shape_23 = new cjs.Shape();
	this.shape_23.graphics.f("#006600").s().p("AgxBjQgNgGgHgMIgEgKIgBgMIgBgUIABgbIABgeIABgdIABgXIABgFIAAgCIAAgHIgCgHIAAgBIAAgBQAAgFADgDQADgDAGAAQAGAAAEAFQAEAHAAAKIAAADIgBAEIAAAJIgDAiIgBAiIgBAfIABATIABAMIADAHQAEAHAHACQAIAEALAAQAOAAAKgFQALgEAJgIIAJgMIAJgPIAIgQQACgEACgBQADgDADAAQAFAAAEAFQADADABAFIgEAMIgJARQgFAJgGAIQgMAPgRAHQgSAJgWgBQgTAAgNgGgAAUgFIgGgHIgLgOIgOgVQgFgHAAgCQABgDACgCQADgDADAAQABAAAAAAQABAAAAAAQABAAAAAAQAAABABAAIADAFIAFAIIAJALIAJALIAHAJIACADIAAADQAAADgCADQgDACgDABIgEgBgAAzgaIgGgGIgLgPQgLgOgEgGQgFgHAAgCQABgEACgCQADgCADgBIAEABIAEAGIAFAHIAJAMIAJALIAHAJIACADIAAADQAAADgCACQgDAEgDAAIgBAAIgDgCg");
	this.shape_23.setTransform(276.275,159.75);

	this.shape_24 = new cjs.Shape();
	this.shape_24.graphics.f("#006600").s().p("AgcBwQgMAAgGgDQgGgCgCgFQgCgEAAgGIAAgjQABgDACgDQADgCAEgBQAFABADACQADADAAADIAAAaQAAAFACADQACABAIABIAXABIASgBIAOAAQAGgBACgEQACgEABgLQAAgEACgDQADgCAEAAQAGAAACADQADADAAAFQAAAOgEAJQgDAIgHADQgFABgMABIgeABIgeAAgAhsBpQgDgDAAgEIABgFIADgEIAIgOIAJgRQACgEACgBQADgDADAAQAEAAADAEQAEADAAADIgCAHIgFALIgGANQgGAKgEADQgEAEgEAAQgEAAgEgDgABgBoQgDgCgDgEIgMgUIgKgNIgCgDIgBgFQAAgDADgDQADgCAEgBIAFABQADABADAFIAKALIANATQAEAHAAADQAAAFgEACQgCADgFAAQgEAAgCgBgAAIBTQgDgBgCgEIgHgLIgEgFIgEgFIgCgDIgBgEQAAgDADgCQADgDAEgBIAEABIAEAFIAIAJIAJAMQADAFAAADQAAAEgDADQgDACgEAAQgDAAgCgCgAhiArQgDgCAAgEIAAhFQAAgIAFgEQAEgFAIAAIA/AAQAJABAEAEQAFAEAAAIIAAA2QAAAHgDAEQgCAGgFABQgCACgFAAIgMAAIgKAAIgIgBIgFgDQgBgCAAgEQAAgEACgCQADgCADgBIABAAIACABIAIAAIAHABQAEAAACgCQABgBAAgEIAAgFIg6AAIAAAYQAAAEgDABQgDADgEAAQgEAAgDgCgAhRAAIA6AAIAAgLIg6AAgAhQghQAAAAAAABQgBAAAAABQAAAAAAABQAAAAAAAAIAAAGIA6AAIAAgGIgBgDIgEgBIgwAAIgEABgAAeApQgKgBgEgFQgDgGAAgJIAAgrQAAgEACgDQADgCAFgBQAEABADACQACADAAAEIAAAMIAdgFIAagHIAEgBIACAAQAEAAADACQADADAAAEQAAADgCADQgCACgGABQgMAEgPACIgiAEIAAAKQAAAEACADQACACAFABIAQAAIAYgBQAHgBACgCQACgEAAgGQAAgFACgCQADgCAEAAQAFAAADACQACAEAAAEQAAANgDAHQgEAHgHACIgJABIgMABIgOAAIgIABQgPAAgJgCgAAdgmQgKgBgDgFQgDgFAAgJIAAgsQAAgEACgCQADgCAFAAQAEAAADACQACACAAAEIAAAOIASgEIASgEIASgGIADgBIACAAQAEABADACQACACAAAEQAAAFgCACQgCACgFABIgSAFIgUAEIgVAEIAAAIQAAAEACACQACACAGACIASAAIAUgBQAGgBACgEQACgDAAgHQAAgFACgCQADgCAEAAQAFAAADACQACADAAAFQAAAJgCAHQgBAGgDADQgDADgFABIgOADIgWAAQgUAAgKgCgAgGg2IgFgFIgCgCIgBgCIgYACIgbACIgXABIgOABQgFAAgCgCQgDgDAAgEIABgFQACgCADgBIACgBIAGAAIADAAIABAAIAKgPIAIgPIAEgFIAGgCQAEABACADQADABAAAEQAAADgEAHIgMASIACgBIAUgBIAQgBIADAAIACAAIADAAIgDgFIgEgEQgDgDAAgEQAAgDADgDQACgCAEgBQADAAADACIAKAKIAQAVIADAEIABAEQAAAEgDACQgDADgDABQgDgBgCgBg");
	this.shape_24.setTransform(251.075,159.5);

	this.shape_25 = new cjs.Shape();
	this.shape_25.graphics.f("#006600").s().p("Ag6BuQgDgCAAgEIAAhLIgQANIgRAMIgEADIgEAAQgFAAgDgDQgCgDAAgFQgBgEACgCQACgDAFgDIANgIIAPgLIAPgKIAAhpQAAgEADgCQADgDAEAAQAFAAADADQADACAAAEIAADMQAAAEgDACQgDACgFABQgFAAgCgDgAgeBsQgDgDAAgFQAAAAAAgBQAAgBAAAAQAAgBABAAQAAgBAAAAIAGgGQAXgXAMgfQANgeADglIgvAAQgEAAgDgCQgCgDAAgEQAAgFACgCQADgDAEAAIAwAAIAAg1QAAgEADgCQADgDAEAAQAFAAADADQADACAAAEIAAA1IA3AAQAEAAACADQACADABAEQgBAEgCADQgCACgEAAIg0AAQAIAlAOAfQAPAeAWAXIADAEIABAEQAAAFgDADQgDAEgFAAQgEAAgGgFQgGgGgJgMQgNgSgJgXQgKgWgFgYQgFAagJAXQgJAWgOATQgIAKgGAFQgHAGgEAAQgFgBgDgCgAhYgNIgDgDIgBgCIgBgGIgEgPIgEgOIgEgPIgBgEIgBgDQABgEACgDQADgDAFAAQADAAADACQACABABAEIADAIIAEANIADAOIADAMIABAGIABADQgBAFgCADQgDADgFAAIgFgCgABTg7IgFgGIgEgIIgEgHIgHgLIgCgEIAAgDQAAgEADgDQADgDAEAAQADAAACACIAFAFIAOAXQAEAIAAADQAAAEgDADQgDADgFAAQgDAAgCgCg");
	this.shape_25.setTransform(227.17,159.875);

	this.shape_26 = new cjs.Shape();
	this.shape_26.graphics.f("#006600").s().p("AhpBwQgCgCAAgDIAAiFQAAgIAEgEQAEgDAHAAIAKAAIgDgLIgDgLIgDgJIgQAAQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAxAAIAAgPQAAgDADgDQACgCAFAAQAEAAADACQADADAAADIAAAPIAvAAQADAAACADQACACAAAEQAAAEgCADQgCACgDAAIgRAAIgEAOIgFARIALAAQAHAAAEADQAEAEAAAIIAAB3QAAALgGAEQgEAEgPAAQgNAAgFgCQgFgCAAgGQAAgEACgDQACgCAEAAIADAAIAGAAIACABIACAAQAGAAACgCQACgBAAgFIAAhqQAAgBAAAAQAAgBgBAAQAAgBAAAAQAAgBgBAAQAAAAAAAAQgBgBAAAAQgBAAAAAAQgBAAAAAAIgcAAIAAAQIAVAAQAEAAABACQACACAAAEQAAADgCACQgBACgEAAIgVAAIAAARIAIAAQAHAAADADQADADAAAHIAAAjQAAANgNAAIggAAQgNAAAAgNIAAgjQAAgHAEgDQADgDAGAAIAIAAIAAgRIgUAAQgDAAgCgCQgCgCAAgDIACgGQACgCADAAIAUAAIAAgQIgbAAQgBAAAAAAQgBAAAAAAQgBAAAAABQgBAAAAAAQAAAAAAABQgBAAAAABQAAAAAAABQAAAAAAABIAAB/QAAADgDACQgCACgEAAQgEAAgDgCgAg9AnIgBADIAAAWIABAEIAEABIARAAIADgBIABgEIAAgWIgBgDIgDgBIgRAAIgEABgAhFg+IADAMIACAJIAdAAIADgMIADgJIACgKIgtAAIADAKgABkBwIgGgGQgJgJgHgJQgHgKgHgMIgPAWQgIALgIAHIgGAGIgFABQgFAAgDgDQgDgDAAgEIABgFIAGgGQALgMAJgLQAIgLAHgOIgKgZIgJgcQgEAJgDAEQgDAEgEAAQgEAAgDgDQgDgCAAgDIAAgDIACgGQAJgWAGgYQAGgYACgYQABgFACgCQADgDAEAAQAFAAACADQADACAAAEIgBALIgDARIA2AAQAEAAACACQACADAAAEQAAAFgCACQgCADgEAAIgHAAQgBATgEATIgIAiQgFARgGANQAGALAKANQAKANALALIAEAFIABAFQgBAEgCADQgDADgFAAIgFgBgAAug0IAAACIgBADIgBADIgBAEQADARAFAQIALAdQAHgTAEgUQAFgUACgUIggAAg");
	this.shape_26.setTransform(203.225,159.725);

	this.shape_27 = new cjs.Shape();
	this.shape_27.graphics.f("#006600").s().p("AhhBxQgEAAgEgDQgDgDAAgFIABgEIAEgGIALgOIAKgSQABgDADgBIAFgCQAFAAADADQADADAAAFIgCAIIgHAMIgJAOQgGAIgEAEQgDACgDAAIgBAAgAgdBwQAAgBgBAAQAAAAgBgBQAAAAgBgBQAAAAAAgBIgBgCIgBgEIgCgRIgEgSIAAgCIAAgBQAAgEADgDQADgDAFAAQAEAAADADQACACACAGIADAOIADAPIABAKQAAAEgDADQgDACgGAAQgDAAgDgBgABbBvQgCgCgDgFIgLgUIgLgQIgCgEIAAgDQAAgEADgDQAEgDAEAAQADAAADACQADACAFAGIALARIAJAPQACAGAAADQAAAEgDADQgEADgFAAQgDAAgDgBgAAdBuQgDgCgBgFIgGgQIgEgKIgDgIIgBgDIAAgDQAAgEADgDQADgCAFgBQAEAAACADQADACADAIIAHAPIAEANIACAIQAAAEgDADQgEADgFAAQgEAAgCgCgAhjAtQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAXAAIAAgoIgcAAQgDAAgDgCQgCgDAAgEQAAgEACgCQACgDAEAAIAcAAIAAgfQgIALgFAEQgFAEgDAAQgFAAgCgDQgDgDAAgEQAAAAAAgBQAAgBAAAAQAAgBAAAAQAAgBABAAIAFgHQAKgKAIgLQAIgKAGgLQABgDADgCQACgBADAAQAEAAADACQADADAAAEQAAACgBADIgGAKICaAAQAEAAACADQACACABAEQAAAFgDACQgCACgEAAIgQAAIAAAnIAYAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAIgYAAIAAAoIATAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAgAAiAbIAcAAIAAgoIgcAAgAgLAbIAbAAIAAgoIgbAAgAg5AbIAcAAIAAgoIgcAAgAAigfIAcAAIAAgnIgcAAgAgLgfIAbAAIAAgnIgbAAgAg5gfIAcAAIAAgnIgcAAg");
	this.shape_27.setTransform(179.075,159.6786);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_27},{t:this.shape_26},{t:this.shape_25},{t:this.shape_24},{t:this.shape_23},{t:this.shape_22},{t:this.shape_21},{t:this.shape_20},{t:this.shape_19},{t:this.shape_18},{t:this.shape_17},{t:this.shape_16},{t:this.shape_15},{t:this.shape_14},{t:this.shape_13},{t:this.shape_12},{t:this.shape_11},{t:this.shape_10},{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape},{t:this.instance}]}).wait(28));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(39.9,25.7,609.7,282.5);


(lib.exp_text_2 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Text_new_enemy("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(344.65,57.15,1,1,0,0,0,312.9,65.4);

	this.shape = new cjs.Shape();
	this.shape.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape.setTransform(358.575,244.375);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_1.setTransform(342.475,244.375);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#006600").s().p("AgZAMIgVAAIgWAAIgQAAIgJgBQgEgBgCgDQgCgDAAgEQAAgFADgDQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAADgCADQgDADgEABIgJABIgWAAIgdABIgfAAIgbAAg");
	this.shape_2.setTransform(322.875,243.8);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#006600").s().p("AhqBmQgEgDAAgGIABgFIAEgEQAIgHAIgKQAIgLAHgOQAHgMAFgPQAEgKADgOIAEgeIABghIAAgEIAAgFIgCgDIgBgBIAAgDQAAgEADgDQAEgEAFAAIAFABIAEAFQACACABAFQACAEAAAHQAAASgCASQgCASgDARQgDAPgEALQgEANgIAPQgHAOgJAOQgIAMgIAIIgHAGIgFABQgGAAgDgDgABFBlQgEgDgHgJQgJgKgIgMQgIgNgGgNQgGgNgEgMIgGgcQgDgQgCgSQgCgRAAgOQAAgMAEgGQAEgGAHAAQAEAAADACQADADAAAFIAAADIgCAEIgBADIAAAEIAAAGQAAAPACARQACARADAPQAEAPAEALIAMAXIAPAWQAIALAIAGIAEAFIABAFQAAAFgEAEQgDAEgFAAIgBAAQgDAAgEgDgABGggIgGgHIgKgQIgLgTQgEgHAAgCQAAgDADgDQACgCAEAAQABAAAAAAQABAAABAAQAAABABAAQAAAAABAAIADAGIAIANIAJAPIAIALIABAEIABADQAAADgDACQgCACgDABQgBAAAAgBQgBAAgBAAQAAAAgBAAQAAgBgBAAgABggwIgLgQIgNgWQgFgIAAgDQAAgDADgCQACgCAEAAIAEABIAEAFIAEAHIAGALIAIAMIAGAKIACACIABADQAAAEgDACQgCACgEAAIAAAAQgDAAgDgDg");
	this.shape_3.setTransform(299.475,244.6);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#006600").s().p("AgZAMIgVAAIgWAAIgQAAIgJgBQgEgBgCgDQgCgDAAgEQAAgFADgDQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAADgCADQgDADgEABIgJABIgWAAIgdABIgfAAIgbAAg");
	this.shape_4.setTransform(274.875,243.8);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#006600").s().p("AAMBoQgDgCAAgEIgBgTIgBgeIAAgkQgTAWgTASQgTASgRANIgOAJQgEACgDABQgEgBgDgDQgDgDgBgEQAAgDACgDIADgEIABgBIAHgEQARgLAQgOQAQgOAQgQQAQgQAMgQIAAgSIgFAAIg4ABIgcAAQgFAAgDgCQgDgDAAgFIACgHQACgCACgBIACgBIAEAAIALAAIAGAAIAJAAIAQAAIAYAAIAWAAIAAgnQAAgFADgDQADgDAFAAQAFAAACADQAEACAAAGIAAAcIAAADIAAACIAAAGIAWgBIAPAAIAIAAIAKgBIAGAAQAEAAADACQACADABAFQgBAEgCADQgCADgDAAIgOAAIgRABIgSAAIgOABIAAAbIAAASIAAARIABASIAAAYIABAXQgBAHgCAEQgDADgFAAQgFAAgDgCg");
	this.shape_5.setTransform(251.1,244.5);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#006600").s().p("ABUBjIgIgJIgPgTQgKAIgLAFQgMAFgPACQgKACgOABIggACIglABQgLAAgGgDQgFgDAAgGQAAgFADgDQACgDAFgBQAWgiAUgoQATgpARgxQABgEADgDQACgCAFAAQAEAAADADQADADAAAFIgEANIgHAXIgMAeIgNAcIgTAlQgIARgLAQIAHAAIAEAAIAEAAIAagBIAYgCIASgDQAKgCAIgEQAIgEAHgFIgQgXIgHgMIgCgGQAAgGADgDQADgDAFgBQAEAAACACQADACADAHIAMASIAOAUIAPASIALAOIADADIABAEQAAAFgEAEQgDAEgFAAQgDAAgEgCg");
	this.shape_6.setTransform(227.325,244.575);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#006600").s().p("AgZAMIgVAAIgWAAIgQAAIgJgBQgEgBgCgDQgCgDAAgEQAAgFADgDQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAADgCADQgDADgEABIgJABIgWAAIgdABIgfAAIgbAAg");
	this.shape_7.setTransform(202.875,243.8);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.f("#006600").s().p("Ag5BnQgEgFAAgEIABgGQABgDADgBIABgBIAEgCQAPgIAJgHQAKgIAFgGQAFgIACgKQACgJAAgMIAAgrIgWABIgTAAIgHAAIgJAAQgFAKgHAJQgHAJgJAGIgGAEQAAAAgBABQAAAAgBAAQAAAAgBAAQgBAAAAAAQgGAAgCgDQgDgDAAgFIAAgEIAEgEQAJgGAGgJQAHgIADgIIAEgNIACgPIABgRIgBgLQAAgFADgCQADgDAFAAQAEAAADADQADABABAEIAAANIgBARIgCARIAOAAIAJAAIAqAAIAogCIgIgPIgCgHQAAgEACgCQADgDADABQABgBABAAQAAAAABABQAAAAABAAQAAAAABABIADAFIAJAPIAJAQIAIAMIABADIAAADQAAADgCACQgDACgDABQgDAAgDgDQgDgDgDgHIgMABIgMABIgNAAIgJABIAAArQAAAQgCANQgDAMgGAJQgEAGgHAJQgJAHgLAIIgQAKQgGADgDAAQgEAAgDgDgABhgqIgGgHIgKgRIgJgQIgFgJIgBgEQAAgDADgDQACgCAEAAIAEABIAEAFIAGAMIAKAQIAJAPIACADIAAADQAAADgCACQgDADgDAAQgBAAAAAAQgBAAgBAAQAAgBgBAAQAAAAgBgBg");
	this.shape_8.setTransform(179.825,244.5);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.f("#006600").s().p("AgQBjQgQAAgKgCQgJgBgFgCQgJgEgFgHQgFgGAAgIQAAgHAEgIQADgHAHgGIAcgZIAegYIgfgWIgbgXIgTgRIgHgJQgCgEAAgEQAAgFADgDQADgDAFgBQAEABACABIAEAEQAEAIAKAKQAKAJAQANIAoAgIANgLIALgIIALgIIADgDIAEgDIAHgGIAFgGIADgDIAFgBQAFAAADADQAEADAAAFQAAAFgFAHQgFAGgMAHIgcAVIgfAXIgbAXIgUAUIgHAHQgCADAAADQAAAEADACQADADAHABIAVACIAiAAIAZAAIAQgBIAJgCIAFgCIAEgCIADAAQAFAAADADQADADAAAFQAAAEgCADQgCACgDACQgFADgHABIgSACIgeAAIgnAAg");
	this.shape_9.setTransform(346.375,202.1);

	this.shape_10 = new cjs.Shape();
	this.shape_10.graphics.f("#006600").s().p("AguBcQgNgIAAgOQAAgQARgNQARgNAfgJIgPgJIgTgMIgGgGQgBgCAAgDQAAgEACgEQADgEAEgEIAYgTIAngeIgBgBIgXABIgZACIgZABIgUAAQgJAAgDgDQgEgCABgFQgBgGADgCQADgDAGAAIACAAIAFAAIAGAAIAIAAIAvgBIArgCIADAAIABAAQAHAAAFADQAFAEAAAEIgBAGIgDAEIgCACIgGAEIgRAOIgVAQIgTAPIgNAMIAPAMQAIAEAOAGQARAKALAIQAKAGAFAHQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAGgIAGQgIAHAAAIQAAAFAGADQAGACAPAAQAQAAANgDQANgEAIgHQAIgGAAgHQAAgEgFgFQgEgFgKgFQgVAEgOAFg");
	this.shape_10.setTransform(322.6237,202.65);

	this.shape_11 = new cjs.Shape();
	this.shape_11.graphics.f("#006600").s().p("AhoBmQgEgDAAgGIAAgEIAEgEIAIgFQAbgUASgYQATgYAJgcQAKgeACglIg5AAQgFAAgCgDQgDgDAAgFQAAgFADgDQACgCAFAAIA+AAQAJAAAEADQAFAFAAAKQAAAwAXAoQAXApAsAkIAFAGQACACAAADQAAAFgEAEQgDADgFABIgGgBIgIgGQgLgIgMgMQgLgMgJgOQgLgOgHgOQgIgMgEgNQgGgNgDgPQgFAdgLAXQgLAWgRAVQgKALgKAKIgTAPQgJAFgEAAQgGAAgDgDg");
	this.shape_11.setTransform(299.25,202.5);

	this.shape_12 = new cjs.Shape();
	this.shape_12.graphics.f("#006600").s().p("AhXBmQgDgCgBgEIAAgLIgBgWIAAgZIAAgXIAAghIABgiIAAgcIABgPQABgEADgCQADgDAEAAQAFAAADADQACADAAAFIAAAFIAAAHIgCAgIAAAvIAAAmIABAhIABAXIAAACIAAABQAAAEgDADQgDADgFAAQgEAAgDgDgAAKBcQgKgFgJgKQgGgGgDgGQgEgHAAgFQAAgFADgDQADgDAFAAIAFABIADADIABABIACAEQADALAJAHQAJAGALAAQAOAAAKgHQALgHADgNQABgDADgCQADgCADAAQAFAAADADQADADAAAEIgBAJIgFAJQgIANgOAHQgNAHgRABQgMAAgLgFgAA4gHQgEgDAAgFQAAAAAAgBQAAgBABAAQAAgBAAAAQAAgBABAAIAEgFQAHgGADgHQAEgHAAgHQAAgLgLgGQgKgFgSgBQgLAAgJADQgKACgKAEIgEACIgDAAQgEAAgDgDQgDgDAAgFQAAgEADgDQAEgDAIgDQAHgDAKgCQALgBAOAAQASAAAOAFQANAFAIAKQAHAKAAANQAAAMgFALQgGALgJAIIgFADIgFABQgEAAgDgDg");
	this.shape_12.setTransform(274.975,202.075);

	this.shape_13 = new cjs.Shape();
	this.shape_13.graphics.f("#006600").s().p("AhcBgQgDgEAAgFIAAgEIADgDIACgBIAFgEQATgLAQgMQARgNAOgOQAOgNAIgNQAJgMAIgNIAOgZQAFgMADgLIgXACIgbAAIgbABIgYAAQgFAAgDgCQgCgDgBgFQABgEABgDQACgDADgBIACAAIAEAAIALAAIAkAAIAfgBIAagBIAGgDIAFgBQAGAAACADQAEAEAAAGIgBAHIgFAKIgIASQgKAVgKARQgLARgMAPIAfAUIAYARIAXARQAFAFAAAGQAAAFgEAEQgDADgFABIgEgBIgEgDIgSgPIgbgUIgfgXIgaAYIgZAUIgUAOQgJAFgEAAQgEAAgEgDg");
	this.shape_13.setTransform(251.05,202.575);

	this.shape_14 = new cjs.Shape();
	this.shape_14.graphics.f("#006600").s().p("AAQBcIgDgDIgHgIIgRgUIgXgWIgTgSIgDgEIgBgFQAAgFADgDQAEgEAFAAIAFACIAJAHIAUATIAFAFQAUgMARgQQAQgPAMgSQAMgSAEgTIgfAAIgTAAIgNABIgOAAIg2AAIgQAAIgIABIgLgBIgGgCIgCgEIgBgEQABgEACgEQACgDAEAAIABAAIADAAIAIAAIAPAAIAvgBIAhAAIAaAAIATAAIASAAIAFgEIAFgBQAFAAADADQADAEAAAGIgBALIgEAPQgHARgJAQQgLARgMAMQgKAKgLAKQgLAJgQAJIARARIAHAJQABADAAACQAAAGgEADQgDAEgGAAIgEAAg");
	this.shape_14.setTransform(226.95,202.625);

	this.shape_15 = new cjs.Shape();
	this.shape_15.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_15.setTransform(202.975,202.375);

	this.shape_16 = new cjs.Shape();
	this.shape_16.graphics.f("#006600").s().p("AgkBvQgDgDAAgEQAAgDACgDIAHgEIAKgFIANgHIAKgHIAGgEIAEAAQAFAAADACQACADABAEQAAAEgFAFQgGAFgNAHIgSAKQgIADgDABQgEAAgDgEgAhKBvQgDgCAAgDIAAhqIgJAZQgEAKgFAKIgCADIAAABIgEAEIgFABQgDAAgDgDQgDgDAAgDIABgEIAEgIQAGgKAGgOIALgcQAFgPADgOIgYAAQgEAAgCgDQgDgCAAgFQAAgEACgCQACgCAFgBIAaAAIAAgmQAAgDADgCQACgDAFAAQAEAAADADQADACAAADIAAAmIAVAAQADAAADADQACACAAAEIAAAEIgCACIABAAIABAAIAeAAIAAgVIgcAAQgDgBgCgCQgCgCAAgEQAAgDACgDQACgCADAAIAcAAIAAgPQAAgDACgDQADgDAEAAQAEAAADADQADADAAADIAAAPIAjAAIAAgPQAAgDADgDQACgCAEAAQAFAAACADQADACAAADIAAAPIAbAAQADAAACACQACADABADQgBAEgCACQgCACgDABIgbAAIAAAVIAgAAQADABACACQACACAAAEQAAADgCADQgCACgDAAIg7AAIAAAQIAoAAQAJAAAEAEQAFAFAAAJIAAA1QAAAIgEAEQgFAFgIAAIhiAAQgIAAgFgFQgEgEAAgJIAAg1QAAgIAEgFQAEgEAJAAIAmAAIAAgQIg5AAQgDAAgCgCQgCgDAAgDIAAgDIABgCIgBAAIgBAAIgVAAIAAAbIANAOIALANIADAFIACADIAAADQAAADgDADQgDADgEAAQgDAAgCgCQgDgCgCgFIgFgIIgEgIIAABpQAAADgDACQgDADgEAAQgEAAgDgDgAAwA1IAiAAQAAAAABgBQAAAAABAAQAAAAABAAQAAgBABAAIABgEIAAgPIgnAAgAgHAvQAAABAAAAQAAABABAAQAAABAAAAQAAABABAAQAAAAAAABQABAAAAAAQABAAAAAAQABABAAAAIAfAAIAAgVIgkAAgAAwAQIAnAAIAAgPIgBgCQgBgBAAAAQAAAAgBgBQAAAAgBAAQAAAAgBAAIgiAAgAgFgBQgBAAAAAAQAAABAAAAQgBAAAAAAQAAABAAAAIAAAPIAkAAIAAgTIgfAAQAAAAgBAAQAAAAgBAAQAAABgBAAQAAAAAAABgAAVg0IAjAAIAAgVIgjAAgABmBwIgGgDIgQgKIgTgKIgFgEQAAAAAAgBQgBgBAAAAQAAgBAAAAQAAgBAAgBQAAgEADgDQADgCAEAAIADAAIAFACIAOAHIAMAHIALAGIAFAEQABADAAACQAAAFgDACQgDADgEABIgEgBg");
	this.shape_16.setTransform(178.925,202.1);

	this.shape_17 = new cjs.Shape();
	this.shape_17.graphics.f("#006600").s().p("AAkBrIgSgDIgSgFIgSgFQgQgEgMgGQgNgFgHgGQgFgDgCgFQgCgFAAgHQAAgIAEgGQAEgGAGAAQAFAAADADQADADAAAFIAAACIgBACIgBADIAAACQAAACADADIAKAGQAJAEAOAEIAeAIQARAEAQABQAGABADADQADADAAAFQAAAFgDADQgDADgFAAIgMgBgAAMAuQgDgEAAgFIAAgDIADgDQAFgFADgEQACgEAAgDIgBgFIgCgHIgSABIgbAAIgdABIgSABIgLAAIgDAAIgBAAQgHAAgDgCQgDgDAAgEQAAgEABgCQACgCADgBIACgBIAEAAIAWAAIAZgBIAjgBIASAAIgGgOIgFgSIgMAAIguABIgYABIgCAAIgCAAQgFAAgDgCQgDgDAAgFQAAgFADgCQACgDAGAAIARAAIAUAAIAcgBIAPAAIgCgGIgCgHIgBgCIAAgBIgBgHIgBgGQAAgFADgDQADgEAGAAQAEAAADAEQADADAAAFIACANIAEAPIAhgBIAogDIABAAIACAAQAFAAACADQADACAAAFQAAAFgCACQgDADgEAAIgSABIgqACIgLAAIAHATIAFANIAbgBIAfgCIABAAIABAAQAEAAACADQADADAAAFQAAAEgCACQgDACgEAAIgIAAIgOABIgPABIgOAAIACAIIABAHQAAAGgEAHQgEAHgFAGQgDADgDACIgGABQgEAAgEgDg");
	this.shape_17.setTransform(394.975,159.975);

	this.shape_18 = new cjs.Shape();
	this.shape_18.graphics.f("#006600").s().p("AgQBjQgQAAgKgCQgJgBgFgCQgJgEgFgGQgFgHAAgJQAAgGAEgHQADgIAHgGIAcgZIAegYIgfgXIgbgVIgTgRIgHgJQgCgFAAgDQAAgGADgDQADgEAFAAQAEAAACACIAEAEQAEAIAKAJQAKALAQANIAoAeIANgKIALgIIALgIIADgDIAEgDIAHgGIAFgHIADgCIAFgBQAFAAADADQAEAEAAAFQAAAFgFAFQgFAHgMAIIgcAUIgfAXIgbAXIgUATIgHAIQgCADAAADQAAAEADACQADACAHACIAVABIAiABIAZAAIAQgBIAJgBIAFgDIAEgCIADAAQAFAAADADQADADAAAFQAAADgCADQgCAEgDACQgFACgHABIgSACIgeABIgngBg");
	this.shape_18.setTransform(370.375,159.75);

	this.shape_19 = new cjs.Shape();
	this.shape_19.graphics.f("#006600").s().p("Ag+BXQgMgHgGgOIgEgNIgBgRIgBgSIgBgZIAAgcIAAgXIgBgMIgBgJIAAgBIAAgBQAAgGADgCQADgDAGAAQAGAAAEAGQADAGAAANIAAADIAAAFIgBAMIAAAQIABArIABAbQABAKADAFQACAFADADQAFAEAGADQAHACAJAAIAMgBIANgDIACAAIAAgBQAEABADADQADADAAAGQAAAEgCADQgCADgFABIgHACIgLABIgLAAQgVAAgNgGgABIAqQgDgCgBgDIgBgCIAAgDIAAgHIgBgZIgCgbIgDgYIgEgTIgBgDIAAgCQAAgEADgDQADgDAFAAQAEAAADABIAEAFIABAGIADALIAEAcIADAfIABAcQAAALgCAEQgDAEgGAAQgEAAgDgCg");
	this.shape_19.setTransform(347.2042,160.025);

	this.shape_20 = new cjs.Shape();
	this.shape_20.graphics.f("#006600").s().p("AgfBhQgKgLAAgRQAAgOAHgNQAIgLALgJQAMgHAMgBIAJABIAJAEIgCgRIgDgUIgBgCIAAgBQAAgFADgCQADgDAFAAQACAAADACQADACACADIAAABIABAHIADASIACANIACASIAIAHIAGAHIAFADIACADIABABIABABIAGADIAJAGIAEAEQACADAAADQgBAFgCADQgDADgFAAQgCAAgEgCIgLgIIgEgDIgFgFIgKgJQgGAXgPANQgOAOgTAAQgPAAgJgLgAgEAnQgHAEgFAIQgDAHAAAJQAAAJADAFQAEAFAIAAQAMAAAJgMQAKgMABgUIgKgGQgEgBgFAAQgIgBgFAFgAheAjQgEgEAAgFIAAgEIACgCIAFgFQALgMAKgPQALgQAIgRIgKABIgMAAIgMABIgGAAQgHgBgCgCQgDgDAAgFQAAgDACgDQADgEADgBIACAAIAEAAIAKAAIAZAAIAKAAIgBgRIgCgMIAAgBIAAgBQAAgFACgDQAEgDAEAAQAIAAACAIQADAIAAAQIAAAFIAAAEIAIAAIAKAAIATgBIAOgBIANAAIgEgLIgCgKQAAgEADgDQAEgDAEAAQADAAADABQADABAAADIABACIAAAGQACAPAMAOQAMAOASAKIAEADQABACABADQgBAEgDAEQgDADgDAAQgFAAgOgKQgJgGgGgFQgGgHgFgIIgHABIgHAAIgFAAIgJABIgUABIgOAAIgQABQgJATgLAUQgLARgOATIgDADIgCACIgEADIgEABQgFAAgDgDg");
	this.shape_20.setTransform(323.25,159.95);

	this.shape_21 = new cjs.Shape();
	this.shape_21.graphics.f("#006600").s().p("AAABWIgDgCIgCgCIgCgHIgJgXIgNgcIgNgcIgFADIgHADIgEACIgIADIgIACQgFAAgCgDQgDgCAAgEQAAgEACgCQADgCAEgBIAEgBIAHgDIAGgDIAIgDIgGgNIgLgVIgHgMIgCgFIAAgDQAAgEADgCQADgDAEAAIAEABQABABAAAAQABAAAAABQAAAAABABQAAAAAAABIABAAIACAEIAFAKIAJAUIAEAGIAEAKIAFgDIAHgDIANgGIAFgDIAFgCIAAgGIgBgLIAAgKIAAgFIAAgBIAAgBQAAgDABgDQADgCAEAAQADAAADACQACABABADIAAAFIABAIIAAAJIABAFIATgHQAIgCAGAAQAQAAAIAKQAJAJAAATQAAAMgGAMQgGALgMAKIgLAIIgLAFIgIACQgEAAgCgCQgDgDAAgEIABgEIACgDIACgBIAHgDQAJgEAHgGQAHgGAEgIQAEgIAAgIQAAgKgEgFQgDgFgIAAQgFAAgHACIgSAIIAAAMIABAMIAAAJIAAAEIgBACQgBADgCABQgCACgDAAQgFAAgCgDQgCgCAAgFIgBgMIAAgOIgGACIgGAEIgKAFIgGADIATAoIALAaIAGAOIADAGIAAADQAAAEgDADQgDACgEAAIgDgBg");
	this.shape_21.setTransform(299.225,162.225);

	this.shape_22 = new cjs.Shape();
	this.shape_22.graphics.f("#006600").s().p("AgxBjQgNgGgHgMIgEgKIgBgMIgBgUIABgbIABgeIABgdIABgXIABgFIAAgCIAAgHIgCgHIAAgBIAAgBQAAgFADgDQADgDAGAAQAGAAAEAFQAEAHAAAKIAAADIgBAEIAAAJIgDAiIgBAiIgBAfIABATIABAMIADAHQAEAHAHACQAIAEALAAQAOAAAKgFQALgEAJgIIAJgMIAJgPIAIgQQACgEACgBQADgDADAAQAFAAAEAFQADADABAFIgEAMIgJARQgFAJgGAIQgMAPgRAHQgSAJgWgBQgTAAgNgGgAAUgFIgGgHIgLgOIgOgVQgFgHAAgCQABgDACgCQADgDADAAQABAAAAAAQABAAAAAAQABAAAAAAQAAABABAAIADAFIAFAIIAJALIAJALIAHAJIACADIAAADQAAADgCADQgDACgDABIgEgBgAAzgaIgGgGIgLgPQgLgOgEgGQgFgHAAgCQABgEACgCQADgCADgBIAEABIAEAGIAFAHIAJAMIAJALIAHAJIACADIAAADQAAADgCACQgDAEgDAAIgBAAIgDgCg");
	this.shape_22.setTransform(276.275,159.75);

	this.shape_23 = new cjs.Shape();
	this.shape_23.graphics.f("#006600").s().p("AgcBwQgMAAgGgDQgGgCgCgFQgCgEAAgGIAAgjQABgDACgDQADgCAEgBQAFABADACQADADAAADIAAAaQAAAFACADQACABAIABIAXABIASgBIAOAAQAGgBACgEQACgEABgLQAAgEACgDQADgCAEAAQAGAAACADQADADAAAFQAAAOgEAJQgDAIgHADQgFABgMABIgeABIgeAAgAhsBpQgDgDAAgEIABgFIADgEIAIgOIAJgRQACgEACgBQADgDADAAQAEAAADAEQAEADAAADIgCAHIgFALIgGANQgGAKgEADQgEAEgEAAQgEAAgEgDgABgBoQgDgCgDgEIgMgUIgKgNIgCgDIgBgFQAAgDADgDQADgCAEgBIAFABQADABADAFIAKALIANATQAEAHAAADQAAAFgEACQgCADgFAAQgEAAgCgBgAAIBTQgDgBgCgEIgHgLIgEgFIgEgFIgCgDIgBgEQAAgDADgCQADgDAEgBIAEABIAEAFIAIAJIAJAMQADAFAAADQAAAEgDADQgDACgEAAQgDAAgCgCgAhiArQgDgCAAgEIAAhFQAAgIAFgEQAEgFAIAAIA/AAQAJABAEAEQAFAEAAAIIAAA2QAAAHgDAEQgCAGgFABQgCACgFAAIgMAAIgKAAIgIgBIgFgDQgBgCAAgEQAAgEACgCQADgCADgBIABAAIACABIAIAAIAHABQAEAAACgCQABgBAAgEIAAgFIg6AAIAAAYQAAAEgDABQgDADgEAAQgEAAgDgCgAhRAAIA6AAIAAgLIg6AAgAhQghQAAAAAAABQgBAAAAABQAAAAAAABQAAAAAAAAIAAAGIA6AAIAAgGIgBgDIgEgBIgwAAIgEABgAAeApQgKgBgEgFQgDgGAAgJIAAgrQAAgEACgDQADgCAFgBQAEABADACQACADAAAEIAAAMIAdgFIAagHIAEgBIACAAQAEAAADACQADADAAAEQAAADgCADQgCACgGABQgMAEgPACIgiAEIAAAKQAAAEACADQACACAFABIAQAAIAYgBQAHgBACgCQACgEAAgGQAAgFACgCQADgCAEAAQAFAAADACQACAEAAAEQAAANgDAHQgEAHgHACIgJABIgMABIgOAAIgIABQgPAAgJgCgAAdgmQgKgBgDgFQgDgFAAgJIAAgsQAAgEACgCQADgCAFAAQAEAAADACQACACAAAEIAAAOIASgEIASgEIASgGIADgBIACAAQAEABADACQACACAAAEQAAAFgCACQgCACgFABIgSAFIgUAEIgVAEIAAAIQAAAEACACQACACAGACIASAAIAUgBQAGgBACgEQACgDAAgHQAAgFACgCQADgCAEAAQAFAAADACQACADAAAFQAAAJgCAHQgBAGgDADQgDADgFABIgOADIgWAAQgUAAgKgCgAgGg2IgFgFIgCgCIgBgCIgYACIgbACIgXABIgOABQgFAAgCgCQgDgDAAgEIABgFQACgCADgBIACgBIAGAAIADAAIABAAIAKgPIAIgPIAEgFIAGgCQAEABACADQADABAAAEQAAADgEAHIgMASIACgBIAUgBIAQgBIADAAIACAAIADAAIgDgFIgEgEQgDgDAAgEQAAgDADgDQACgCAEgBQADAAADACIAKAKIAQAVIADAEIABAEQAAAEgDACQgDADgDABQgDgBgCgBg");
	this.shape_23.setTransform(251.075,159.5);

	this.shape_24 = new cjs.Shape();
	this.shape_24.graphics.f("#006600").s().p("Ag6BuQgDgCAAgEIAAhLIgQANIgRAMIgEADIgEAAQgFAAgDgDQgCgDAAgFQgBgEACgCQACgDAFgDIANgIIAPgLIAPgKIAAhpQAAgEADgCQADgDAEAAQAFAAADADQADACAAAEIAADMQAAAEgDACQgDACgFABQgFAAgCgDgAgeBsQgDgDAAgFQAAAAAAgBQAAgBAAAAQAAgBABAAQAAgBAAAAIAGgGQAXgXAMgfQANgeADglIgvAAQgEAAgDgCQgCgDAAgEQAAgFACgCQADgDAEAAIAwAAIAAg1QAAgEADgCQADgDAEAAQAFAAADADQADACAAAEIAAA1IA3AAQAEAAACADQACADABAEQgBAEgCADQgCACgEAAIg0AAQAIAlAOAfQAPAeAWAXIADAEIABAEQAAAFgDADQgDAEgFAAQgEAAgGgFQgGgGgJgMQgNgSgJgXQgKgWgFgYQgFAagJAXQgJAWgOATQgIAKgGAFQgHAGgEAAQgFgBgDgCgAhYgNIgDgDIgBgCIgBgGIgEgPIgEgOIgEgPIgBgEIgBgDQABgEACgDQADgDAFAAQADAAADACQACABABAEIADAIIAEANIADAOIADAMIABAGIABADQgBAFgCADQgDADgFAAIgFgCgABTg7IgFgGIgEgIIgEgHIgHgLIgCgEIAAgDQAAgEADgDQADgDAEAAQADAAACACIAFAFIAOAXQAEAIAAADQAAAEgDADQgDADgFAAQgDAAgCgCg");
	this.shape_24.setTransform(227.17,159.875);

	this.shape_25 = new cjs.Shape();
	this.shape_25.graphics.f("#006600").s().p("AhpBwQgCgCAAgDIAAiFQAAgIAEgEQAEgDAHAAIAKAAIgDgLIgDgLIgDgJIgQAAQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAxAAIAAgPQAAgDADgDQACgCAFAAQAEAAADACQADADAAADIAAAPIAvAAQADAAACADQACACAAAEQAAAEgCADQgCACgDAAIgRAAIgEAOIgFARIALAAQAHAAAEADQAEAEAAAIIAAB3QAAALgGAEQgEAEgPAAQgNAAgFgCQgFgCAAgGQAAgEACgDQACgCAEAAIADAAIAGAAIACABIACAAQAGAAACgCQACgBAAgFIAAhqQAAgBAAAAQAAgBgBAAQAAgBAAAAQAAgBgBAAQAAAAAAAAQgBgBAAAAQgBAAAAAAQgBAAAAAAIgcAAIAAAQIAVAAQAEAAABACQACACAAAEQAAADgCACQgBACgEAAIgVAAIAAARIAIAAQAHAAADADQADADAAAHIAAAjQAAANgNAAIggAAQgNAAAAgNIAAgjQAAgHAEgDQADgDAGAAIAIAAIAAgRIgUAAQgDAAgCgCQgCgCAAgDIACgGQACgCADAAIAUAAIAAgQIgbAAQgBAAAAAAQgBAAAAAAQgBAAAAABQgBAAAAAAQAAAAAAABQgBAAAAABQAAAAAAABQAAAAAAABIAAB/QAAADgDACQgCACgEAAQgEAAgDgCgAg9AnIgBADIAAAWIABAEIAEABIARAAIADgBIABgEIAAgWIgBgDIgDgBIgRAAIgEABgAhFg+IADAMIACAJIAdAAIADgMIADgJIACgKIgtAAIADAKgABkBwIgGgGQgJgJgHgJQgHgKgHgMIgPAWQgIALgIAHIgGAGIgFABQgFAAgDgDQgDgDAAgEIABgFIAGgGQALgMAJgLQAIgLAHgOIgKgZIgJgcQgEAJgDAEQgDAEgEAAQgEAAgDgDQgDgCAAgDIAAgDIACgGQAJgWAGgYQAGgYACgYQABgFACgCQADgDAEAAQAFAAACADQADACAAAEIgBALIgDARIA2AAQAEAAACACQACADAAAEQAAAFgCACQgCADgEAAIgHAAQgBATgEATIgIAiQgFARgGANQAGALAKANQAKANALALIAEAFIABAFQgBAEgCADQgDADgFAAIgFgBgAAug0IAAACIgBADIgBADIgBAEQADARAFAQIALAdQAHgTAEgUQAFgUACgUIggAAg");
	this.shape_25.setTransform(203.225,159.725);

	this.shape_26 = new cjs.Shape();
	this.shape_26.graphics.f("#006600").s().p("AhhBxQgEAAgEgDQgDgDAAgFIABgEIAEgGIALgOIAKgSQABgDADgBIAFgCQAFAAADADQADADAAAFIgCAIIgHAMIgJAOQgGAIgEAEQgDACgDAAIgBAAgAgdBwQAAgBgBAAQAAAAgBgBQAAAAgBgBQAAAAAAgBIgBgCIgBgEIgCgRIgEgSIAAgCIAAgBQAAgEADgDQADgDAFAAQAEAAADADQACACACAGIADAOIADAPIABAKQAAAEgDADQgDACgGAAQgDAAgDgBgABbBvQgCgCgDgFIgLgUIgLgQIgCgEIAAgDQAAgEADgDQAEgDAEAAQADAAADACQADACAFAGIALARIAJAPQACAGAAADQAAAEgDADQgEADgFAAQgDAAgDgBgAAdBuQgDgCgBgFIgGgQIgEgKIgDgIIgBgDIAAgDQAAgEADgDQADgCAFgBQAEAAACADQADACADAIIAHAPIAEANIACAIQAAAEgDADQgEADgFAAQgEAAgCgCgAhjAtQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAXAAIAAgoIgcAAQgDAAgDgCQgCgDAAgEQAAgEACgCQACgDAEAAIAcAAIAAgfQgIALgFAEQgFAEgDAAQgFAAgCgDQgDgDAAgEQAAAAAAgBQAAgBAAAAQAAgBAAAAQAAgBABAAIAFgHQAKgKAIgLQAIgKAGgLQABgDADgCQACgBADAAQAEAAADACQADADAAAEQAAACgBADIgGAKICaAAQAEAAACADQACACABAEQAAAFgDACQgCACgEAAIgQAAIAAAnIAYAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAIgYAAIAAAoIATAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAgAAiAbIAcAAIAAgoIgcAAgAgLAbIAbAAIAAgoIgbAAgAg5AbIAcAAIAAgoIgcAAgAAigfIAcAAIAAgnIgcAAgAgLgfIAbAAIAAgnIgbAAgAg5gfIAcAAIAAgnIgcAAg");
	this.shape_26.setTransform(179.075,159.6786);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_26},{t:this.shape_25},{t:this.shape_24},{t:this.shape_23},{t:this.shape_22},{t:this.shape_21},{t:this.shape_20},{t:this.shape_19},{t:this.shape_18},{t:this.shape_17},{t:this.shape_16},{t:this.shape_15},{t:this.shape_14},{t:this.shape_13},{t:this.shape_12},{t:this.shape_11},{t:this.shape_10},{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape},{t:this.instance}]}).wait(28));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(39.9,25.7,609.7,282.5);


(lib.exp_text_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.KeyBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(333.55,553.35,1,1,0,0,0,12,26.8);

	this.instance_1 = new lib.KeyBase("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(95.25,464.7,1,1,0,0,0,12,26.8);

	this.instance_2 = new lib.Apple_spawn("synched",0,false);
	this.instance_2.parent = this;
	this.instance_2.setTransform(10.3,287.45,1,1,0,0,0,14,18.7);

	this.shape = new cjs.Shape();
	this.shape.graphics.f("#006600").s().p("AAVBuQgDgDAAgEIAAidIgSAAIgJAWIgJASIgIANQgEACgEAAQgEAAgDgCQgDgDAAgEIAAgEIAEgGQAMgTAIgVQAIgVAFgXQACgFACgCQACgCADAAQAFAAADADQADACAAAFIgBAGIgDAKIgCAMIBhAAQAEAAACACQADADAAAEQAAAEgDADQgCADgEAAIhBAAIAAAiIA6AAQAEAAACADQADACAAAFQAAAEgDACQgCADgEAAIg6AAIAAAiIA8AAQADAAADADQACADAAAEQAAAEgCADQgDACgDABIg8AAIAAAyQAAAEgDADQgDACgFAAQgEAAgDgCgAhJBuQgDgDAAgEIAAh7IgIAMIgIAKIgFAEIgFABQgEAAgDgDQgDgDAAgDIAAgEIAFgFQAJgMAJgPQAKgQAIgRQAIgRAFgPQACgEACgCQACgCAEAAQAEAAADADQAEACAAAEIgDAKIgGAQIgJASIAAChQAAAEgEADQgDACgEAAQgEAAgDgCg");
	this.shape.setTransform(323.5,78.675);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#006600").s().p("AAdBwQgDgCABgEIAAgxQgKAMgNALQgKALgNAIIgKAGIgGABQgFAAgDgDQgCgDAAgEIABgEIACgDIABgBIAGgDQAOgHANgLQANgKAMgMIguAAQgEgBgBgCQgCgCAAgEQAAgEACgCQABgCAEgBIA4AAIAAgJQgBgEADgCQADgCAEAAQAEAAADACQACACAAAEIAAAJIA8AAQADAAACADQACACAAAEQAAAEgCACQgCACgDABIgyAAIAPAOIATANIATAMIAFAEQACACAAADQAAAEgEADQgDADgDAAIgFgBIgHgEQgNgIgMgKQgMgLgLgNIAAAyQAAAEgCACQgDACgEAAQgEAAgDgCgAhrBuQgFgDgBgHQAAgEADgDQABgCAEAAIABAAIACAAIAGABIAGAAQAEAAABgBQACgCAAgEIAAg2IgPAEIgHABQgEAAgCgDQgCgDgBgFQABgDABgCQABgCADgBIABgBIAGgBIAGgCIAMgDIAAg6IgWAAQgDAAgCgDQgCgCgBgFQAAgEADgCQACgDADAAIAWAAIAAglQAAgEADgCQACgDAFAAQADAAADADQADACAAAEIAAAlIAVAAQADAAADADQABACABAEQgBAFgBACQgDADgDAAIgVAAIAAAzIAGgCIAFgBIAFgCIADgBQAEAAACADQACACABAEIgBAFQgCACgDABIgJAEIgNAGIAABGQABAKgGAEQgFAEgLAAQgPAAgHgCgAA4AMQgHAAgEgDQgDgEAAgGIAAgaQAAgOAOAAIAjAAQAPAAAAAOIAAAaQAAAGgEAEQgEADgHAAgAA7gXIAAASIABADIADABIAVAAIADgBIABgDIAAgSQAAgEgEAAIgVAAQgEAAAAAEgAgSAMQgIAAgDgDQgEgEAAgGIAAgaQAAgOAPAAIAhAAQAHAAAEADQADAEAAAHIAAAaQAAAGgDAEQgFADgGAAgAgPgaIgBADIAAASIABADIADABIAUAAQAEAAAAgEIAAgSQAAgEgEAAIgUAAIgDABgAAAg0QgGAAgEgEQgFgEAAgIIAAgUQAAgIAFgEQAEgEAGAAIBHAAQAIAAAEAEQAEAEAAAIIAAAUQAAAIgEAEQgEAEgIAAgAAEhYIgBAEIAAAMQAAABABAAQAAABAAAAQAAABAAAAQABABAAAAIAEABIA2AAIADgBIABgEIAAgMIgBgEIgDgBIg3AAIgEABg");
	this.shape_1.setTransform(299.65,78.625);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBQAMgBAIgBIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_2.setTransform(275.475,78.275);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#006600").s().p("AgJBqQgEgDAAgFQAAAAABgBQAAAAAAgBQAAAAAAgBQABgBAAAAIAGgFIAMgJIAQgOIAEgDIAEAAQAEAAADADQADADAAADQAAADgCAEIgMAKIgTAPQgHAEgDAAQgEAAgDgCgABlBrIgGgDIgKgJIgKgIIgIgHIgDgDIgBgFQAAgEACgDQADgCAEAAIAEAAIAEACIARAOIANAKIADAEIABAEQAAAEgDADQgDADgFAAIgCAAgAhuBiQgCgCgBgFIACgFQAAgBABAAQAAAAAAgBQABAAAAAAQABgBABAAIACgBIAHgBIAUgDIAYgGIAGgTIAGgYQABgFACgDQADgCAEAAQAFABADACQACACAAAFIgBAIIgEAPIgGAOIAEgBIAEgBIADgBIAGgBIACgBIADAAQADAAADACQADADAAAFQAAAEgDACQgCACgIACIgXAHIgbAHIgXAFIgPACQgEAAgDgEgAhXBFQgCgCgBgFIgDgNIgEgOIgBgDIAAgDQAAgEACgCQADgCAFgBQAEAAACADQACADADAIIADALIADAKIABAHQAAAEgDACQgDADgFAAQgDAAgDgCgAAUA7QgJAAgFgEQgEgFAAgIIAAhdQAAgIAEgFQAFgEAJAAIAQAAIADgLIACgKIgpAAQgDgBgCgCQgCgCAAgFQAAgDACgDQACgCADAAIBoAAQAEAAACACQACADAAADQAAAFgCACQgCACgEABIgrAAIgDAKIgDALIAeAAQAJAAAFAEQADAFAAAIIAABdQAAAIgDAFQgFAEgJAAgAAVAmQAAABAAAAQAAAAAAABQABAAAAAAQAAABAAAAQABAAAAABQAAAAABAAQAAAAABAAQAAABABAAIA1AAQABAAAAgBQABAAAAAAQABAAAAAAQAAgBABAAIABgDIAAgSIg/AAgAAVAFIA/AAIAAgUIg/AAgAAWgzQAAABAAAAQAAABgBAAQAAABAAAAQAAAAAAABIAAAQIA/AAIAAgQIgBgEQgBAAAAAAQAAAAgBgBQAAAAgBAAQAAAAgBAAIg1AAQgBAAAAAAQgBAAAAAAQgBABAAAAQAAAAgBAAgAhYALQgJAAgEgEQgEgFAAgHIAAgrQAAgJADgFQAFgDAJAAIA5AAQAJgBAEAFQAEAEAAAJIAAArQAAAHgEAFQgFAEgIAAgAhWgvIgBACIAAAkIABACIADABIAvAAQAAAAABAAQABAAAAAAQABgBAAAAQAAgBAAgBIAAgkQAAAAAAgBQAAgBgBAAQAAgBgBAAQgBAAAAAAIgvAAIgDABgAhphZQgEAAgCgCQgCgDAAgEQAAgFACgCQACgCAEAAIBXAAQACAAADACQACADAAAEQAAAEgCACQgDACgCABg");
	this.shape_3.setTransform(251.75,79.25);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_4.setTransform(227.525,78.925);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#006600").s().p("AgzBnIgSgBIgLgCQgIgDgDgFQgFgHAAgJIAAikQAAgEAEgDQADgDAFAAQAEAAAEADQADADAAAEIAABKIAngKIAlgNQATgHANgGIgMgSQgDgGgBgDQABgDACgDQACgCAEAAQABAAAAAAQABAAAAAAQABAAAAAAQABABAAAAIAEAFIAGAJIAIAMIAIAMIAFAIIACADIABADQAAAEgDABQgCADgEAAIgDAAIgCgDIgEgEIgiAMIgpAOIguALIAABBIABAFIABACQACACALAAIAeACIAcgBIAbgCIATgDIAGgCIAFgHIAGgFQACgBADAAQAFABAEADQADADAAAGQAAAGgHAGQgGAHgJADIgOADIgUACIgYACIgbAAIgYAAgABUgqQgCgBgDgFIgJgMIgQgYQgEgHAAgDQAAgDADgDQACgCADAAQABAAAAAAQABAAAAAAQABABAAAAQABAAAAAAQACABACAFIASAbIAKAMIACAEIABADQgBADgCADQgCACgEAAIgEgBg");
	this.shape_5.setTransform(204.8,78.3);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#006600").s().p("ABRBaQgGgEgFgFIgVgZIgXgfIgZgfIgVgeIgPgXIgCgCIgBAAIgBAAIgBACIgFAPIgJAWIgJAVIgIAOQgEAGgFAEQgFAEgFAAQgFAAgDgEQgEgDAAgGIABgFQACgDACgBIAEgDIAEgFIAIgPIAJgTIAJgUIAHgSQAFgJADgEQAFgFAEAAQAEAAADACQAEACADADIACADIADAGIAKAQIATAcIAaAiIAbAhIAWAaQAJAKAEACQADABABADQACACgBAEQAAAFgDADQgDAEgEAAQgFAAgGgEg");
	this.shape_6.setTransform(179.75,79.475);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#006600").s().p("AAeBcIgUgGIgSgHQgWgKgLgOQgLgNAAgQQAAgMAKgPQALgQATgSQASgSAagSIgnABIgsAAIgrABQgEAAgDgDQgDgDAAgFQAAgDACgCIAEgEIADgBIAFAAIAZAAIAlAAIAlgBIAkgBIAcgBIARgBIACAAQADABADADQADADAAADQAAAEgDADQgCAEgDAAIgGAAIgJABIgIAAQgUALgSAOQgSAOgOANQgNAOgIALQgIAMAAAIQgBAPARALQAQALAkAJIADABIADAAIABAAIADgBIACAAIACAAQAEAAADADQADADAAAFQAAAGgEADQgFAEgJAAIgPgDgAA/AfIgGgGIgLgPQgLgNgEgHQgFgGAAgCQAAgEADgCQACgDAEAAIAEABIAEAFIAGAJIAJAMIAJALIAGAHIACADIABACQgBAEgCACQgDADgDAAIgBAAIgDgBgABdAKIgGgGIgLgNIgQgVQgEgHAAgCQAAgDACgDQADgCADgBQABAAAAAAQABAAAAABQABAAAAAAQABAAAAABIAEAEIAIAMIAMAPIAKAMIACADIABADQAAADgDADQgCACgDAAIgBAAIgDgBg");
	this.shape_7.setTransform(195.7833,36.975);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.f("#006600").s().p("AgZAMIgVAAIgWAAIgQAAIgJgBQgEAAgCgEQgCgDAAgEQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADADAAAFQAAADgCADQgDAEgEAAIgJABIgWAAIgdABIgfAAIgbAAg");
	this.shape_8.setTransform(171.825,35.65);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.f("#006600").s().p("AAfBpIgEgEIgBgBIgBgEIgDgLIgGgPIgIgVIgEgNIgvAPIgkAMIgCAAIgBAAQgEAAgEgDQgCgEAAgEIABgFQAAgBAAAAQAAgBAAAAQABgBAAAAQABAAAAAAIACgCIAFgBIAIgDIANgEIAPgEIAfgKIAOgEIgEgJIgDgHIgDgLIgEgHIgCgIIgkAKIgbAHIgMADQgEgBgDgDQgCgDAAgEQgBgEACgDIADgEIADAAIAEgBIALgCIARgFIATgEIATgFIgBgEIgCgGIgCgEIgGgQIgCgIIgDgHIgCgEIAAgBQAAgFAEgDQADgCAGAAQADgBACACQADACACAFIAHAUIAFANIAFAMIASgFIAXgHIAWgHIANgEIADgBIACgBQAEABADADQADADAAAFQAAADgBADQgCACgDABIgMAEIgUAGIgYAHIgXAGIAIAYIAHASIARgFIAdgIIASgFIAIgCIACAAQAEAAACADQADADABAFQAAACgCACIgDADIgBABIgFACIgQAEIgYAHIgaAIIAHATIADALIADAIIADAJIACAIIACAGIABADIAAADQAAAFgDADQgDADgFAAQgDAAgCgCg");
	this.shape_9.setTransform(147.75,36.345);

	this.instance_3 = new lib.wasd();
	this.instance_3.parent = this;
	this.instance_3.setTransform(8,9);

	this.shape_10 = new cjs.Shape();
	this.shape_10.graphics.f("#006600").s().p("AAeBcIgUgGIgSgHQgWgKgLgOQgLgNAAgQQAAgMAKgPQALgQATgSQASgSAagSIgnABIgsAAIgrABQgEAAgDgDQgDgDAAgFQAAgDACgCIAEgEIADgBIAFAAIAZAAIAlAAIAlgBIAkgBIAcgBIARgBIACAAQADABADADQADADAAADQAAAEgDADQgCAEgDAAIgGAAIgJABIgIAAQgUALgSAOQgSAOgOANQgNAOgIALQgIAMAAAIQgBAPARALQAQALAkAJIADABIADAAIABAAIADgBIACAAIACAAQAEAAADADQADADAAAFQAAAGgEADQgFAEgJAAIgPgDgAA/AfIgGgGIgLgPQgLgNgEgHQgFgGAAgCQAAgEADgCQACgDAEAAIAEABIAEAFIAGAJIAJAMIAJALIAGAHIACADIABACQgBAEgCACQgDADgDAAIgBAAIgDgBgABdAKIgGgGIgLgNIgQgVQgEgHAAgCQAAgDACgDQADgCADgBQABAAAAAAQABAAAAABQABAAAAAAQABAAAAABIAEAEIAIAMIAMAPIAKAMIACADIABADQAAADgDADQgCACgDAAIgBAAIgDgBg");
	this.shape_10.setTransform(109.7333,395.375);

	this.shape_11 = new cjs.Shape();
	this.shape_11.graphics.f("#006600").s().p("AgkBqQgFAAgDgDQgDgDAAgGQgBgFACgBQACgCAGgDQAVgIAOgIQAMgIALgJQAIgIAEgIQAFgHACgLQABgKABgQQgBgXgBgWQgBgVgDgRIAAgBIAAgCQAAgEAEgDQADgDAGAAQAEAAADADQADADABAEIABAPIABAYIABAbIABAXQAAASgDAOQgDAMgHALQgHALgNAMIgNAJIgRALIgWALIgHADIgEABIgDAAgAg1AQIgEgFIgDgRQgCgKAAgMIAAgRIADgRIACgQIAAgEIAAgCIAAgDIAAgDIAAgBIAAgBQAAgEADgDQAEgCAFAAQAGgBACAFQADAFABAIIAAAEIgCAHIgCARIgBARIAAAOIAAAPIACAKIABAEIAAACQAAAGgDADQgDADgGAAIgGgCg");
	this.shape_11.setTransform(85.85,394.8);

	this.shape_12 = new cjs.Shape();
	this.shape_12.graphics.f("#006600").s().p("AhnBnQgDgEAAgEIAAgDIADgEIAHgHIAXgXIAXgaIAUgaQAJgMAFgKIACgEIACgIIACgPIgRAAIggAAIgWAAIgLAAIAAAAQgEAAgDgDQgDgDAAgEQAAgFADgDQADgDAEAAIADAAIACABIAHAAIAMAAIAhAAIAbAAIABgNIAAgKIAAgJQAAgFADgDQADgCADAAQADAAADABIADAEIABADIABAEIgBAKIgBAQIAAAEIAQAAIAYAAIANgBIAIAAIAHAAIALgBIAGAAQAEAAACABQADABABADIABACIAAADQAAAFgEADQgDADgGgBIgMABIgbABIgLAAIgPAAIgUAAIgBAPIgCAJIgCAHIAHgBIAIgBQANAAANAGQAMAFAIAJIAFAFQAAABAAAAQAAABABAAQAAABAAAAQAAABAAAAQgBAFgDAEQgDADgFAAQgBAAAAAAQgBAAAAAAQgBAAAAAAQgBgBAAAAIgEgEQgGgIgIgFQgIgEgJAAQgHAAgJACQgHACgIAEIgmAvQgTAXgQAQIgGAGIgFABQgEAAgEgDgAAZBlQgKgFgHgKIgIgMQgDgGAAgEQAAgEADgDQACgDAFAAIAEABIAEADIABABIABADQAFAKAHAGQAHAGAHABQAGgBAGgEQAIgEAHgIQAGgIAGgKIADgDIAFgBQAFAAADADQAEADgBAFQAAADgCAFIgIALIgLAMQgJAJgKAEQgJAFgJAAQgKAAgIgFg");
	this.shape_12.setTransform(61.6,394.675);

	this.shape_13 = new cjs.Shape();
	this.shape_13.graphics.f("#006600").s().p("AhYBrQgEAAgDgDQgCgDAAgEQAAgEACgDQADgDAEAAICeAAQADAAABgBQABgBAAAAQAAgBABAAQAAgBAAAAQAAgBAAgBIAAgcIifAAQgDgBgDgCQgCgDAAgEQAAgEACgDQADgCADAAICfAAIAAgbQAAgBAAgBQAAAAAAgBQgBAAAAgBQAAAAgBgBQgBgBgDAAIieAAQgDAAgDgCQgCgDAAgEQAAgEACgDQADgDADAAIBRAAIAAhOQAAgFADgCQADgDADAAQAFAAAEADQACACAAAFIAABOIBAAAQALAAAFAFQAFAFAAAKIAABUQAAALgFAFQgFAFgLAAgAAxghQgDgDAAgFQgBgBAAAAQAAgBAAAAQAAgBABAAQAAAAAAgBIAEgGIAMgRIANgWQACgDADgCQACgCADAAQAFABADADQAEADAAAFQAAADgFAKIgOAWIgJANQgDAEgDACQgDABgDAAQgFAAgDgDgAg5gfIgEgDIgBgBIgCgEIgXglIgBgFIgBgEQAAgEADgDQADgDAFAAQAEAAACABIAFAHIAVAgQAGALAAADQAAAFgDADQgEADgFAAIgFgBg");
	this.shape_13.setTransform(37.65,394.375);

	this.shape_14 = new cjs.Shape();
	this.shape_14.graphics.f("#006600").s().p("AAVBuQgDgDAAgEIAAgoIgZAAQgDAAgDgDQgCgDAAgEQAAgEACgCQACgDAEAAIAaAAIAAhIQgGARgIAQQgGARgKAPQgIAPgKALQgGAHgDACQgCACgDAAQgEAAgDgEQgDgDgBgEIABgEIADgEQAMgMALgRQAMgQAKgSQAJgTAIgUIg1AAQgEAAgCgDQgDgDABgEQgBgEADgDQACgCAEgBIA7AAIAAgjQAAgEADgDQADgCAFAAQAEAAADACQACADABAEIAAAjIBAAAQADAAADADQACADAAAEQAAAEgCADQgDADgDAAIg5AAIABADQAHAOAKARQAJAQANAQQAMARAMAOIADAEIABAEQAAAFgDADQgEAEgEAAQgCAAgDgCIgGgHQgRgUgNgXQgNgWgLgbIAABLIAdAAQAEAAACACQACADAAAEQAAAFgCACQgCADgEAAIgcAAIAAAoQgBAEgCADQgDACgEAAQgFAAgDgCgAhMBuQgCgCAAgEIAAh8QgKAPgGAGQgFAGgEAAQgEAAgDgDQgDgDAAgDIABgEIADgGQAKgNAJgPQAJgPAHgRQAIgQAGgQQABgHAIAAQAEAAADACQADADAAAEIgCAJIgGAQIgJAUIAAChQAAAEgDACQgDACgEAAQgFAAgDgCg");
	this.shape_14.setTransform(13.95,394.775);

	this.shape_15 = new cjs.Shape();
	this.shape_15.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_15.setTransform(834.825,554.775);

	this.shape_16 = new cjs.Shape();
	this.shape_16.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_16.setTransform(818.725,554.775);

	this.shape_17 = new cjs.Shape();
	this.shape_17.graphics.f("#006600").s().p("AAwBrIgEgEIgFgGIgDgFIgGgEIgRgPIgWgTIgkgdIgDgDIgEgDIgGgGQgFAAgDgCQgEgEAAgFIACgGIAFgFIABgBIADgDIAHgEQASgMAYgSQAWgSAdgZIAFgFIACgGQABgDADgCQACgBAEAAQAGAAADADQAEADAAAGQAAAFgDAEQgCAFgHAFIgUAQIgbAVIgbAWIgZARIANALIAsAjIAcAXIAOANQAEAEABAEIABAFQAAAFgDAEQgEAEgFAAIgFgBg");
	this.shape_17.setTransform(798.975,555.15);

	this.shape_18 = new cjs.Shape();
	this.shape_18.graphics.f("#006600").s().p("AhkBpQgEgDAAgDIAAi8QAAgJAFgEQAFgFAJAAIA6AAQAJAAAEAFQAFADAAAJIAAAqQAAAJgFAEQgEAFgJAAIg4AAIAACBQgBADgCADQgDADgFAAQgEAAgCgDgAhTgtIAxAAQABAAABAAQAAAAABAAQAAgBABAAQAAAAABAAIABgEIAAgMIg3AAgAhShaIgBADIAAALIA3AAIAAgLIgBgDQgBgBAAAAQgBAAAAgBQgBAAAAAAQgBAAgBAAIgsAAQgBAAAAAAQgBAAgBAAQAAABAAAAQgBAAAAABgAA5BqQgHgBgDgDQgCgDAAgEQAAgFADgCQADgDAEgBIACAAIADABIAHABIAIAAQAFABACgDQACgBAAgFIAAhsIg5AAQgJAAgFgFQgEgEAAgJIAAgqQAAgJAEgEQAEgEAKAAIA8AAQAIAAAFAFQAFAEAAAJIAACtQAAAIgCAEQgBAFgEACQgDACgFABIgQABIgRgBgAAcgyIABAEQAAAAABAAQAAAAABABQAAAAABAAQAAAAABAAIAzAAIAAgRIg4AAgAAdhaIgBADIAAALIA4AAIAAgLQAAgBAAAAQAAgBAAAAQAAgBAAAAQgBAAAAAAQAAgBgBAAQAAAAAAgBQgBAAAAAAQgBAAAAAAIgvAAQgBAAAAAAQgBAAAAAAQgBABAAAAQgBAAAAABgAg+BkQgDgDAAgEIABgEIAFgFQAKgHAFgJQAGgKACgMIgdAAQgDABgCgDQgCgDAAgDQAAgEACgCQACgCADgBIAeAAIAAgdIgYAAQgCAAgCgCQgCgDAAgEQAAgCACgDQACgCACAAIB1AAQAEAAABACQACACAAAEQAAAEgCACQgBACgEAAIgVAAIAAAdIAbAAQADABACACQACADAAADQAAADgCADQgCADgDgBIgbAAIAAAwQgBADgCADQgDACgEAAQgEAAgDgCQgCgDAAgDIAAgwIgjAAQgCALgCAHQgCAIgEAHIgJAMQgFAFgFADQgGAEgDAAQgEAAgDgDgAgRAdIAjAAIAAgdIgjAAg");
	this.shape_18.setTransform(775.3,555.35);

	this.shape_19 = new cjs.Shape();
	this.shape_19.graphics.f("#006600").s().p("AgcBqQgJgFgJgJIgGgGIgBgGQAAgFADgDQADgEAFAAIAEABIAFAFIALAKQAGAEAEAAQACAAADgCQACgDABgEQACgGABgLIABgYIABgbIAAgLIgBgNIAAgJIgBgCIgBgBIgCAAIgCABIgHAAIgMABIgLAAIgFAeQgCANgEAKQgDALgFAIQgHANgJAMQgJANgMALIgFAFIgFABQgFAAgEgDQgDgEAAgFQAAgDACgDIAHgIQAJgHAIgLQAIgKAGgLQAHgLACgJIAFgSIADgXIgGAAIgRABIgJAAIgEAAIgBAAQgGAAgDgDQgDgCAAgFQAAgGADgDQADgDAGAAIAYABIAHAAIAIgBIABgUIABgWQAAgHADgDQADgDAFAAQAFAAADADQADACAAAFIgBAJIgBAQIgBAUIAMgBIAJAAIALgBIADgBIADAAQAGAAAEADQAEACABAFIACAMIABASIABAWQAAAWgCATQgCASgDAMQgEALgHAGQgFAGgKAAQgJAAgJgEgABPAjIgKgLQgJgLgIgNIgQgXIgKgUQgEgJAAgEQAAgEACgDQADgDAFAAIAFABIAEAEIABABIACAGIANAYIARAZIASAWIADAEIABAFQAAAFgDADQgDADgFAAIgBAAQgDAAgCgCgABOghIgGgGIgLgOIgPgVQgFgHAAgCQABgDACgDQACgCAEAAIAEABIAEAFIAFAIIAJALIAJAMIAHAJIACACIAAADQAAADgCADQgDADgDAAIgEgCgABngzIgGgGIgLgOIgQgVQgEgHAAgCQAAgDADgDQACgCAEAAIAEABIADAFIAGAHIAIAMIAJAMIAIAJIACACIAAADQAAADgDADQgCADgDAAIgBAAIgDgCg");
	this.shape_19.setTransform(751.625,554.325);

	this.shape_20 = new cjs.Shape();
	this.shape_20.graphics.f("#006600").s().p("Ag5BqQgDgDAAgEQAAgBAAAAQAAgBAAgBQABAAAAgBQAAAAABgBIACgDIACgBIAFgBQAKgDAIgGQAIgFAFgHIgLACIgMADIgLABIgIABQgEAAgCgCQgCgDAAgEQgBgDACgCQABgCADgBIACgBIADAAIAKgBIANgBIANgCIAJgCIABgFIAAgHIgsAAQgDAAgCgCQgCgCAAgEQAAgDACgCQACgCADAAIAsAAIAAgPIguAAQgDAAgCgDQgCgCAAgEQAAgCACgCQACgCADgBIAuAAIAAgQIg4AAQAAAbgCAYQgDAYgEAQIgGASIgHAPQgBADgDABQgCACgDAAQgEAAgEgDQgDgDgBgEIABgDIABgDQAIgOAEgRQAEgQACgWQACgWABgcIAAgeQgBgJAEgEQAFgFAKAAICZAAQAIAAAEAEQAEAEAAAIIAAAVQAAAQgQAAIggAAIAAAQIAyAAQADABACACQACACAAADQAAADgCADQgCACgDAAIgyAAIAAARIAuAAQAEAAACACIABAGIgBAFQgCACgEABIguAAIAAARIA1AAQADAAACACQACADAAAEQAAADgCADQgCACgDAAIg1AAIAAAYQAAAEgCACQgEACgEAAQgEAAgDgCQgCgCAAgEIAAh7IgZAAIAAA5QAAASgDAMQgEAMgFAIQgIAIgIAGQgKAGgKADIgFABIgDABQgFAAgDgDgAhDg6QAAABgBAAQAAAAAAABQAAAAAAABQAAAAAAABIAAAOICPAAIACgBQAAAAABAAQAAgBAAAAQAAAAAAgBQAAAAAAgBIAAgLQAAAAAAgBQAAAAAAgBQAAAAAAAAQgBgBAAAAIgCgBIiLAAIgDABgAhghaQgEAAgCgCQgDgDABgEQAAgEABgCQADgCAEgBIDHAAQAEAAACADQACACABAEQgBAEgCADQgCACgEAAg");
	this.shape_20.setTransform(727.2,555.425);

	this.shape_21 = new cjs.Shape();
	this.shape_21.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_21.setTransform(703.225,555.125);

	this.shape_22 = new cjs.Shape();
	this.shape_22.graphics.f("#006600").s().p("ABPBXQgGgDgFgFIgRgVIgXgdIgXgfIgWgeIgQgXIgCgEIgBgBIgBABIgBADIgHAQIgIAUIgJATIgIAOQgDAFgFAEQgFAEgFAAQgEAAgEgEQgDgDAAgFIABgFIAEgDIADgEIAEgEIAIgPIAJgTIAKgUIAIgTQACgHAFgEQAEgEAFAAQADAAAEACIAGAGIACADIACAEIAGAJIAVAgIAaAjIAbAiQAMAQAMAMIABABIABABIADADIAFACIADAEQACACgBAEQAAAFgCADQgEADgEAAQgEAAgGgEg");
	this.shape_22.setTransform(679.2,555.625);

	this.shape_23 = new cjs.Shape();
	this.shape_23.graphics.f("#006600").s().p("AhJBsQgEgDAAgGQAAgGAEgDQAEgDAFAAIABAAQAGAAAKgEQALgFAMgIIAYgSQAMgLAKgLIAMgPIANgTQAGgKADgHQABgDADgCQACgCAEAAQAEAAAEADQADADAAAFQAAAEgFAJIgNAVIgRAXIgQASQgKAKgMAIQgKAJgNAIQgMAIgLAFIgJAEIgJAAQgJAAgEgCgAgXADIgSAAIgWgCIgTgBIgPgCQgEgBgCgDQgCgDAAgEQAAgEADgEQADgDAEAAIACAAIAFABIATADIAYACIAXABQAGAAADACQAEADAAAGIgCAFIgEADIgDABIgFAAgAA+goIgGgGIgOgQIgKgOIgFgGIgBgEQAAgEACgBQADgDADAAQAAAAABAAQABAAAAAAQABAAAAAAQAAABABAAIAEAFIAIAJIALAOIALANIACACIABACQgBAEgCACQgDADgDAAIgEgBgAgdg2IgVgDIgVgEIgSgEIgDgBIgCgBQgDgBgBgCQgCgDAAgEQAAgEADgEQAEgDAEAAIACAAIAFACIAUAFIAZAEIAYACQAGABADADQADACAAAGQAAAEgDADQgEACgFABIgQgBgABeg2IgDgEIgNgOIgLgOIgHgJIgDgDQAAgBAAAAQAAAAAAgBQAAAAAAAAQAAgBAAAAQAAgDACgDQADgCADAAIAEABIAEAEIAPASIAPARQADADAAADQAAADgDADQgCADgEAAIgDAAg");
	this.shape_23.setTransform(656.175,554.25);

	this.shape_24 = new cjs.Shape();
	this.shape_24.graphics.f("#006600").s().p("AgZAMIgVAAIgWAAIgQAAIgJgBQgEgBgCgDQgCgDAAgEQAAgEADgEQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAAEgCACQgDADgEABIgJAAIgWABIgdABIgfAAIgbAAg");
	this.shape_24.setTransform(631.125,554.2);

	this.shape_25 = new cjs.Shape();
	this.shape_25.graphics.f("#006600").s().p("Ag1BhQgDgDAAgFQgBgEACgDQACgCAGgDQAPgJAKgIQAJgIAEgJQAEgIAAgLIAAgdIgOABIghAAIgOABIgNAAIgGAAIgGAAQAAAAAAgBQgBAAAAAAQgBAAAAgBQgBAAAAgBIgCgDIgBgEIACgGIADgEIADgBIAHAAIAGAAIARAAIANAAIAPAAIALAAIALAAIAQgBIAZgBIAmgCIADAAIAEAAIANABQAEABACADIABADIABADQAAAEgCADQgCADgDABIgBAAIgDAAIgHAAIgQAAIglABIgMAAIAAAdQAAAKgBAIQgBAIgDAGQgDAGgGAFQgFAIgKAIQgKAIgIAFQgJAFgFAAQgEAAgDgEgAg9hPQgDgDAAgFQAAgDABgCQACgDADgBIACgBIADAAIAqgBIAlgBIAcgBIABAAQADAAADADQADADAAAEQAAAEgCADQgDADgEABIgSABIgcABIgfAAIggABQgEAAgDgDg");
	this.shape_25.setTransform(607.3,555.425);

	this.shape_26 = new cjs.Shape();
	this.shape_26.graphics.f("#006600").s().p("AhcBgQgDgEAAgFIABgEIACgDIABgBIAGgEQASgLARgMQARgNANgOQAOgNAJgNQAKgMAHgNIANgZQAGgMADgLIgXACIgaAAIgcABIgYAAQgFAAgDgCQgDgDABgFQgBgEACgDQACgDADgBIACAAIAEAAIAKAAIAkAAIAhgBIAagBIAFgDIAFgBQAFAAAEADQADAEAAAGIgCAHIgDAKIgJASQgKAVgKARQgLARgMAPIAeAUIAZARIAXARQAFAFAAAGQAAAFgDAEQgEADgFABIgEgBIgEgDIgSgPIgbgUIgggXIgZAYIgYAUIgVAOQgJAFgEAAQgFAAgDgDg");
	this.shape_26.setTransform(583.3,555.325);

	this.shape_27 = new cjs.Shape();
	this.shape_27.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_27.setTransform(559.225,555.125);

	this.shape_28 = new cjs.Shape();
	this.shape_28.graphics.f("#006600").s().p("Ag5BtQgDgDAAgFIABgEIADgEIABgBIAFgCQAigZAQgfQAQghAAgsIAAgLIgWAAIgHAUIgHAQIgIANIgFAGQgDACgEgBQgEAAgDgCQgDgDAAgEIABgDIADgGQALgTAJgUQAIgWAFgXQABgGACgCQADgDAEAAQAEAAADADQADACAAAFIgBAGIgDALIgDALIBbAAQAHgBAEAEQAEADABAHQgBAFgDALQgEAMgGAOIgIAQQgDAEgDACQgDADgDAAQgFAAgDgEQgDgCAAgDIAAgEIADgFIAIgPIAHgQIADgKQAAAAAAAAQAAgBAAAAQAAAAgBAAQAAgBAAAAIgDAAIgrAAIAAAKQAAAsARAhQARAhAiAYQAEACABACQACADAAADQgBAEgDAEQgDADgFAAIgFgBIgGgEQgXgQgQgYQgPgYgHgfQgFAZgMATQgKAUgSARQgKAKgIAFQgIAFgFAAQgFAAgDgDgAhiBsQgFAAgDgDQgDgEAAgEIAAgFIAEgGQAIgNAJgSIAQgmQACgFACgCQADgCADAAQAFAAAEACQADADAAAFIgDAKIgGARIgJAVIgIARQgIAOgEAGQgFAFgEAAIgBAAgAhHglQgDgCgDgFIgHgKIgJgOIgIgLIgCgEIgBgEQAAgEAEgEQADgDAEABIAFAAQACACAEAEIALAOIANAVQAEAGAAAEQAAAEgEAEQgDADgFAAQgDAAgCgCg");
	this.shape_28.setTransform(535.4917,554.8);

	this.shape_29 = new cjs.Shape();
	this.shape_29.graphics.f("#006600").s().p("AgQBjQgQAAgKgCQgJgBgFgCQgJgEgFgGQgFgHAAgJQAAgGAEgHQADgIAHgHIAcgYIAegYIgfgWIgbgWIgTgRIgHgJQgCgFAAgDQAAgGADgDQADgEAFAAQAEAAACACIAEAEQAEAIAKAKQAKAKAQANIAoAeIANgKIALgIIALgIIADgDIAEgDIAHgGIAFgHIADgCIAFgBQAFAAADADQAEADAAAGQAAAFgFAFQgFAHgMAIIgcAUIgfAXIgbAXIgUATIgHAIQgCADAAADQAAAEADACQADACAHACIAVABIAiABIAZAAIAQgBIAJgBIAFgDIAEgCIADAAQAFAAADADQADADAAAFQAAADgCADQgCAEgDACQgFACgHABIgSACIgeABIgngBg");
	this.shape_29.setTransform(510.625,554.85);

	this.shape_30 = new cjs.Shape();
	this.shape_30.graphics.f("#006600").s().p("AguBcQgNgIAAgPQAAgQARgNQARgNAfgHIgPgKIgTgMIgGgFQgBgDAAgDQAAgEACgEQADgEAEgEIAYgUIAngdIgBAAIgXABIgZAAIgZABIgUABQgJAAgDgCQgEgDABgFQgBgGADgDQADgCAGAAIACAAIAFAAIAGABIAIAAIAvgBIArgDIADAAIABAAQAHAAAFAEQAFACAAAGIgBAEIgDAFIgCABIgGAEIgRAPIgVAQIgTAQIgNALIAPALQAIAFAOAGQARAKALAHQAKAIAFAGQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAFgIAIQgIAHAAAGQAAAGAGADQAGACAPAAQAQAAANgDQANgEAIgGQAIgHAAgIQAAgEgFgEQgEgEgKgHQgVAFgOAFg");
	this.shape_30.setTransform(486.8737,555.4);

	this.shape_31 = new cjs.Shape();
	this.shape_31.graphics.f("#006600").s().p("AAGBkQgDgDgBgFIABgEIAEgEIACgBIAEgCQAOgFANgIQANgJAKgJQAJgLAEgLQAEgLABgOQAAgPgJgMQgIgLgRgJQgNAdgPAWQgPAYgOARQgPARgPAJQgOAKgNAAQgIAAgFgEQgGgDgFgHQgEgHgDgKQgDgKAAgKQAAgXAMgUQAOgVAZgRIgFgRIgFgPIgBgJQAAgEADgDQADgDAFAAQAEAAADACQACACABAGIACAIIADAMIADAMQANgGAMgCQALgCANAAIAHAAIAKABIAGgQIAFgMQABgFACgCQACgCAEAAQAFAAADADQADADAAAFIgCALIgIAVQAWAKANAQQAMARAAATQAAAVgIARQgHAQgPAOIgPAMIgRALIgPAIQgIADgEAAQgEAAgDgEgAhHgBQgJAPAAASQAAANAFAIQAFAIAGABQAFAAAHgEIAQgNQAIgHAJgKIgNgbIgMgfQgSANgJAQgAgEgvQgKACgMAFIAJAbIALAXIAQgaQAIgOAJgSIgGgBIgDAAQgMAAgKACg");
	this.shape_31.setTransform(463,555);

	this.shape_32 = new cjs.Shape();
	this.shape_32.graphics.f("#006600").s().p("AgGBxQgDgCAAgFIAAgyQgNAOgRAMQgRALgTAJIgPAFQgFACgDAAQgEAAgDgDQgDgDAAgFQAAgBAAAAQAAgBAAAAQABgBAAAAQAAgBABAAIADgEIABgBIACAAIAHgCQALgEAMgFQAMgGAMgIQAMgIAKgIIhOAAQgDgBgCgCQgCgDgBgEQAAgDACgDQADgCADAAIBdAAIAAgQIg6AAQgKAAgFgFQgFgEABgJIAAgtIgLALQgEADgDAAQgEAAgDgDQgCgDAAgEIABgEIAEgFIAPgQIAOgTIAMgTQACgDACgBQADgBADAAQADAAADACQADADAAAEIgBAFIgIAMIA0AAIAFgIIAGgMIAEgEIAFgCQAFAAADACQADADAAAEQAAACgDAEIgIALIBPAAQADAAACACQACACAAADQAAAEgCACQgCACgDABIhTAAIAAANIBLAAQADAAACABQACADAAAEQAAADgCACQgCACgDAAIhLAAIAAANIBLAAQADAAACABQACACAAAEQAAADgCACQgCADgDAAIhLAAIAAANIBWAAQADABACABQABACAAAEQAAADgBADQgCACgDAAIhWAAIAAAQIBeAAQADAAADACQACADAAAEQAAAEgCACQgDACgDABIhQAAQALAHANAIQANAHAPAHQAOAFAOAEQAFACACACQADADgBADQAAAFgCADQgDADgFAAIgEgBIgIgCQgYgIgTgLQgUgMgSgTIAAA0QAAAFgDACQgDABgEAAQgFAAgCgBgAhCgGIABADIAEABIA0AAIAAgNIg5AAgAhCgeIA5AAIAAgNIg5AAgAhBhGIgBAEIAAAIIA5AAIAAgNIg0AAIgEABg");
	this.shape_32.setTransform(439.2,554.75);

	this.shape_33 = new cjs.Shape();
	this.shape_33.graphics.f("#006600").s().p("AgfBVQgDgDAAgFIABgFIADgEIACgBIAEgCQAygRAZgYQAYgYAAgiQAAgJgDgHQgDgGgFgEIgJgEIgLgDIgQAAIgYAAIgcACIgfABIgdADIgCAAIgBAAQgEAAgDgDQgCgDAAgEIABgHQABgCADgBIADgBIAIAAIAFgBIAKAAIAigDIAigBIAdgBQAhAAAQAOQAQANAAAbQAAAcgMAVQgNAWgZASIgSALIgVALIgTAIQgJAEgDAAQgFgBgDgDg");
	this.shape_33.setTransform(414.951,555.7);

	this.shape_34 = new cjs.Shape();
	this.shape_34.graphics.f("#006600").s().p("AAHBmQgDgCgBgEIgBAAIAAgBIABgsIgQAAIgKAAIgHAAIgGABIgYAAIgOABQgHAAgFgEQgEgDAAgGQAAAAAAgBQAAgBAAAAQAAgBAAAAQABgBAAAAIADgGIAIgMQAQgVASgdQASgeAUgkIAEgEIAEgBQAFAAADADQADADAAAFIAAACIgBADIgEAGIgJARIgfA0IgdAsIANgBIALAAIASAAIALAAIALAAIABg6QABgEADgDQADgDAFAAQAEAAACACQADACABAEIAAABIAAABIgBA6IASAAIAUAAIAJgBIAGAAIAFAAIADABQACABACADIABAFQAAAEgCACQgBADgDACIgCAAIgEAAIgIAAIgQAAIgPABIgPAAIgBArQAAAEgDACQgEADgEAAQgDAAgDgCg");
	this.shape_34.setTransform(393.7167,554.875);

	this.shape_35 = new cjs.Shape();
	this.shape_35.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_35.setTransform(371.475,554.475);

	this.shape_36 = new cjs.Shape();
	this.shape_36.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_36.setTransform(264.875,465.975);

	this.shape_37 = new cjs.Shape();
	this.shape_37.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_37.setTransform(248.775,465.975);

	this.shape_38 = new cjs.Shape();
	this.shape_38.graphics.f("#006600").s().p("AgXBlQgEgDAAgFQAAgEACgCQABgDAFgCQAOgFAJgGQAJgGAHgHQAKgLAFgNQAGgNgBgOQABgQgKgKQgLgKgRAAQgJAAgIAEQgJADgGAGQgEAGgBAGQAAAGgDAEQgDADgGAAQgFAAgDgDQgDgEAAgGQABgMAIgKQAIgKAPgHQAOgGAPgBQARABANAHQAOAHAIANQAHANAAAQQAAAbgOAXQgPAWgdARIgLAGQgHADgCAAQgFAAgDgEgAgyhMIgTgCQgGAAgBgDQgDgCAAgEQAAgGADgDQADgDAFAAIABAAIACAAIAHABIASACIAYAAQAXAAAVgBQAUgCASgEIACAAIABgBQAFAAADADQADADAAAFQAAAFgDACQgCADgFABIgRADIgYACIgbABIgbABIgZgBg");
	this.shape_38.setTransform(229.05,466.525);

	this.shape_39 = new cjs.Shape();
	this.shape_39.graphics.f("#006600").s().p("AhMBgQgLgIgBgOQABgNAIgMQAJgKAOgHQAOgGARAAIAHAAIAHABIAAgMIgBgqIgBgiIgBgWIABgMIABgEQABgBAAAAQAAAAABgBQAAAAABAAQAAgBABAAQACgBADgBQADABACABQADACABACIAAADIABAJIAAAJIAAAUIAAAHIAWgDIAXgEIAVgFIACgBIADAAQAEAAACADQADAEAAAEQAAAEgCADQgBACgEABIgVAGIgbAEIgZADIABAPIABAbIABAUIAEACIABABIADACIAGADIAiAWIAXANQAEABACAEQACACAAADQAAAGgDADQgDAEgEAAQgFgBgPgIIgrgdQgCANgFAJQgFAIgJAFQgIAFgLABQgKACgMAAQgTABgLgJgAgtAyQgJAEgGAFQgFAGAAAHQAAAFAFAEQAFACAKAAQAWABAJgIQAKgIAAgRIAAgBIAAgBIAAgBIgJgBIgMAAQgLAAgJADg");
	this.shape_39.setTransform(205.275,465.95);

	this.shape_40 = new cjs.Shape();
	this.shape_40.graphics.f("#006600").s().p("AAGBlQgEgEAAgFIACgFIADgDIABgBIAFgCQAPgFANgJQAMgIAJgKQAKgKAEgLQAEgLAAgOQAAgPgIgMQgIgMgRgHQgNAcgPAWQgOAYgPARQgQARgOAKQgPAJgMAAQgHAAgHgEQgFgDgFgHQgFgHgDgKQgCgKAAgKQAAgYAMgTQANgVAagRIgFgSIgFgOIgBgIQAAgFADgDQADgDAFAAQAFAAACADQADACABAFIABAIIADAMIAEAMQANgFALgDQALgCANAAIAHAAIAKABIAGgQIAEgMQACgFACgCQACgCAEAAQAFAAADADQADADAAAEIgDAMIgHAVQAWAKAMAQQANARAAAUQAAAUgHARQgIARgQANIgOAMIgRALIgPAIQgIADgDAAQgFAAgDgDgAhHgBQgJAPAAASQABAMAEAJQAFAJAGAAQAFAAAHgEIAQgMQAIgIAJgKIgNgaIgMghQgSAOgJAQgAgDgvQgLACgMAFIAJAbIALAYIAQgbQAJgPAHgSIgEAAIgFAAQgLAAgJACg");
	this.shape_40.setTransform(181.05,466.2);

	this.shape_41 = new cjs.Shape();
	this.shape_41.graphics.f("#006600").s().p("AgGBwQgCgCAAgDIAAgzQgOAOgRAMQgQALgUAJIgOAGQgGABgDAAQgEAAgDgDQgDgDAAgFQAAgBAAAAQAAgBAAAAQABgBAAAAQAAgBABgBIACgCIACgBIADgBIAFgCQAMgDAMgHQAMgFAMgIQAMgIAKgJIhOAAQgDAAgCgCQgDgDAAgEQABgEACgCQACgCADgBIBeAAIAAgPIg8AAQgJAAgFgFQgEgFgBgIIAAguIgKAMQgEADgDAAQgEgBgDgCQgCgDAAgEIAAgEIAFgFIAOgQIAPgTIAMgSQACgEADgBQACgBACAAQAFAAACACQADADAAADIgCAGIgHAMIAzAAIAGgJIAGgKIAEgGIAFgBQAFAAADACQADAEAAADQAAACgDAFIgIAKIBPAAQADgBACADQABACABAEQgBADgBACQgCADgDAAIhTAAIAAAMIBLAAQADAAACACQACADAAADQAAADgCADQgCACgDAAIhLAAIAAAMIBLAAQADAAACACQACADAAADQAAAEgCACQgCACgDAAIhLAAIAAANIBWAAQACABACABQACACAAAEQAAADgCADQgCACgCAAIhWAAIAAAPIBeAAQADABADACQACADAAADQAAAEgCADQgDACgDAAIhQAAQALAJANAHQANAIAOAFQAPAHAOADQAFABACADQACACAAAEQAAAFgDADQgCADgFAAIgEgBIgIgDQgYgGgUgNQgTgMgSgRIAAA0QgBADgCACQgDACgEAAQgEAAgDgCgAhCgGIABADIAEABIA1AAIAAgNIg6AAgAhCgfIA6AAIAAgMIg6AAgAhBhGIgBADIAAAIIA6AAIAAgMIg1AAIgEABg");
	this.shape_41.setTransform(157.25,465.95);

	this.shape_42 = new cjs.Shape();
	this.shape_42.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_42.setTransform(133.225,465.675);

	this.shape_43 = new cjs.Shape();
	this.shape_43.graphics.f("#006600").s().p("AAiBdIgRgFIgRgHQgJgEgGgEQgRgJgJgMQgJgMAAgOQAAgMAKgPQALgQATgSQASgSAZgSIgmABIgsAAIgrABQgEAAgDgDQgDgDAAgFQAAgDACgCIAEgEIADgBIAFAAIAZAAIAlAAIAlgBIAkgBIAcgBIARgBIACAAQADABADADQADADAAADQAAAFgDADQgCADgEAAIgGAAIgJABIgHAAQgUAMgSANQgSAOgOANQgNAOgIALQgIAMAAAIQgBAPARALQAPALAlAJIADABIACAAIACAAIADgBIACAAIACAAQAEAAADADQADADAAAFQAAAGgFADQgEAEgJAAIgNgCg");
	this.shape_43.setTransform(300.475,395.375);

	this.shape_44 = new cjs.Shape();
	this.shape_44.graphics.f("#006600").s().p("AgxBjQgNgGgHgMIgEgJIgBgMIgBgVIABgbIABgeIABgdIABgXIABgEIAAgEIAAgGIgCgGIAAgCIAAgBQAAgGADgCQADgDAGgBQAGABAEAGQAEAFAAAMIAAACIgBAEIAAAKIgDAgIgBAiIgBAgIABAUIABALIADAIQAEAFAHAEQAIACALAAQAOAAAKgDQALgFAJgJIAJgLIAJgPIAIgQQACgEACgCQADgBADAAQAFAAAEADQADAEABAFIgEAMIgJAQQgFAKgGAHQgMAQgRAIQgSAHgWABQgTgBgNgGg");
	this.shape_44.setTransform(277.875,394.7);

	this.shape_45 = new cjs.Shape();
	this.shape_45.graphics.f("#006600").s().p("AhPBvQgCgDgBgDIAAh6IgLARQgEAFgDAAQgEAAgDgDQgDgCAAgEIABgDIADgFQAHgLAHgPQAIgQAGgRIALgiIADgFQADgCADAAQAEAAADADQADACAAAEIgCAJIgGARIgHATIAACjQAAADgDADQgCACgEAAQgFAAgCgCgABCBuQgHgBgDgDQgDgCAAgFQABgEACgDQADgDAEAAIADABIAGAAIAHABIAEAAQAFAAABgCQACgCAAgFIAAi2QAAgEADgCQACgDAFAAQAEAAADADQACACAAAEIAAC/QABALgFAEQgGAFgMAAIgWgBgAgzBoQgCgDAAgFQAAgDABgCQACgCADgBIACAAIAFgBIAMgCIANgCIADgBIAAgsIgeAAQgEAAgCgCQgDgCAAgFQAAgEACgCQADgDAEAAIAeAAIAAgWQAAgDADgDQACgCAFAAQADAAACACQADADAAADIAAAWIAcAAQADAAACADQADACAAAEQAAAEgDADQgCACgDAAIgcAAIAAApIAMgCIAIgCIAIgCIADgBIACAAQAEAAACADQADACAAAEQAAADgCACQgBACgDABIgOAEIgUAFIgVAEIgTADIgLACQgFAAgDgDgAA3A8QgCgCAAgDIAAiIQAAgDACgDQADgCAEAAQAEAAADACQACADABADIAACIQgBADgCACQgDADgEAAQgEAAgDgDgAAhgJIgDgCIgBgCIgBgDIgBgDIgBgCIgUADIgUAEIgTACIgLACQgEgBgDgCQgCgDAAgFQAAgDABgCQACgDADAAIADgBIAEAAIABAAQAFgLAFgOIAIgbIgUAAQgEAAgCgCQgCgDAAgEQAAgEACgDQACgCAEAAIBOAAQAEAAACACQADADAAAEQAAAEgDADQgCACgEAAIgnAAIgIAbIgJAXIAUgCIATgCIgEgJIgFgKIgBgFQAAgEACgCQADgCAEAAIAEABIAEAEIAFAJIAGAOIAFAMIADAHIABADIAAACQAAAEgDACQgDACgEAAIgEgBg");
	this.shape_45.setTransform(252.0523,394.775);

	this.shape_46 = new cjs.Shape();
	this.shape_46.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_46.setTransform(228.525,394.325);

	this.shape_47 = new cjs.Shape();
	this.shape_47.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_47.setTransform(326.825,330.725);

	this.shape_48 = new cjs.Shape();
	this.shape_48.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_48.setTransform(310.725,330.725);

	this.shape_49 = new cjs.Shape();
	this.shape_49.graphics.f("#006600").s().p("AhDBpQgDgDAAgFIAAgFIAAgHIABg/IABhXIAAgUIABgKIAAgEIAAgCQACgDACgBQADgCADAAIAFABIAEADIACAEIABAGIAAAFIAAAjIgBALIAAAMIAZAPIAcANQAPAGAOAEQAFACACADQACACAAAFQAAAFgEAEQgDADgFAAIgEAAIgHgDIgjgRQgRgJgQgJIAAAcIAAARIAAAKIgBAKIAAAXIAAAMIgBAEIAAADQgBADgDACQgDACgEAAQgFAAgDgDgAAcgWIgDgEIgYgaIgJgOIgCgGQAAgDACgCQADgDADAAIADABIAEAEIAKAOIAMANIAKAMIADADIAAADQAAADgCADQgDACgEAAIgBAAIgCAAgAA6gqIgKgJIgQgUIgIgLIgEgEIAAgDQAAgEACgCQADgCADAAIAEABIAEAEIAGAHIAKALIAJAMIAIAIIACADIAAACQAAAEgCADQgDADgDAAQgCAAgDgDg");
	this.shape_49.setTransform(294.225,330.75);

	this.shape_50 = new cjs.Shape();
	this.shape_50.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEAAgCgDQgCgEAAgEQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAAEgCADQgDACgEABIgJAAIgWABIgdAAIgfABIgbAAg");
	this.shape_50.setTransform(267.125,330.15);

	this.shape_51 = new cjs.Shape();
	this.shape_51.graphics.f("#006600").s().p("AgKBgQgLAAgGgDQgFgCgBgFQgDgFABgJIAAhCIgFAAIgEAAIgRABIgIAAIgOABIgJAAQgGAAgCgDQgDgDAAgEQAAgEABgDQADgDADgBIACAAIACAAIAGAAIAIAAIAMAAIAUAAIALgBIAAg6IgSAAIgSAAQgGAAgEgCQgDgDAAgFQAAgEACgCQACgDADgBIADgBIAKAAIBEgBIAsgBIALAAIAHgBQAGAAAEADQACADAAAFQAAAEgBADQgDADgEAAIgBAAIgGABIgPAAIgeABIgPABIgQAAIAAA6IARAAIAmgBIAUgBIAMgBIAKAAIAEAAQAIAAAFACQADADAAAGQAAAFgCACQgEACgEABIgLAAIgSAAIgXAAIgjABIgUAAIAABAIABAEIABACIAGAAIAIABIALAAIAUgBIASgBIAFgBIADgFIAEgDIAEgBQAFAAAEAEQADADAAAFQAAAEgDAFQgDAEgFADQgDACgGABQgGABgKAAIgYABIgegBg");
	this.shape_51.setTransform(243.35,331.025);

	this.shape_52 = new cjs.Shape();
	this.shape_52.graphics.f("#006600").s().p("AhpBwQgCgCAAgDIAAiFQAAgIAEgEQAEgDAHAAIAKAAIgDgLIgDgLIgDgJIgQAAQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAxAAIAAgPQAAgDADgDQACgCAFAAQAEAAADACQADADAAADIAAAPIAvAAQADAAACADQACACAAAEQAAAEgCADQgCACgDAAIgRAAIgEAOIgFARIALAAQAHAAAEADQAEAEAAAIIAAB3QAAALgGAEQgEAEgPAAQgNAAgFgCQgFgCAAgGQAAgEACgDQACgCAEAAIADAAIAGAAIACABIACAAQAGAAACgCQACgBAAgFIAAhqQAAgBAAAAQAAgBgBAAQAAgBAAAAQAAAAgBgBQAAAAAAAAQgBgBAAAAQgBAAAAAAQgBAAAAAAIgcAAIAAAQIAVAAQAEAAABACQACACAAAEQAAADgCACQgBACgEAAIgVAAIAAARIAIAAQAHAAADADQADADAAAHIAAAjQAAANgNAAIggAAQgNAAAAgNIAAgjQAAgHAEgDQADgDAGAAIAIAAIAAgRIgUAAQgDAAgCgCQgCgCAAgDIACgGQACgCADAAIAUAAIAAgQIgbAAQgBAAAAAAQgBAAAAAAQgBAAAAABQgBAAAAAAQAAABAAAAQgBAAAAABQAAAAAAABQAAAAAAABIAAB/QAAADgDACQgCACgEAAQgEAAgDgCgAg9AnIgBADIAAAWIABAEIAEABIARAAIADgBIABgEIAAgWIgBgDIgDgBIgRAAIgEABgAhFg+IADAMIACAJIAdAAIADgMIADgJIACgKIgtAAIADAKgABkBwIgGgGQgJgJgHgJQgHgKgHgMIgPAWQgIALgIAHIgGAGIgFABQgFAAgDgDQgDgDAAgEIABgFIAGgGQALgMAJgLQAIgLAHgOIgKgZIgJgcQgEAJgDAEQgDAEgEAAQgEAAgDgDQgDgCAAgDIAAgDIACgGQAJgWAGgYQAGgYACgYQABgFACgCQADgDAEAAQAFAAACADQADACAAAEIgBALIgDARIA2AAQAEAAACACQACADAAAEQAAAFgCACQgCADgEAAIgHAAQgBATgEATIgIAiQgFARgGANQAGALAKANQAKANALALIAEAFIABAFQgBAEgCADQgDADgFAAIgFgBgAAug0IAAACIgBADIgBADIgBAEQADARAFAQIALAdQAHgTAEgUQAFgUACgUIggAAg");
	this.shape_52.setTransform(219.475,330.775);

	this.shape_53 = new cjs.Shape();
	this.shape_53.graphics.f("#006600").s().p("AhhBxQgEAAgEgDQgDgDAAgFIABgEIAEgGIALgOIAKgSQABgDADgBIAFgCQAFAAADADQADADAAAFIgCAIIgHAMIgJAOQgGAIgEAEQgDACgDAAIgBAAgAgdBwQAAgBgBAAQAAAAgBgBQAAAAgBgBQAAAAAAgBIgBgCIgBgEIgCgRIgEgSIAAgCIAAgBQAAgEADgDQADgDAFAAQAEAAADADQACACACAGIADAOIADAPIABAKQAAAEgDADQgDACgGAAQgDAAgDgBgABbBvQgCgCgDgFIgLgUIgLgQIgCgEIAAgDQAAgEADgDQAEgDAEAAQADAAADACQADACAFAGIALARIAJAPQACAGAAADQAAAEgDADQgEADgFAAQgDAAgDgBgAAdBuQgDgCgBgFIgGgQIgEgKIgDgIIgBgDIAAgDQAAgEADgDQADgCAFgBQAEAAACADQADACADAIIAHAPIAEANIACAIQAAAEgDADQgEADgFAAQgEAAgCgCgAhjAtQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAXAAIAAgoIgcAAQgDAAgDgCQgCgDAAgEQAAgEACgCQACgDAEAAIAcAAIAAgfQgIALgFAEQgFAEgDAAQgFAAgCgDQgDgDAAgEQAAAAAAgBQAAgBAAAAQAAgBAAAAQAAgBABAAIAFgHQAKgKAIgLQAIgKAGgLQABgDADgCQACgBADAAQAEAAADACQADADAAAEQAAACgBADIgGAKICaAAQAEAAACADQACACABAEQAAAFgDACQgCACgEAAIgQAAIAAAnIAYAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAIgYAAIAAAoIATAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAgAAiAbIAcAAIAAgoIgcAAgAgLAbIAbAAIAAgoIgbAAgAg5AbIAcAAIAAgoIgcAAgAAigfIAcAAIAAgnIgcAAgAgLgfIAbAAIAAgnIgbAAgAg5gfIAcAAIAAgnIgcAAg");
	this.shape_53.setTransform(195.325,330.7286);

	this.shape_54 = new cjs.Shape();
	this.shape_54.graphics.f("#006600").s().p("AhkBpQgDgDAAgEIAAi7QAAgJAEgEQAFgFAJAAIA6AAQAJAAAEAFQAFAEAAAJIAAAsQAAAJgFAEQgEAEgJAAIg4AAIAAB+QAAAEgDADQgDADgEAAQgFAAgCgDgAhTgrIAxAAIAEgBQAAAAABgBQAAAAAAgBQAAAAAAgBQAAAAAAgBIAAgMIg2AAgAhShaIgBADIAAAMIA2AAIAAgMIgBgDQAAAAAAgBQgBAAAAAAQgBAAAAAAQgBAAgBAAIgsAAQAAAAgBAAQAAAAgBAAQAAAAgBAAQAAABgBAAgAA3BqQgIgCgDgCQgDgCAAgFQAAgFADgDQACgCAFAAIACAAIACAAIAKABIAJAAQAGAAACgBQACgDAAgEIAAhqIg6AAQgJAAgEgEQgEgEAAgJIAAgtQAAgJAEgDQAEgFAJAAIA7AAQAKAAAEAFQAFAFAAAIIAACtQAAANgGAEQgFAGgOgBIgYAAgAAcgwQAAABAAAAQAAABAAAAQABABAAAAQAAABAAAAIAEABIAzAAIAAgRIg4AAgAAdhaQAAAAAAABQAAAAgBAAQAAABAAAAQAAABAAAAIAAAMIA4AAIAAgMQAAAAAAgBQAAAAAAgBQgBAAAAAAQAAgBgBAAQAAAAAAgBQAAAAgBAAQAAAAgBAAQAAAAgBAAIguAAQgBAAAAAAQgBAAAAAAQgBAAAAAAQAAABgBAAgAgjBTQgJAAgFgEQgEgFAAgJIAAg9QAAgIAEgFQAFgEAJAAIBHAAQAIAAAFAEQAEAFAAAIIAAA9QAAAJgEAFQgFAEgIAAgAgiA9QAAABABAAQAAABAAAAQAAABAAAAQABABAAAAIADABIA6AAIAEgBIABgEIAAgTIhEAAgAggAEQAAAAgBABQAAAAAAABQAAAAAAABQgBAAAAABIAAARIBEAAIAAgRQAAgFgFgBIg6AAQAAAAAAABQgBAAAAAAQgBAAAAAAQgBABAAAAg");
	this.shape_54.setTransform(171.3019,331.35);

	this.shape_55 = new cjs.Shape();
	this.shape_55.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_55.setTransform(147.225,331.075);

	this.shape_56 = new cjs.Shape();
	this.shape_56.graphics.f("#006600").s().p("AgxBjQgNgGgHgMIgEgKIgBgLIgBgVIABgbIABgeIABgdIABgXIABgEIAAgEIAAgGIgCgGIAAgCIAAgBQAAgGADgCQADgDAGgBQAGABAEAGQAEAFAAAMIAAACIgBAEIAAAKIgDAgIgBAiIgBAgIABAUIABALQABAFACACQAEAGAHAEQAIACALAAQAOAAAKgDQALgFAJgJIAJgLIAJgPIAIgQQACgEACgCQADgBADAAQAFAAAEADQADAEABAFIgEAMIgJAQQgFAKgGAHQgMAQgRAIQgSAHgWABQgTgBgNgGg");
	this.shape_56.setTransform(124.525,330.8);

	this.shape_57 = new cjs.Shape();
	this.shape_57.graphics.f("#006600").s().p("AhiBtQgEgDAAgGQAAgEACgCQACgDAEgBIACAAIAGgBQAxgGAigUQAhgUAVgiIAFgGQADgCADAAQAFABADADQADADABAEQgBAEgFAIQgFAJgKALQgNAPgRAMQgSANgSAJIgTAHIgVAGIgUAEIgRACQgFAAgDgDgAgeArIgLgBIgHgBQgFgBgDgDQgCgCAAgFQAAgFADgDQADgDAEAAIADAAIADABIAKABIAJABQAGAAADgCQACgCAAgFIAAhyQAAgEADgDQADgDAFAAQAEAAADADQADADAAAEIAAB4QAAAOgHAFQgFAFgRAAIgKAAgAhpAVQgDgDAAgGQAAAAAAgBQAAAAAAgBQAAAAAAgBQABAAAAgBIADgFQAMgQAIgSQAJgSAGgUQACgGADgCQACgDAEAAQAFAAADADQADADAAAFIgCAMIgHATIgKAWIgKATQgFAJgGAHIgFAEIgFABQgFAAgDgDgABbASIgFgEIgBgCIgCgFIgLgTIgIgRIgJgQIgMgUIgCgEIgBgDQAAgFADgDQAEgCAEgBQADAAADACIAGAHIALAQIALASIALAVIALAUIABAEIABAEQAAAEgEAEQgDADgFAAIgGgCg");
	this.shape_57.setTransform(99.5167,330.825);

	this.shape_58 = new cjs.Shape();
	this.shape_58.graphics.f("#006600").s().p("AgQBjQgQAAgKgCQgJgBgFgCQgJgEgFgGQgFgHAAgJQAAgGAEgHQADgIAHgGIAcgZIAegYIgfgXIgbgVIgTgRIgHgJQgCgFAAgDQAAgGADgDQADgEAFAAQAEAAACACIAEAEQAEAIAKAJQAKALAQANIAoAeIANgKIALgIIALgIIADgDIAEgDIAHgGIAFgHIADgCIAFgBQAFAAADADQAEADAAAGQAAAFgFAFQgFAHgMAIIgcAUIgfAXIgbAXIgUATIgHAIQgCADAAADQAAAEADACQADACAHACIAVABIAiABIAZAAIAQgBIAJgBIAFgDIAEgCIADAAQAFAAADADQADADAAAFQAAADgCADQgCAEgDACQgFACgHABIgSACIgeABIgngBg");
	this.shape_58.setTransform(203.125,288.45);

	this.shape_59 = new cjs.Shape();
	this.shape_59.graphics.f("#006600").s().p("AguBcQgNgIAAgPQAAgQARgNQARgNAfgHIgPgKIgTgMIgGgFQgBgDAAgEQAAgDACgEQADgEAEgEIAYgUIAngdIgBAAIgXABIgZAAIgZABIgUABQgJAAgDgCQgEgDABgFQgBgGADgDQADgCAGAAIACAAIAFAAIAGABIAIAAIAvgBIArgDIADAAIABAAQAHAAAFAEQAFACAAAGIgBAEIgDAFIgCABIgGAEIgRAOIgVARIgTAQIgNALIAPALQAIAFAOAGQARAKALAHQAKAIAFAGQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAFgIAIQgIAHAAAGQAAAGAGADQAGACAPAAQAQAAANgEQANgDAIgGQAIgHAAgIQAAgEgFgEQgEgEgKgHQgVAFgOAFg");
	this.shape_59.setTransform(179.3737,289);

	this.shape_60 = new cjs.Shape();
	this.shape_60.graphics.f("#006600").s().p("AghBqQgDgDAAgGQgBgDACgDIAIgFQAMgFAJgHQAIgHAGgIIgYgDQgLgCgIgDQgLgFgIgJQgHgJAAgLQAAgLAHgIQAHgJAMgGQAIgEANgDIAcgFIAAgDIgBgMIAAgGIgcABIgcAAIgXABIgRAAIgKgBIgFgBIgCgDIgBgFQAAgEACgCQACgDADgBIACAAIAFgBIAOAAIARAAIAUAAIAeAAIASgBIAAgMIAAgJQAAgKACgEQACgDAGAAQAGAAADADQACACAAAGIAAAGIAAAIIAAANIAigBIAXgBIABgBIABAAQAEAAADADQADADAAAEQAAAEgCACQgBADgDABIgCABIgFAAIgGAAIgKAAIgPABIgMAAIgMAAIAAANIAAAEIAAAGIABAKIABAUIAAAPQAAAQgBAKQgBAKgEAHQgDAIgGAIQgHAHgJAIQgIAIgJAFQgJAFgFAAQgEAAgDgDgAgIgHQgKACgGADQgHACgEAFQgDAFAAAFQAAAHADAFQAEAFAHACIASAEIAUACIABgMIABgNIAAgFIgBgHIAAgNQgOABgJACg");
	this.shape_60.setTransform(155.425,288.5469);

	this.shape_61 = new cjs.Shape();
	this.shape_61.graphics.f("#006600").s().p("Ag2BpQgDgDAAgFIAAgGIABgHIABg/IAAhVIAAgVIABgKIAAgEIAAgBQACgEADgBQACgCADAAIAGABIADADIADAEIABAGIgBAFIAAAjIAAAKIAAANIAZAOIAcAOQAPAGAOAEQAEABACADQACADAAAFQAAAFgEAEQgDAEgFAAIgEgBIgHgDQgUgIgQgKIgfgRIAAAbIgBARIAAALIgBALIAAAWIAAALIgBAGIAAACQgBADgDACQgDACgEAAQgFAAgDgDg");
	this.shape_61.setTransform(133.9,288.4);

	this.shape_62 = new cjs.Shape();
	this.shape_62.graphics.f("#006600").s().p("AgfBQQgDgEAAgFIABgEIADgDIABgBIAEgCQARgLAMgMQANgNAJgPQAKgOAHgUQAIgUAGgbQABgEACgCQADgCAEAAQAEAAADADQADADAAAEIgCAHIgDANIgFAPIgEANQgGARgHANQgHANgIALQgJAMgMALQgMAMgKAIQgKAHgFAAQgFAAgDgDgAgzAGQgCgBgBgDIgEgIIgFgRIgGgRIgEgOIgCgIIgBgCQAAgEADgDQADgDAFAAIAFABIADADIAAACIACAFIADALIADAKIAFAOIAIAVIABADIABACQgBAEgDACQgCADgGAAIgFgBgAgCgHQgDgBgBgDIgEgJIgGgQIgFgQIgFgOIgBgHQAAgDADgDQADgDAEAAQABAAAAAAQABAAABAAQAAAAABABQAAAAABAAQAAABABAAQAAAAABAAQAAABABAAQAAABAAAAIABADIABAEIAEALIAEAPIAGAPIAEAKIABADIAAACQAAAEgDADQgCACgFAAIgEgBg");
	this.shape_62.setTransform(107.675,291.125);

	this.shape_63 = new cjs.Shape();
	this.shape_63.graphics.f("#006600").s().p("Ag5BmQgEgDAAgGIABgFQABgDADgBIABgBIAEgCQAPgIAJgHQAKgIAFgGQAFgIACgJQACgKAAgNIAAgqIgWABIgTAAIgHAAIgJAAQgFAJgHAKQgHAIgJAHIgGAEQAAAAgBABQAAAAgBAAQAAAAgBAAQgBAAAAAAQgGAAgCgDQgDgDAAgFIAAgEIAEgEQAJgHAGgIQAHgIADgIIAEgNIACgPIABgRIgBgLQAAgFADgCQADgCAFgBQAEAAADACQADADABADIAAAMIgBASIgCARIAOAAIAJAAIAqAAIAogCIgIgPIgCgHQAAgEACgCQADgCADAAQABgBABAAQAAAAABABQAAAAABAAQAAAAABABIADAFIAJAPIAJARIAIALIABADIAAADQAAADgCACQgDACgDABQgDAAgDgDQgDgDgDgHIgMABIgMAAIgNABIgJABIAAAqQAAASgCAMQgDAMgGAJQgEAGgHAJQgJAHgLAIIgQAKQgGADgDABQgEgBgDgEgABhgqIgGgHIgKgRIgJgQIgFgJIgBgEQAAgEADgCQACgDAEAAIAEACIAEAFIAGAMIAKAQIAJAPIACADIAAADQAAADgCACQgDADgDAAQgBAAAAAAQgBAAgBAAQAAgBgBAAQAAAAgBgBg");
	this.shape_63.setTransform(84.575,288.5);

	this.shape_64 = new cjs.Shape();
	this.shape_64.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_64.setTransform(59.675,288.075);

	this.shape_65 = new cjs.Shape();
	this.shape_65.graphics.f("#006600").s().p("AAABrIgDgDIgCgDIgDgHIgGgOIgJgVIgKgXIgLgYIgFgLIgFACIgHADIgPAIIgJAEIgHABQgFgBgDgCQgDgDAAgEQAAgFACgCQACgCAEAAIAHgCIAJgEIAGgDIALgFIAEgCIgHgPIgMgYIgKgUIgFgKIgCgEIAAgDQAAgEAEgCQADgDAFgBIAEACQACABAEAGIAJATIASAlIAGAMIAOgHIAVgKIAGgDIgBgNIgBgSIAAgLIAAgJIAAgCQAAgDACgDQADgDAEABQAEAAADABQADACAAADIABAIIABARIABAVQAPgGALgDQALgEAIAAQASAAAJALQAKALAAATQAAAOgHANQgIANgOAMIgNAJIgNAGQgGADgDAAQgFAAgDgDQgCgDgBgFIABgEIADgDIABgBIADgCIAGgCQAMgEAJgIQAJgHAFgJQAFgJAAgKQAAgMgEgEQgEgFgJgBIgKABIgOAFIgTAIIABARIAAAHIAAAFIgBAIIAAADIgEAFQgCACgDgBQgFAAgDgCQgCgDAAgGIgBgMIAAgOIgMAHIgPAGIgHAFIAJARIAVAuIAKAZIAFAMIABAFQAAADgEADQgDAEgEAAIgEgBg");
	this.shape_65.setTransform(477.695,204.5);

	this.shape_66 = new cjs.Shape();
	this.shape_66.graphics.f("#006600").s().p("AAVBuQgDgDAAgEIAAgoIgZAAQgEAAgCgDQgCgDgBgEQABgEACgCQACgDAEAAIAaAAIAAhIQgGARgIAQQgHARgIAPQgJAPgKALQgFAHgDACQgDACgDAAQgEAAgEgEQgCgDAAgEIAAgEIACgEQAMgMAMgRQALgQAKgSQAKgTAHgUIg0AAQgEAAgCgDQgCgDgBgEQABgEACgDQACgCAEgBIA7AAIAAgjQAAgEADgDQADgCAEAAQAFAAADACQADADgBAEIAAAjIBAAAQAEAAADADQABADAAAEQAAAEgBADQgDADgEAAIg4AAIABADQAGAOALARQAKAQAMAQQAMARAMAOIADAEIABAEQAAAFgDADQgEAEgEAAQgDAAgCgCIgGgHQgQgUgOgXQgOgWgKgbIAABLIAdAAQADAAADACQACADAAAEQAAAFgCACQgDADgDAAIgdAAIAAAoQABAEgDADQgDACgFAAQgEAAgDgCgAhMBuQgDgCAAgEIAAh8QgJAPgGAGQgFAGgEAAQgEAAgDgDQgDgDAAgDIAAgEIAEgGQAKgNAJgPQAJgPAIgRQAHgQAFgQQACgHAHAAQAFAAADACQADADAAAEIgCAJIgHAQIgJAUIAAChQAAAEgCACQgDACgFAAQgEAAgDgCg");
	this.shape_66.setTransform(453.45,204.325);

	this.shape_67 = new cjs.Shape();
	this.shape_67.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_67.setTransform(429.375,204.525);

	this.shape_68 = new cjs.Shape();
	this.shape_68.graphics.f("#006600").s().p("AhhBrQgEgEABgEIABgFIADgEIABgBIAFgCQAUgJANgNQANgNAGgQQAHgRACgVIgiAAQgEgBgCgCQgCgDAAgEIAAgBIgBABIgBABIgOALQgFAEgEAAQgFAAgDgEQgDgCgBgFQABgDABgCIAGgGQASgRAPgVQAPgUAIgWQACgGADgCQACgCAEAAQAFAAADADQADADABAEQAAAEgEAIIgIATIgNAWQgHALgKALIB0AAQAFAAAEACQADABAEACQAEADABAFIABAMIgBAaIgCAaIgCAXQgBAJgDAFQgDAKgHAEQgHAEgPAAIgXgBIgQgCQgFgBgCgCQgEgDAAgFQABgFADgDQADgDAGAAIACAAIABAAIAKABIAKABIAKAAQAIAAAEgCQADgCABgGIADgNIACgTIABgUIABgUQgBgEgBgBQgCgCgEABIg1AAQgCAWgFARQgFARgJAOQgKANgOALQgNAKgOAGIgGACIgDABQgFgBgDgDgABbgBIgHgGQgPgPgNgQQgMgQgLgTIgJgRQgDgGAAgDQAAgFAEgDQADgDAEAAQAEAAADACIAFAIQAJARAJANQAHANALALIAYAYIADAFQACADgBADQAAAEgDAEQgDADgEAAQgEAAgDgBg");
	this.shape_68.setTransform(405.5,204.425);

	this.shape_69 = new cjs.Shape();
	this.shape_69.graphics.f("#006600").s().p("AhCBsQgKAAgFgEQgGgGAAgKIAAiNQAAgKAGgFQAFgFAKAAIAsAAIABgCIAFgLIAFgNQACgEACgCQADgDAEAAQAEAAAEAEQADADAAAEQAAACgDAGIgIAQIBDAAQAKAAAGAFQAFAFAAAKIAACNQAAAKgGAGQgFAEgKAAgAhBBTQAAAGAGAAIB3AAQAAAAABAAQABAAAAAAQABgBAAAAQABAAAAgBQACgBAAgDIAAgfIiDAAgAhBAhICDAAIAAghIiDAAgAg/g1QgBABAAAAQAAABAAAAQgBABAAABQAAAAAAABIAAAcICDAAIAAgcQAAgBAAAAQAAgBgBgBQAAAAAAgBQAAAAgBgBQAAAAgBAAQAAAAgBgBQAAAAgBAAQgBAAAAAAIh3AAQgBAAAAAAQgBAAAAAAQgBABAAAAQgBAAAAAAg");
	this.shape_69.setTransform(381.475,203.75);

	this.shape_70 = new cjs.Shape();
	this.shape_70.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_70.setTransform(920.075,204.175);

	this.shape_71 = new cjs.Shape();
	this.shape_71.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_71.setTransform(903.975,204.175);

	this.shape_72 = new cjs.Shape();
	this.shape_72.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEgBgCgCQgCgDAAgFQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAADgCADQgDAEgEAAIgJABIgWAAIgdAAIgfABIgbAAg");
	this.shape_72.setTransform(884.375,203.6);

	this.shape_73 = new cjs.Shape();
	this.shape_73.graphics.f("#006600").s().p("AhqBmQgEgDAAgGIABgFIAEgEQAIgHAIgKQAIgMAHgNQAHgNAFgOQAEgKADgNIAEgfIABggIAAgGIAAgDIgCgEIgBgBIAAgCQAAgGADgCQAEgEAFAAIAFACIAEADQACADABAFQACAEAAAHQAAASgCASQgCATgDAPQgDAQgEALQgEAOgIAOQgHAOgJANQgIANgIAIIgHAGIgFABQgGAAgDgDgABFBlQgEgDgHgIQgJgLgIgMQgIgNgGgNQgGgNgEgMIgGgcQgDgRgCgRQgCgRAAgOQAAgMAEgGQAEgGAHgBQAEAAADAEQADADAAAEIAAAEIgCADIgBAEIAAADIAAAGQAAAPACARQACARADAQQAEAOAEAMIAMAWIAPAXQAIAKAIAHIAEAEIABAFQAAAFgEAFQgDADgFAAIgBAAQgDAAgEgDgABGggIgGgHIgKgQIgLgUQgEgGAAgCQAAgDADgCQACgCAEgBQABAAAAAAQABAAABAAQAAABABAAQAAAAABABIADAEIAIAPIAJAOIAIAMIABADIABACQAAADgDADQgCACgDAAQgBAAAAAAQgBAAgBAAQAAAAgBAAQAAgBgBAAgABggxIgLgQIgNgVQgFgIAAgCQAAgEADgDQACgBAEAAIAEAAIAEAGIAEAHIAGALIAIAMIAGAJIACADIABAEQAAADgDACQgCACgEAAIAAAAQgDAAgDgEg");
	this.shape_73.setTransform(860.975,204.4);

	this.shape_74 = new cjs.Shape();
	this.shape_74.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEgBgCgCQgCgDAAgFQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAADgCADQgDAEgEAAIgJABIgWAAIgdAAIgfABIgbAAg");
	this.shape_74.setTransform(836.375,203.6);

	this.shape_75 = new cjs.Shape();
	this.shape_75.graphics.f("#006600").s().p("AAMBnQgCgBgBgFIgBgTIgBgdIAAgkQgTAWgTASQgTASgRANIgOAJQgEADgDgBQgEAAgDgDQgEgDAAgEQAAgDABgDIAEgEIABAAIAHgGQAQgKARgOQAQgOAQgQQAQgQAMgQIAAgRIgFAAIg4AAIgcABQgFAAgDgDQgDgDAAgFIACgGQACgDACgBIACgBIAEAAIAKAAIAHAAIAJAAIAQAAIAYAAIAWAAIAAgnQAAgGACgDQADgCAGAAQAFAAACADQADADABAFIAAAcIAAADIAAADIAAAEIAWAAIAPAAIAIgBIAKAAIAGgBQAEAAADADQADADAAAFQgBAEgCADQgCADgDAAIgOAAIgRABIgSAAIgOABIAAAbIAAASIAAASIABARIAAAYIABAYQgBAGgCAEQgCADgGAAQgFAAgDgDg");
	this.shape_75.setTransform(812.6,204.3);

	this.shape_76 = new cjs.Shape();
	this.shape_76.graphics.f("#006600").s().p("ABUBjIgIgJIgPgTQgKAIgLAFQgMAFgPACQgKACgOABIggACIglABQgLAAgGgDQgFgDAAgGQAAgFADgDQACgDAFgBQAWgiAUgoQATgpARgxQABgEADgDQACgCAFAAQAEAAADADQADADAAAFIgEANIgHAXIgMAeIgNAcIgTAlQgIARgLAQIAHAAIAEAAIAEAAIAagBIAYgCIASgDQAKgCAIgEQAIgEAHgFIgQgXIgHgMIgCgGQAAgGADgDQADgDAFgBQAEAAACACQADACADAHIAMASIAOAUIAPASIALAOIADADIABAEQAAAFgEAEQgDAEgFAAQgDAAgEgCg");
	this.shape_76.setTransform(788.825,204.375);

	this.shape_77 = new cjs.Shape();
	this.shape_77.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEgBgCgCQgCgDAAgFQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAADgCADQgDAEgEAAIgJABIgWAAIgdAAIgfABIgbAAg");
	this.shape_77.setTransform(764.375,203.6);

	this.shape_78 = new cjs.Shape();
	this.shape_78.graphics.f("#006600").s().p("Ag5BnQgEgEAAgFIABgGQABgDADgBIABAAIAEgCQAPgJAJgHQAKgHAFgIQAFgHACgKQACgIAAgNIAAgrIgWAAIgTABIgHAAIgJgBQgFALgHAIQgHAKgJAGIgGAEQAAAAgBABQAAAAgBAAQAAAAgBAAQgBABAAAAQgGgBgCgDQgDgDAAgFIAAgEIAEgEQAJgHAGgIQAHgIADgIIAEgMIACgQIABgRIgBgKQAAgFADgDQADgCAFAAQAEAAADACQADACABADIAAANIgBARIgCASIAOAAIAJAAIAqgBIAogCIgIgPIgCgHQAAgEACgCQADgCADgBQABAAABAAQAAAAABAAQAAABABAAQAAAAABAAIADAGIAJAQIAJAPIAIANIABACIAAACQAAADgCADQgDADgDAAQgDAAgDgDQgDgDgDgGIgMAAIgMABIgNAAIgJAAIAAAsQAAAQgCANQgDAMgGAJQgEAHgHAHQgJAJgLAHIgQAKQgGAEgDgBQgEAAgDgDgABhgpIgGgIIgKgRIgJgQIgFgJIgBgEQAAgDADgDQACgDAEABIAEAAIAEAHIAGALIAKAQIAJAPIACADIAAACQAAAEgCADQgDACgDAAQgBAAAAAAQgBAAgBAAQAAgBgBAAQAAAAgBAAg");
	this.shape_78.setTransform(741.325,204.3);

	this.shape_79 = new cjs.Shape();
	this.shape_79.graphics.f("#006600").s().p("AgQBjQgQgBgKgBQgJgBgFgCQgJgEgFgHQgFgGAAgIQAAgHAEgIQADgHAHgHIAcgYIAegYIgfgXIgbgWIgTgRIgHgJQgCgEAAgEQAAgFADgDQADgDAFAAQAEgBACACIAEAEQAEAIAKAJQAKAKAQANIAoAfIANgKIALgIIALgIIADgDIAEgDIAHgGIAFgHIADgCIAFgBQAFAAADADQAEADAAAFQAAAGgFAGQgFAGgMAHIgcAVIgfAXIgbAXIgUAUIgHAHQgCADAAADQAAAEADACQADADAHABIAVACIAiAAIAZAAIAQgBIAJgCIAFgCIAEgBIADgBQAFAAADADQADADAAAFQAAAEgCADQgCACgDACQgFADgHABIgSACIgeAAIgnAAg");
	this.shape_79.setTransform(715.875,204.25);

	this.shape_80 = new cjs.Shape();
	this.shape_80.graphics.f("#006600").s().p("AguBcQgNgIAAgOQAAgQARgNQARgNAfgJIgPgJIgTgMIgGgGQgBgCAAgEQAAgDACgEQADgEAEgEIAYgTIAngeIgBgBIgXABIgZABIgZACIgUAAQgJAAgDgDQgEgCABgGQgBgFADgCQADgDAGAAIACAAIAFAAIAGAAIAIAAIAvgBIArgCIADAAIABAAQAHAAAFADQAFAEAAAEIgBAGIgDAEIgCABIgGAFIgRANIgVARIgTAQIgNALIAPAMQAIAEAOAHQARAJALAIQAKAGAFAHQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAGgIAGQgIAIAAAHQAAAFAGADQAGACAPABQAQAAANgFQANgDAIgHQAIgGAAgHQAAgFgFgEQgEgFgKgFQgVAEgOAFg");
	this.shape_80.setTransform(692.1237,204.8);

	this.shape_81 = new cjs.Shape();
	this.shape_81.graphics.f("#006600").s().p("AgSBkQgJgEgJgJQgEgEgCgDIgBgGQAAgEADgEQAEgDAEAAIAEABIAFAEIALAKQAGAEAEAAQACAAACgCQACgDABgFIADgPIACgWIABgaIAAgTIgCgRIgBgDIgCAAIgBAAIgCAAIgGABIgMAAIgLABIgFAeQgDANgDAKQgDAKgFAJQgGAMgKANQgJAMgLAMIgGAFIgFABQgFgBgEgDQgDgDAAgFQAAgEACgCIAHgIQAJgIAIgKQAIgLAHgLQAGgLACgJIAFgRIADgYIgCAAIgaABIgJAAQgGAAgDgCQgDgDAAgFQAAgFACgDQADgDAFAAIACAAIAEAAIAIAAIAQAAIALAAIABgVIABgWQABgGACgDQADgEAFAAQAFABADACQADADAAAEIAAACIAAADIgBAEIAAAGIgBAKIAAALIgBAJIAMAAIAJgBIAKgBIAEAAIADAAQAGAAAEACQAEACABAGIACALIABATIABAVQAAAXgCASQgCATgDALQgEAMgGAGQgHAGgJAAQgJAAgJgFgABaALIgFgEIgHgHIgRgYIgQgYIgLgUQgEgJAAgEQAAgEADgDQADgDAFAAIAFABIAEADIABACIACAFIANAZIARAZQAJANAJAJIADAFIABADQAAAFgDADQgDAEgFAAIgEgBg");
	this.shape_81.setTransform(668.625,204.275);

	this.shape_82 = new cjs.Shape();
	this.shape_82.graphics.f("#006600").s().p("AgfBVQgDgDAAgFIABgGIADgDIACgBIAEgBQAygSAZgZQAYgXAAghQAAgKgDgGQgDgHgFgEIgJgFIgLgBIgQgBIgYABIgcAAIgfACIgdACIgCABIgBAAQgEAAgDgDQgCgDAAgFIABgFQABgEADgBIADAAIAIgBIAFAAIAKgBIAigBIAigCIAdAAQAhAAAQANQAQANAAAcQAAAcgMAUQgNAWgZATIgSAKIgVALIgTAJQgJACgDAAQgFABgDgEg");
	this.shape_82.setTransform(644.201,205.1);

	this.shape_83 = new cjs.Shape();
	this.shape_83.graphics.f("#006600").s().p("AgsBjQgPgKgNgVQgIATgIAKQgIAKgGAAQgFAAgDgDQgDgDAAgFIABgDIAEgHQAMgPAHgRQAHgSACgRQABgFADgCQACgEAGAAQADABADADQAEADAAAEIgBAGIgDAJIgCAKIALARIANAPQAHAHAHADQAIAEAHAAQAKAAAFgIQAFgIABgMQAAgMgIgOQgHgOgPgQIgFgGQgCgDAAgEIABgFIADgGIAGgLIAOgUIAHgNIAEgIIAAgBIgOACIgOAAIgRAAIgLAAIgGAAIgDgBIgDgDQgCgDAAgDQAAgFADgDQACgDAHAAIAbAAIAVAAIAOgBIACAAIACAAQAJAAAFAEQAEADAAAGQAAADgCAEIgFALIgRAXIgLAUIgFAJIABADIAEAFQAPARAJAQQAJAQAAANQAAAWgMANQgMANgSABQgRAAgRgMgABOBZQgGgFgHgMIgIgOIgHgQIgGgPIgCgKQAAgEADgDQADgCAEgBIAFABIAEADIABADIADAGIAIAVQAFAKAHAKQAFAJAGAGIADADIABAGQAAAEgDADQgEADgEABQgFAAgGgHgABNggIgGgHIgLgOIgQgVQgEgHABgCQgBgEADgCQADgCADgBIAEABIAEAGIAJAMIALAQIAKALQACADAAADQAAAEgCACQgDACgDABIgEgBgABmgzIgGgGIgLgPIgQgVQgEgGAAgCQAAgEADgCQACgCAEgBIADABIAEAGIAGAHIAJAMIAIALIAIAJIACADIAAADQAAAEgCACQgDACgDABIgBAAIgDgCg");
	this.shape_83.setTransform(620.9,203.75);

	this.shape_84 = new cjs.Shape();
	this.shape_84.graphics.f("#006600").s().p("AhXBmQgDgCgBgEIAAgLIgBgWIAAgZIAAgXIAAghIABgiIAAgcIABgPQABgEADgCQADgDAEAAQAFAAADADQACADAAAFIAAAFIAAAHIgCAgIAAAvIAAAmIABAhIABAXIAAACIAAABQAAAEgDADQgDADgFAAQgEAAgDgDgAAKBcQgKgFgJgKQgGgGgDgGQgEgHAAgFQAAgFADgDQADgDAFAAIAFABIADADIABABIACAEQADALAJAHQAJAGALAAQAOAAAKgHQALgHADgNQABgDADgCQADgCADAAQAFAAADADQADADAAAEIgBAJIgFAJQgIANgOAHQgNAHgRABQgMAAgLgFgAA4gHQgEgDAAgFQAAAAAAgBQAAgBABAAQAAgBAAAAQAAgBABAAIAEgFQAHgGADgHQAEgHAAgHQAAgLgLgGQgKgFgSgBQgLAAgJADQgKACgKAEIgEACIgDAAQgEAAgDgDQgDgDAAgFQAAgEADgDQAEgDAIgDQAHgDAKgCQALgBAOAAQASAAAOAFQANAFAIAKQAHAKAAANQAAAMgFALQgGALgJAIIgFADIgFABQgEAAgDgDg");
	this.shape_84.setTransform(596.475,204.225);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_84},{t:this.shape_83},{t:this.shape_82},{t:this.shape_81},{t:this.shape_80},{t:this.shape_79},{t:this.shape_78},{t:this.shape_77},{t:this.shape_76},{t:this.shape_75},{t:this.shape_74},{t:this.shape_73},{t:this.shape_72},{t:this.shape_71},{t:this.shape_70},{t:this.shape_69},{t:this.shape_68},{t:this.shape_67},{t:this.shape_66},{t:this.shape_65},{t:this.shape_64},{t:this.shape_63},{t:this.shape_62},{t:this.shape_61},{t:this.shape_60},{t:this.shape_59},{t:this.shape_58},{t:this.shape_57},{t:this.shape_56},{t:this.shape_55},{t:this.shape_54},{t:this.shape_53},{t:this.shape_52},{t:this.shape_51},{t:this.shape_50},{t:this.shape_49},{t:this.shape_48},{t:this.shape_47},{t:this.shape_46},{t:this.shape_45},{t:this.shape_44},{t:this.shape_43},{t:this.shape_42},{t:this.shape_41},{t:this.shape_40},{t:this.shape_39},{t:this.shape_38},{t:this.shape_37},{t:this.shape_36},{t:this.shape_35},{t:this.shape_34},{t:this.shape_33},{t:this.shape_32},{t:this.shape_31},{t:this.shape_30},{t:this.shape_29},{t:this.shape_28},{t:this.shape_27},{t:this.shape_26},{t:this.shape_25},{t:this.shape_24},{t:this.shape_23},{t:this.shape_22},{t:this.shape_21},{t:this.shape_20},{t:this.shape_19},{t:this.shape_18},{t:this.shape_17},{t:this.shape_16},{t:this.shape_15},{t:this.shape_14},{t:this.shape_13},{t:this.shape_12},{t:this.shape_11},{t:this.shape_10},{t:this.instance_3},{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape},{t:this.instance_2},{t:this.instance_1},{t:this.instance}]}).wait(28));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-6.7,9,996.2,571.2);


(lib.Exp_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Frog_normal
	this.instance = new lib.Frog_normal("synched",29,false);
	this.instance.parent = this;
	this.instance.setTransform(190.3,-24.9,0.1095,0.1095,0,0,0,30.2,30.2);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:30,regY:30,scaleX:1,scaleY:1,x:201.25,y:419.15,startPosition:34},9).wait(83));

	// Frog_normal
	this.instance_1 = new lib.Frog_normal("synched",29,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(480.15,-17.35,0.1703,0.1703,0,0,0,29.9,29.9);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regX:30,regY:30,scaleX:1,scaleY:1,x:571.15,y:228.75,startPosition:34},9).wait(83));

	// exp_text_1
	this.instance_2 = new lib.exp_text_1("single",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(1733,314.9,1,1,0,0,0,507.7,288.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({x:540.95,mode:"synched",loop:false},9,cjs.Ease.quadOut).wait(83));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(26.6,-32.7,2188.2000000000003,639.7);


(lib.Background = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// bg
	this.instance = new lib.bg_area_01();
	this.instance.parent = this;
	this.instance.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


(lib.Bear_ear_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bear_ear("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:2},15,cjs.Ease.quadInOut).wait(1).to({x:1.9452},0).wait(1).to({x:1.7957},0).wait(1).to({x:1.5336},0).wait(1).to({x:1.169},0).wait(1).to({x:0.7696},0).wait(1).to({x:0.4276},0).wait(1).to({x:0.1884},0).wait(1).to({x:0.05},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-9.8,-9.5,21.700000000000003,19);


(lib.SnakeHead = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,vmax:11,vmax_weak:24,weak:35});

	// Head
	this.body = new lib.Head();
	this.body.name = "body";
	this.body.parent = this;
	this.body.setTransform(30,30);

	this.bodyVmax = new lib.Head_vmax();
	this.bodyVmax.name = "bodyVmax";
	this.bodyVmax.parent = this;
	this.bodyVmax.setTransform(30,30);

	this.bodyVmaxWeak = new lib.Head_vmax_weak();
	this.bodyVmaxWeak.name = "bodyVmaxWeak";
	this.bodyVmaxWeak.parent = this;
	this.bodyVmaxWeak.setTransform(30,30);

	this.bodyWeak = new lib.Head_weak();
	this.bodyWeak.name = "bodyWeak";
	this.bodyWeak.parent = this;
	this.bodyWeak.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.body}]}).to({state:[{t:this.bodyVmax}]},11).to({state:[{t:this.bodyVmaxWeak}]},13).to({state:[{t:this.bodyWeak}]},11).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(12,12,36,36);


(lib.SnakeBody = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0});

	// Head
	this.body = new lib.Body();
	this.body.name = "body";
	this.body.parent = this;
	this.body.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get(this.body).wait(15));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(12,12,36,36);


(lib.Bubble_float = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,948.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:48.7},119).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,128.2,997.4);


(lib.Spider_sa = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Spider_eye
	this.instance = new lib.Spider_eye_move("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(33.2,34.6,1,1,0,0,180,0.1,0.1);

	this.instance_1 = new lib.Spider_eye_wink("synched",23);
	this.instance_1.parent = this;
	this.instance_1.setTransform(33.2,34.6,1,1,0,0,180,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},95).wait(405));

	// Spider_eye
	this.instance_2 = new lib.Spider_eye_move("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(26.55,34.5);

	this.instance_3 = new lib.Spider_eye_wink("synched",23);
	this.instance_3.parent = this;
	this.instance_3.setTransform(26.55,34.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_2}]}).to({state:[{t:this.instance_3}]},95).wait(405));

	// Spider_legs_move
	this.instance_4 = new lib.Spider_legs_move_2("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(48.4,32.85,1,1,0,0,180,-13.8,0);

	this.instance_5 = new lib.Spider_legs_move("synched",23);
	this.instance_5.parent = this;
	this.instance_5.setTransform(48.4,32.85,1,1,0,0,180,-13.8,0);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_4,p:{startPosition:0}}]}).to({state:[{t:this.instance_5}]},23).to({state:[{t:this.instance_4,p:{startPosition:23}}]},24).to({state:[{t:this.instance_5}]},48).wait(405));

	// Spider_legs_move
	this.instance_6 = new lib.Spider_legs_move_2("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(11.2,32.85,1,1,0,0,0,-13.8,0);

	this.instance_7 = new lib.Spider_legs_move("synched",23);
	this.instance_7.parent = this;
	this.instance_7.setTransform(11.2,32.85,1,1,0,0,0,-13.8,0);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_6,p:{startPosition:0}}]}).to({state:[{t:this.instance_7}]},23).to({state:[{t:this.instance_6,p:{startPosition:23}}]},24).to({state:[{t:this.instance_7}]},48).wait(405));

	// Spider_body
	this.instance_8 = new lib.Spider_body_move("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(29.85,21.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(500));

	// Spider_web
	this.instance_9 = new lib.Spider_web("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(30.35,27.45,0.0418,0.0418,0,0,0,0,2.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_9).to({regX:0.4,regY:2.6,scaleX:1.549,scaleY:1.5492,x:30.4,y:27.65},11,cjs.Ease.quadOut).wait(489));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-76.6,-82.7,212.2,212.7);


(lib.Spider_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Spider_eye
	this.instance = new lib.Spider_eye_move("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(33.2,34.6,1,1,0,0,180,0.1,0.1);

	this.instance_1 = new lib.Spider_eye_wink("synched",23);
	this.instance_1.parent = this;
	this.instance_1.setTransform(33.2,34.6,1,1,0,0,180,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},95).wait(25));

	// Spider_eye
	this.instance_2 = new lib.Spider_eye_move("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(26.55,34.5);

	this.instance_3 = new lib.Spider_eye_wink("synched",23);
	this.instance_3.parent = this;
	this.instance_3.setTransform(26.55,34.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_2}]}).to({state:[{t:this.instance_3}]},95).wait(25));

	// Spider_legs_move
	this.instance_4 = new lib.Spider_legs_move_2("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(48.4,32.85,1,1,0,0,180,-13.8,0);

	this.instance_5 = new lib.Spider_legs_move("synched",23);
	this.instance_5.parent = this;
	this.instance_5.setTransform(48.4,32.85,1,1,0,0,180,-13.8,0);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_4,p:{startPosition:0}}]}).to({state:[{t:this.instance_5}]},23).to({state:[{t:this.instance_4,p:{startPosition:23}}]},24).to({state:[{t:this.instance_5}]},48).wait(25));

	// Spider_legs_move
	this.instance_6 = new lib.Spider_legs_move_2("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(11.2,32.85,1,1,0,0,0,-13.8,0);

	this.instance_7 = new lib.Spider_legs_move("synched",23);
	this.instance_7.parent = this;
	this.instance_7.setTransform(11.2,32.85,1,1,0,0,0,-13.8,0);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_6,p:{startPosition:0}}]}).to({state:[{t:this.instance_7}]},23).to({state:[{t:this.instance_6,p:{startPosition:23}}]},24).to({state:[{t:this.instance_7}]},48).wait(25));

	// Spider_body
	this.instance_8 = new lib.Spider_body_move("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(29.85,21.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(120));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-5.4,-0.1,70.30000000000001,55.4);


(lib.Mouse_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Mouse_mustache_upper
	this.instance = new lib.Mouse_mustache_upper("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(10.55,43.7,1,1,0,-15.1975,164.8025,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(18).to({startPosition:0},0).wait(2).to({skewX:-9.2311,skewY:170.7689,y:43.65},0).wait(2).to({skewX:-15.1975,skewY:164.8025,y:43.7},0).wait(54).to({startPosition:0},0).wait(2).to({skewX:-9.2311,skewY:170.7689,y:43.65},0).wait(2).to({skewX:-15.1975,skewY:164.8025,y:43.7},0).wait(17).to({startPosition:0},0).to({scaleX:0.992,scaleY:0.886,skewX:-17.2101,skewY:166.5999,y:45.65},4,cjs.Ease.quadOut).to({regX:-6.8,regY:0.7,scaleX:0.9995,scaleY:0.9932,skewX:-15.305,skewY:164.9097,x:10.5,y:32.9},8,cjs.Ease.quadInOut).to({regY:0.8,scaleX:0.9908,scaleY:0.8668,skewX:-17.6037,skewY:166.908,y:46.1},5,cjs.Ease.quadInOut).to({regX:-6.9,regY:0.6,scaleX:1,scaleY:1,skewX:-15.1975,skewY:164.8025,x:10.55,y:43.7},5,cjs.Ease.quadOut).wait(1));

	// Mouse_mustache_upper
	this.instance_1 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(10.55,39.2,1,1,0,0,180,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(18).to({startPosition:0},0).wait(2).to({skewX:10.2449,skewY:190.2449,y:39.25},0).wait(2).to({skewX:0,skewY:180,y:39.2},0).wait(54).to({startPosition:0},0).wait(2).to({skewX:10.2449,skewY:190.2449,y:39.25},0).wait(2).to({skewX:0,skewY:180,y:39.2},0).wait(17).to({startPosition:0},0).to({scaleY:0.877,y:41.8},4,cjs.Ease.quadOut).to({scaleY:0.9927,y:28.35},8,cjs.Ease.quadInOut).to({regY:0.7,scaleY:0.8562,y:42.25},5,cjs.Ease.quadInOut).to({regY:0.6,scaleY:1,y:39.2},5,cjs.Ease.quadOut).wait(1));

	// Mouse_mustache_upper
	this.instance_2 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(52.8,43.7,1,1,15.1975,0,0,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(18).to({startPosition:0},0).wait(2).to({rotation:8.7301},0).wait(2).to({rotation:15.1975},0).wait(54).to({startPosition:0},0).wait(2).to({rotation:8.7301},0).wait(2).to({rotation:15.1975},0).wait(17).to({startPosition:0},0).to({scaleX:0.992,scaleY:0.886,rotation:0,skewX:17.2101,skewY:13.4001,y:45.65},4,cjs.Ease.quadOut).to({regX:-6.8,regY:0.7,scaleX:0.9995,scaleY:0.9932,skewX:15.305,skewY:15.0903,x:52.85,y:32.9},8,cjs.Ease.quadInOut).to({regY:0.8,scaleX:0.9908,scaleY:0.8668,skewX:17.6037,skewY:13.092,y:46.1},5,cjs.Ease.quadInOut).to({regX:-6.9,regY:0.6,scaleX:1,scaleY:1,rotation:15.1975,skewX:0,skewY:0,x:52.8,y:43.7},5,cjs.Ease.quadOut).wait(1));

	// Mouse_mustache_upper
	this.instance_3 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(52.8,39.2,1,1,0,0,0,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(18).to({startPosition:0},0).wait(2).to({rotation:-3.9662},0).wait(2).to({rotation:0},0).wait(54).to({startPosition:0},0).wait(2).to({rotation:-3.9662},0).wait(2).to({rotation:0},0).wait(17).to({startPosition:0},0).to({scaleY:0.877,y:41.8},4,cjs.Ease.quadOut).to({scaleY:0.9927,y:28.35},8,cjs.Ease.quadInOut).to({regY:0.7,scaleY:0.8562,y:42.25},5,cjs.Ease.quadInOut).to({regY:0.6,scaleY:1,y:39.2},5,cjs.Ease.quadOut).wait(1));

	// Mouse_nose
	this.instance_4 = new lib.Mouse_nose("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(30,42.05,1,1,0,0,0,0,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(97).to({startPosition:0},0).to({scaleY:0.877,y:44.25},4,cjs.Ease.quadOut).to({scaleY:0.9927,y:31.2},8,cjs.Ease.quadInOut).to({regY:0.4,scaleY:0.8562,y:44.7},5,cjs.Ease.quadInOut).to({regY:0.3,scaleY:1,y:42.05},5,cjs.Ease.quadOut).wait(1));

	// Mouse_eye
	this.instance_5 = new lib.Mouse_eye("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(44,33.75);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(19).to({startPosition:0},0).wait(2).to({scaleY:0.2909},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.2909},0).wait(2).to({scaleY:1},0).wait(49).to({startPosition:0},0).wait(1).to({startPosition:0},0).wait(2).to({scaleY:0.2909},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.2909},0).wait(2).to({scaleY:1},0).wait(12).to({startPosition:0},0).to({scaleY:0.877,y:36.95},4,cjs.Ease.quadOut).to({regY:0.1,scaleY:0.9927,y:23},8,cjs.Ease.quadInOut).to({regY:0.2,scaleY:0.8562,y:37.6},5,cjs.Ease.quadInOut).to({regY:0,scaleY:1,y:33.75},5,cjs.Ease.quadOut).wait(1));

	// Mouse_eye
	this.instance_6 = new lib.Mouse_eye("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(16,33.75);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(19).to({startPosition:0},0).wait(2).to({scaleY:0.2909},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.2909},0).wait(2).to({scaleY:1},0).wait(49).to({startPosition:0},0).wait(1).to({startPosition:0},0).wait(2).to({scaleY:0.2909},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.2909},0).wait(2).to({scaleY:1},0).wait(12).to({startPosition:0},0).to({scaleY:0.877,y:36.95},4,cjs.Ease.quadOut).to({regY:0.1,scaleY:0.9927,y:23},8,cjs.Ease.quadInOut).to({regY:0.2,scaleY:0.8562,y:37.6},5,cjs.Ease.quadInOut).to({regY:0,scaleY:1,y:33.75},5,cjs.Ease.quadOut).wait(1));

	// Mouse_face
	this.instance_7 = new lib.Mouse_face_move("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(30,31.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(97).to({startPosition:0},0).to({scaleY:0.877,y:35.1,startPosition:4},4,cjs.Ease.quadOut).to({scaleY:0.9927,y:20.8,startPosition:14},8,cjs.Ease.quadInOut).to({regY:0.1,scaleY:0.8562,y:35.75,startPosition:17},5,cjs.Ease.quadInOut).to({regY:0,scaleY:1,y:31.6,startPosition:0},5,cjs.Ease.quadOut).wait(1));

	// Mouse_Ear
	this.instance_8 = new lib.Mouse_ear_move("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(50,6.4,1,1,0,0,180);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(97).to({startPosition:0},0).to({scaleY:0.877,y:13,startPosition:4},4,cjs.Ease.quadOut).to({scaleY:0.9927,y:-4.2,startPosition:14},8,cjs.Ease.quadInOut).to({scaleY:0.8562,y:14.1,startPosition:17},5,cjs.Ease.quadInOut).to({scaleY:1,y:6.4,startPosition:0},5,cjs.Ease.quadOut).wait(1));

	// Mouse_Ear
	this.instance_9 = new lib.Mouse_ear_move("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(10,6.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_9).wait(97).to({startPosition:0},0).to({scaleY:0.877,y:13,startPosition:4},4,cjs.Ease.quadOut).to({scaleY:0.9927,y:-4.2,startPosition:14},8,cjs.Ease.quadInOut).to({scaleY:0.8562,y:14.1,startPosition:17},5,cjs.Ease.quadInOut).to({scaleY:1,y:6.4,startPosition:0},5,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4,-18.3,71.4,78.4);


(lib.Hedgehog_hand_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_hand("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(-2.1,-0.25,0.9676,0.9673);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:-5.25,y:-2.75},12,cjs.Ease.quadInOut).to({x:0.45,y:-2.85},17,cjs.Ease.quadInOut).to({x:-2.1,y:-0.25},20,cjs.Ease.quadInOut).wait(11));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-12.2,-9.6,21.9,17);


(lib.Frog_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bubble_float
	this.instance = new lib.Bubble_float("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(96,456.2,1,1,0,0,0,96,456.2);

	this.instance_1 = new lib.Bubble_break("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(77,437.7,1,1,0,0,0,96,456.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},119).to({state:[]},13).wait(3));
	this.timeline.addTween(cjs.Tween.get(this.instance).to({_off:true,x:77,y:437.7},119).wait(16));

	// Frog_base
	this.instance_2 = new lib.Frog_base("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30.05,30.05,0.1333,0.1333,0,0,0,30,30);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(119).to({_off:false},0).to({regX:29.9,regY:29.9,scaleX:1.4575,scaleY:1.6757,x:31.1,y:-35.15,mode:"single"},10,cjs.Ease.cubicOut).to({regX:30,regY:30,scaleX:1,scaleY:1,x:30,y:30},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-207,-206.5,473.5,1203.9);


(lib.Frog = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":7,fear:16,defeated:22});

	// Frog
	this.normal = new lib.Frog_normal();
	this.normal.name = "normal";
	this.normal.parent = this;

	this.spawn = new lib.Frog_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;

	this.fear = new lib.Frog_fear();
	this.fear.name = "fear";
	this.fear.parent = this;
	this.fear.setTransform(30,30,1,1,0,0,0,30,30);

	this.defeated = new lib.Frog_defeated();
	this.defeated.name = "defeated";
	this.defeated.parent = this;
	this.defeated.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},7).to({state:[{t:this.fear}]},9).to({state:[{t:this.defeated}]},6).wait(10));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-9.2,97.4,1006.6);


(lib.Cancer_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bubble_float
	this.instance = new lib.Bubble_float("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(96,456.2,1,1,0,0,0,96,456.2);

	this.instance_1 = new lib.Bubble_break("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(77,437.7,1,1,0,0,0,96,456.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},119).to({state:[]},13).wait(3));
	this.timeline.addTween(cjs.Tween.get(this.instance).to({_off:true,x:77,y:437.7},119).wait(16));

	// Frog_base
	this.instance_2 = new lib.Cancer_base("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30.2,31.45,0.054,0.054,0,0,0,0,1);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(119).to({_off:false},0).to({regY:0.6,scaleX:1,scaleY:1,y:11.4},10,cjs.Ease.cubicOut).to({y:31.4},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-207,-206.5,473.5,1203.9);


(lib.Cancer_sa = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Cancer_eye
	this.instance = new lib.Cancer_eye_anger("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(42.55,20.6,1,1,0,2.6858,-177.3142,2.5,-1.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({skewX:-17.8126,skewY:-197.8126,x:42.65},3,cjs.Ease.quadOut).wait(497));

	// Cancer_eye
	this.instance_1 = new lib.Cancer_eye_anger("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(17.5,20.45,1,1,-5.231,0,0,2.5,-1.8);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regX:2.6,regY:-1.7,rotation:18.978,x:17.65,y:20.7},3,cjs.Ease.quadOut).wait(497));

	// Cancer_cissor
	this.instance_2 = new lib.Cancer_cissor_open("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(52.4,26.55,1.2249,1.2249,0,-14.9985,165.0015,0.3,0.1);

	this.instance_3 = new lib.Cancer_cissor_open_close("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(88.35,26.75,1.67,1.67,0,0,180,-9.5,-1.6);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_2}]}).to({state:[{t:this.instance_2}]},3).to({state:[{t:this.instance_3}]},1).wait(496));
	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({regX:0.2,scaleX:1.621,scaleY:1.621,skewX:7.7175,skewY:187.7175,x:71.75,y:26.5},3).to({_off:true},1).wait(496));

	// Cancer_cissor_minor
	this.instance_4 = new lib.Cancer_cissor_minor("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(48.6,29.45,1,1,0,0,180,-1.4,2.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({x:55.75},3).wait(497));

	// Cancer_cissor_minor
	this.instance_5 = new lib.Cancer_cissor_minor("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(11.8,29.45,1,1,0,0,0,-1.4,2.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({x:-0.45},3).wait(497));

	// Cancer_cissor
	this.instance_6 = new lib.Cancer_cissor_open("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(8,26.55,1.2249,1.2249,14.9985,0,0,0.3,0.1);

	this.instance_7 = new lib.Cancer_cissor_open_close("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(-34.75,23,1.67,1.67,0,0,0,-9.5,-1.6);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_6}]}).to({state:[{t:this.instance_6}]},3).to({state:[{t:this.instance_7}]},1).wait(496));
	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({regX:0.1,regY:0.2,scaleX:1.6074,scaleY:1.6074,rotation:-10.2151,x:-8.95,y:26.8},3).to({_off:true},1).wait(496));

	// Cancer_body
	this.instance_8 = new lib.Cancer_body_move("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(30,37);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(500));

	// Cancer_foot
	this.instance_9 = new lib.Cancer_foot_move("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(46.85,45.15,1,1,0,2.9853,-177.0147,6.3,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_9).wait(500));

	// Cancer_foot
	this.instance_10 = new lib.Cancer_foot_move("synched",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(43.85,49.9,1,1,0,19.4389,-160.5611,7,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_10).wait(500));

	// Cancer_foot
	this.instance_11 = new lib.Cancer_foot_move("synched",0);
	this.instance_11.parent = this;
	this.instance_11.setTransform(48.15,38.7,1,1,0,-6.4984,173.5016,6.5,-0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_11).wait(500));

	// Cancer_foot
	this.instance_12 = new lib.Cancer_foot_move("synched",0);
	this.instance_12.parent = this;
	this.instance_12.setTransform(13.95,45.85,1,1,-8.9381,0,0,6.3,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_12).wait(500));

	// Cancer_foot
	this.instance_13 = new lib.Cancer_foot_move("synched",0);
	this.instance_13.parent = this;
	this.instance_13.setTransform(18.1,51.75,1,1,-11.4701,0,0,7.2,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_13).wait(500));

	// Cancer_foot
	this.instance_14 = new lib.Cancer_foot_move("synched",0);
	this.instance_14.parent = this;
	this.instance_14.setTransform(6.2,39.85);

	this.timeline.addTween(cjs.Tween.get(this.instance_14).wait(500));

	// Cancer_body
	this.instance_15 = new lib.Cancer_body_move_1("synched",0);
	this.instance_15.parent = this;
	this.instance_15.setTransform(30,37);

	this.instance_16 = new lib.Cancer_body_base("synched",0);
	this.instance_16.parent = this;
	this.instance_16.setTransform(30,37);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_15,p:{startPosition:0}}]}).to({state:[{t:this.instance_16}]},99).to({state:[{t:this.instance_15,p:{startPosition:3}}]},20).wait(381));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-52.1,0.7,157.9,57.3);


(lib.Cancer_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Cancer_eye
	this.instance = new lib.Cancer_eye("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(42.55,20.6,1,1,0,2.6851,-177.3149,2.5,-1.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:40.3},46).to({x:42.55},51).to({skewX:17.6846,skewY:-162.3154,x:42.5},5).wait(13).to({startPosition:0},0).to({skewX:2.6851,skewY:-177.3149,x:42.55},5).to({skewX:2.6851,x:40.55},28).to({x:42.55},46).to({regX:2.4,skewX:-12.3137,skewY:-192.3137,x:42.6},5).wait(17).to({startPosition:0},0).to({regX:2.5,skewX:2.6851,skewY:-177.3149,x:42.55},5).wait(19));

	// Cancer_eye
	this.instance_1 = new lib.Cancer_eye("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(17.5,20.45,1,1,-5.231,0,0,2.5,-1.8);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({x:20.5},46).to({x:17.5},51).to({regX:2.6,regY:-1.7,rotation:9.7675,x:17.6,y:20.55},5).wait(13).to({startPosition:0},0).to({regX:2.5,regY:-1.8,rotation:-5.231,x:17.5,y:20.45},5).to({x:20.5},28).to({x:17.5},46).to({regY:-1.7,rotation:-17.4424,x:17.55,y:20.6},5).wait(17).to({startPosition:0},0).to({regY:-1.8,rotation:-5.231,x:17.5,y:20.45},5).wait(19));

	// Cancer_cissor_minor
	this.instance_2 = new lib.Cancer_cissor_minor("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(48.6,29.45,1,1,0,0,180,-1.4,2.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(240));

	// Cancer_cissor
	this.instance_3 = new lib.Cancer_cissor("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(52.4,26.55,1.2249,1.2249,0,-14.9985,165.0015,0.3,0.1);

	this.instance_4 = new lib.Cancer_cissor_move("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(52.45,26.55,1.2248,1.2248,0,-44.9975,135.0025,0.3,0.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_3}]}).to({state:[{t:this.instance_3}]},100).to({state:[{t:this.instance_4}]},4).to({state:[{t:this.instance_3}]},10).to({state:[{t:this.instance_3}]},4).wait(122));
	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(100).to({startPosition:0},0).to({_off:true,scaleX:1.2248,scaleY:1.2248,skewX:-44.9975,skewY:135.0025,x:52.45},4).wait(10).to({_off:false},0).to({scaleX:1.2249,scaleY:1.2249,skewX:-14.9985,skewY:165.0015,x:52.4},4).wait(122));

	// Cancer_cissor_minor
	this.instance_5 = new lib.Cancer_cissor_minor("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(11.8,29.45,1,1,0,0,0,-1.4,2.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(196).to({startPosition:0},0).to({rotation:9.9404,x:11.6,y:29.35},3).wait(17).to({startPosition:0},0).to({rotation:0,x:11.8,y:29.45},3).wait(21));

	// Cancer_cissor
	this.instance_6 = new lib.Cancer_cissor("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(8,26.55,1.2249,1.2249,14.9985,0,0,0.3,0.1);

	this.instance_7 = new lib.Cancer_cissor_move("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(8.55,25.95,1.2248,1.2248,38.1707,0,0,0.4,0.1);
	this.instance_7._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(196).to({startPosition:0},0).to({_off:true,regX:0.4,scaleX:1.2248,scaleY:1.2248,rotation:38.1707,x:8.55,y:25.95},3).wait(17).to({_off:false,regX:0.3,scaleX:1.2249,scaleY:1.2249,rotation:14.9985,x:8,y:26.55},3).wait(21));
	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(196).to({_off:false},3).wait(17).to({startPosition:2},0).to({_off:true,regX:0.3,scaleX:1.2249,scaleY:1.2249,rotation:14.9985,x:8,y:26.55,startPosition:0},3).wait(21));

	// Cancer_body
	this.instance_8 = new lib.Cancer_body_move_1("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(30,37);

	this.instance_9 = new lib.Cancer_body_base("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(30,37);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_8,p:{startPosition:0}}]}).to({state:[{t:this.instance_9}]},99).to({state:[{t:this.instance_8,p:{startPosition:3}}]},20).to({state:[{t:this.instance_9}]},77).to({state:[{t:this.instance_8,p:{startPosition:7}}]},23).wait(21));

	// Cancer_foot
	this.instance_10 = new lib.Cancer_foot_move("synched",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(46.85,45.15,1,1,0,2.9853,-177.0147,6.3,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_10).wait(240));

	// Cancer_foot
	this.instance_11 = new lib.Cancer_foot_move("synched",0);
	this.instance_11.parent = this;
	this.instance_11.setTransform(43.85,49.9,1,1,0,19.4389,-160.5611,7,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_11).wait(240));

	// Cancer_foot
	this.instance_12 = new lib.Cancer_foot_move("synched",0);
	this.instance_12.parent = this;
	this.instance_12.setTransform(48.15,38.7,1,1,0,-6.4984,173.5016,6.5,-0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_12).wait(240));

	// Cancer_foot
	this.instance_13 = new lib.Cancer_foot_move("synched",0);
	this.instance_13.parent = this;
	this.instance_13.setTransform(13.95,45.85,1,1,-8.9381,0,0,6.3,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_13).wait(240));

	// Cancer_foot
	this.instance_14 = new lib.Cancer_foot_move("synched",0);
	this.instance_14.parent = this;
	this.instance_14.setTransform(18.1,51.75,1,1,-11.4701,0,0,7.2,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_14).wait(240));

	// Cancer_foot
	this.instance_15 = new lib.Cancer_foot_move("synched",0);
	this.instance_15.parent = this;
	this.instance_15.setTransform(6.2,39.85);

	this.timeline.addTween(cjs.Tween.get(this.instance_15).wait(240));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-16.4,3.3,93.30000000000001,54.7);


(lib.Cancer = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":7,"fear":16,"defeated":22,sa:32});

	// Cancer
	this.normal = new lib.Cancer_normal();
	this.normal.name = "normal";
	this.normal.parent = this;

	this.spawn = new lib.Cancer_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;

	this.fear = new lib.Cancer_fear();
	this.fear.name = "fear";
	this.fear.parent = this;

	this.defeated = new lib.Cancer_defeated();
	this.defeated.name = "defeated";
	this.defeated.parent = this;

	this.sa = new lib.Cancer_sa();
	this.sa.name = "sa";
	this.sa.parent = this;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},7).to({state:[{t:this.fear}]},9).to({state:[{t:this.defeated}]},6).to({state:[{t:this.sa}]},10).wait(7));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-21.3,2.9,118.7,994.5);


(lib.Bear_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bear_mouse
	this.instance = new lib.Bear_mouse("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30,43);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(60).to({regY:0.1,scaleY:0.9788,y:43.25},0).to({regY:0.3,scaleY:1.8355,y:43.5},10,cjs.Ease.quadInOut).to({regY:0,scaleY:1,y:43},11,cjs.Ease.quadInOut).wait(15));

	// Bear_ear
	this.instance_1 = new lib.Bear_ear_move("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(52.25,8.05);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(96));

	// Bear_ear
	this.instance_2 = new lib.Bear_ear_move("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(7.3,6.55);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(96));

	// Bear_eye
	this.instance_3 = new lib.Bear_eye("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(48,26);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(55).to({scaleY:0.175},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.175},0).wait(2).to({scaleY:1},0).wait(35));

	// Bear_eye
	this.instance_4 = new lib.Bear_eye("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(12,26);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(55).to({scaleY:0.175},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.175},0).wait(2).to({scaleY:1},0).wait(35));

	// Bear_nose
	this.instance_5 = new lib.Bear_nose_move("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(96));

	// Bear_face
	this.instance_6 = new lib.Bear_face_move("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(96));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-2.5,-2.9,66.6,59.9);


(lib.StartButton_remove = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// StartButton
	this.instance = new lib.StartButton_anim("single",8);
	this.instance.parent = this;
	this.instance.setTransform(0,330);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({alpha:0},7).wait(1));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFEDCC").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMngEgLCAohQklEkAAGfQAAGeElElQElElGdAAQGeAAElklQElklAAmeQAAmfklkkQklklmeAAQmdAAklElg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(8));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-600,-450,1200,900);


(lib.Area_8 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{start:0,goButtonReady:12,waitToGo:72});

	// GoButton
	this.instance = new lib.GoButton_anim("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(600,400);

	this.goButton = new lib.GoButton();
	this.goButton.name = "goButton";
	this.goButton.parent = this;
	this.goButton.setTransform(600,400);
	this.goButton._off = true;

	this.instance_1 = new lib.GoButton("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(600,400,1.398,1.398);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},4).to({state:[{t:this.goButton}]},8).to({state:[{t:this.goButton}]},60).to({state:[{t:this.instance_1}]},3).to({state:[{t:this.instance_1}]},5).to({state:[{t:this.instance_1}]},13).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.goButton).wait(12).to({_off:false},0).wait(60).to({_off:true,scaleX:1.398,scaleY:1.398,mode:"synched",startPosition:0,loop:false},3).wait(19));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(72).to({_off:false},3).to({scaleX:1.0268,scaleY:1.0268,x:600.05},5).to({regX:0.1,regY:0.1,scaleX:9.6717,scaleY:9.6717,x:599.7,y:400.5,alpha:0},13).wait(1));

	// AreaAnim
	this.instance_2 = new lib.AreaAnim_8("synched",0,false);
	this.instance_2.parent = this;
	this.instance_2.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(72).to({startPosition:71},0).to({alpha:0},8).wait(14));

	// bg
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#BAD5F7").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(94));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-397.4,-596.6,1992.3000000000002,1992.3000000000002);


(lib.Area_5 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"start":0,"goButtonReady":12,"waitToGo":72});

	// GoButton
	this.instance = new lib.GoButton_anim("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(600,400);

	this.goButton = new lib.GoButton();
	this.goButton.name = "goButton";
	this.goButton.parent = this;
	this.goButton.setTransform(600,400);
	this.goButton._off = true;

	this.instance_1 = new lib.GoButton("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(600,400,1.398,1.398);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},4).to({state:[{t:this.goButton}]},8).to({state:[{t:this.goButton}]},60).to({state:[{t:this.instance_1}]},3).to({state:[{t:this.instance_1}]},5).to({state:[{t:this.instance_1}]},13).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.goButton).wait(12).to({_off:false},0).wait(60).to({_off:true,scaleX:1.398,scaleY:1.398,mode:"synched",startPosition:0,loop:false},3).wait(19));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(72).to({_off:false},3).to({scaleX:1.0268,scaleY:1.0268,x:600.05},5).to({regX:0.1,regY:0.1,scaleX:9.6717,scaleY:9.6717,x:599.7,y:400.5,alpha:0},13).wait(1));

	// AreaAnim
	this.instance_2 = new lib.AreaAnim_5("synched",0,false);
	this.instance_2.parent = this;
	this.instance_2.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(72).to({startPosition:71},0).to({alpha:0},8).wait(14));

	// bg
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#BAD5F7").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(94));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-397.4,-596.6,1992.3000000000002,1992.3000000000002);


(lib.Area_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"start":0,"goButtonReady":12,"waitToGo":72});

	// GoButton
	this.instance = new lib.GoButton_anim("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(600,400);

	this.goButton = new lib.GoButton();
	this.goButton.name = "goButton";
	this.goButton.parent = this;
	this.goButton.setTransform(600,400);
	this.goButton._off = true;

	this.instance_1 = new lib.GoButton("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(600,400,1.398,1.398);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},4).to({state:[{t:this.goButton}]},8).to({state:[{t:this.goButton}]},60).to({state:[{t:this.instance_1}]},3).to({state:[{t:this.instance_1}]},5).to({state:[{t:this.instance_1}]},13).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.goButton).wait(12).to({_off:false},0).wait(60).to({_off:true,scaleX:1.398,scaleY:1.398,mode:"synched",startPosition:0,loop:false},3).wait(19));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(72).to({_off:false},3).to({scaleX:1.0268,scaleY:1.0268,x:600.05},5).to({regX:0.1,regY:0.1,scaleX:9.6717,scaleY:9.6717,x:599.7,y:400.5,alpha:0},13).wait(1));

	// Exp_1
	this.instance_2 = new lib.Exp_1("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(204.8,28,1,1,0,0,0,204.8,28);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(4).to({_off:false},0).wait(68).to({startPosition:70},0).to({x:1392.9,startPosition:27},8).wait(14));

	// AreaAnim
	this.instance_3 = new lib.AreaAnim_1("synched",0,false);
	this.instance_3.parent = this;
	this.instance_3.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(72).to({startPosition:71},0).to({alpha:0},8).wait(14));

	// bg
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#BAD5F7").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(94));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-397.4,-596.6,2612.2000000000003,1992.3000000000002);


(lib.Exp_2 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Frog_normal
	this.instance = new lib.Cancer_spawn("synched",116,false);
	this.instance.parent = this;
	this.instance.setTransform(271.45,507.4,2.2625,2.2625,0,0,0,30,30);

	this.instance_1 = new lib.Cancer_sa("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(270.85,488.45,2.2625,2.2625,0,0,0,30,30);

	this.instance_2 = new lib.Cancer_normal("synched",47);
	this.instance_2.parent = this;
	this.instance_2.setTransform(270.85,488.45,2.2625,2.2625,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},19).to({state:[{t:this.instance_2}]},47).wait(26));

	// exp_text_1
	this.instance_3 = new lib.exp_text_2("single",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(1733,314.9,1,1,0,0,0,507.7,288.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({x:540.95,mode:"synched",loop:false},9,cjs.Ease.quadOut).wait(83));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-264.7,-27.6,2139.6,1071.3);


(lib.Spider_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bubble_float
	this.instance = new lib.Bubble_float("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(96,456.2,1,1,0,0,0,96,456.2);

	this.instance_1 = new lib.Bubble_break("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(77,437.7,1,1,0,0,0,96,456.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},119).to({state:[]},13).wait(3));
	this.timeline.addTween(cjs.Tween.get(this.instance).to({_off:true,x:77,y:437.7},119).wait(16));

	// Frog_base
	this.instance_2 = new lib.Spider_normal("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30.05,0.054,0.054,0,0,0,0,1);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(119).to({_off:false},0).to({regY:0.6,scaleX:1,scaleY:1,x:0,y:-29.4},10,cjs.Ease.cubicOut).to({y:0.6},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-207,-206.5,473.5,1203.9);


(lib.Spider = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":7,"fear":16,"defeated":22,"sa":31});

	// Hedgehog
	this.normal = new lib.Spider_normal();
	this.normal.name = "normal";
	this.normal.parent = this;

	this.spawn = new lib.Spider_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;

	this.fear = new lib.Spider_fear();
	this.fear.name = "fear";
	this.fear.parent = this;

	this.defeated = new lib.Spider_defeated();
	this.defeated.name = "defeated";
	this.defeated.parent = this;

	this.normal_1 = new lib.Spider_sa();
	this.normal_1.name = "normal_1";
	this.normal_1.parent = this;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},7).to({state:[{t:this.fear}]},9).to({state:[{t:this.defeated}]},6).to({state:[{t:this.normal_1}]},9).wait(12));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.3,-0.7,101.7,998.1);


(lib.Mouse_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bubble_float
	this.instance = new lib.Bubble_float("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(96,456.2,1,1,0,0,0,96,456.2);

	this.instance_1 = new lib.Bubble_break("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(77,437.7,1,1,0,0,0,96,456.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},119).to({state:[]},13).wait(4));
	this.timeline.addTween(cjs.Tween.get(this.instance).to({_off:true,x:77,y:437.7},119).wait(17));

	// Frog_base
	this.instance_2 = new lib.Mouse_normal("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30.05,0.054,0.054,0,0,0,0,1);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(120).to({_off:false},0).to({regY:0.6,scaleX:1,scaleY:1,x:0,y:-29.4},10,cjs.Ease.cubicOut).to({y:0.6},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-207,-206.5,473.5,1203.9);


(lib.Mouse = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":7,"fear":16,"defeated":22});

	// Hedgehog
	this.normal = new lib.Mouse_normal();
	this.normal.name = "normal";
	this.normal.parent = this;

	this.spawn = new lib.Mouse_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;

	this.fear = new lib.Mouse_fear();
	this.fear.name = "fear";
	this.fear.parent = this;

	this.defeated = new lib.Mouse_defeated();
	this.defeated.name = "defeated";
	this.defeated.parent = this;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},7).to({state:[{t:this.fear}]},9).to({state:[{t:this.defeated}]},6).wait(10));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-5.3,-6.1,102.7,1003.5);


(lib.Hedgehog_sa = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Hedgehog_nose
	this.instance = new lib.Hedgehog_nose_move("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30,21.55);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(3).to({startPosition:3},0).wait(497));

	// Hedgehog_eye
	this.instance_1 = new lib.Hedgehog_eye_move("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(44.85,19.15,1,0.9998,0,0,180,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(3).to({startPosition:3},0).wait(497));

	// Hedgehog_eye
	this.instance_2 = new lib.Hedgehog_eye_move("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(14.5,19.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(3).to({startPosition:3},0).wait(497));

	// Hedgehog_mouth
	this.instance_3 = new lib.Hedgehog_mouse_move("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(29.65,31.35);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(3).to({startPosition:3},0).wait(497));

	// Hedgehog_hand
	this.instance_4 = new lib.Hedgehog_hand_move("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(53.5,35.8,0.9676,1.0463,0,0,180,-0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(3).to({startPosition:3},0).wait(497));

	// Hedgehog_hand
	this.instance_5 = new lib.Hedgehog_hand_move("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(9.65,37.45);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(3).to({startPosition:3},0).wait(497));

	// Hedgehog_Face
	this.instance_6 = new lib.Hedgehog_face_sa("synched",0,false);
	this.instance_6.parent = this;
	this.instance_6.setTransform(29.4,28.5,1,1.1541);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(500));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-5,-48.2,70.2,146.3);


(lib.Hedgehog_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Hedgehog_nose
	this.instance = new lib.Hedgehog_nose_move("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30,21.55);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(179));

	// Hedgehog_eye
	this.instance_1 = new lib.Hedgehog_eye_move("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(44.85,19.15,1,0.9998,0,0,180,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(179));

	// Hedgehog_eye
	this.instance_2 = new lib.Hedgehog_eye_move("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(14.5,19.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(179));

	// Hedgehog_mouth
	this.instance_3 = new lib.Hedgehog_mouse_move("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(29.65,31.35);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(179));

	// Hedgehog_hand
	this.instance_4 = new lib.Hedgehog_hand_move("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(53.5,35.8,0.9676,1.0463,0,0,180,-0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(179));

	// Hedgehog_hand
	this.instance_5 = new lib.Hedgehog_hand_move("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(9.65,37.45);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(179));

	// Hedgehog_Face
	this.instance_6 = new lib.Hedgehog_face_move("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(29.4,28.5);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(179));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-5,-18,70.2,93);


(lib.Hedgehog_fear_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Hedgehog_nose
	this.instance_1 = new lib.Hedgehog_nose_move("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(28,21.55);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(2).to({x:32,startPosition:2},0).wait(2));

	// Hedgehog_eye
	this.instance_2 = new lib.Hedgehog_eye_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(42.85,19.15,1,0.9998,0,0,180,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(2).to({x:46.85,startPosition:2},0).wait(2));

	// Hedgehog_eye
	this.instance_3 = new lib.Hedgehog_eye_fear("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(12.5,19.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(2).to({x:16.5,startPosition:2},0).wait(2));

	// Hedgehog_mouth
	this.instance_4 = new lib.Hedgehog_mouse_fear("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(27.65,31.35);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(2).to({x:31.65,startPosition:2},0).wait(2));

	// Hedgehog_hand
	this.instance_5 = new lib.Hedgehog_hand_move("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(51.5,35.8,0.9676,1.0463,0,0,180,-0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(2).to({x:55.5,startPosition:2},0).wait(2));

	// Hedgehog_hand
	this.instance_6 = new lib.Hedgehog_hand_move("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(7.65,37.45);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(2).to({x:11.65,startPosition:2},0).wait(2));

	// Hedgehog_Face
	this.instance_7 = new lib.Hedgehog_fear("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(27.4,28.5);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(2).to({x:31.4,startPosition:2},0).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-7.6,-10,74.3,77);


(lib.Hedgehog_defeated = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Hedgehog_nose
	this.instance = new lib.Hedgehog_nose_move("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30,21.55);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:0.1,regY:0.1,scaleX:23.1355,scaleY:10.3025,x:27.4,y:-3.15,alpha:0,startPosition:23},23,cjs.Ease.quadOut).wait(1));

	// Hedgehog_eye
	this.instance_1 = new lib.Hedgehog_eye_fear("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(44.85,19.15,1,0.9998,0,0,180,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({scaleX:7.5694,scaleY:2.8177,skewX:90.5542,skewY:270.5541,x:166.7,y:-37.55,alpha:0,startPosition:3},23,cjs.Ease.quadOut).wait(1));

	// Hedgehog_eye
	this.instance_2 = new lib.Hedgehog_eye_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(14.5,19.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({regX:-0.1,regY:-0.1,scaleX:5.4905,scaleY:7.4564,rotation:-35.498,x:-80.05,y:-2.65,alpha:0,startPosition:3},23,cjs.Ease.quadOut).wait(1));

	// Hedgehog_mouth
	this.instance_3 = new lib.Hedgehog_mouse_fear("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(29.65,31.35);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({regX:0.1,regY:0.4,scaleX:2.8182,scaleY:23.1212,x:25.7,y:155.35,alpha:0,startPosition:3},23,cjs.Ease.quadOut).wait(1));

	// Hedgehog_hand
	this.instance_4 = new lib.Hedgehog_hand_move("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(53.5,35.8,0.9676,1.0463,0,0,180,-0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({scaleX:2.7269,scaleY:2.9486,skewX:62.4568,skewY:242.4566,x:211.15,y:88.85,alpha:0,startPosition:23},23,cjs.Ease.quadOut).wait(1));

	// Hedgehog_hand
	this.instance_5 = new lib.Hedgehog_hand_move("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(9.65,37.45);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({scaleX:2.8181,scaleY:2.8181,rotation:-85.4694,x:-96.65,y:114.35,alpha:0,startPosition:23},23,cjs.Ease.quadOut).wait(1));

	// Hedgehog_Face
	this.instance_6 = new lib.Hedgehog_fear("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(29.4,28.5);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({regY:0.1,scaleX:2.1945,scaleY:3.1956,x:27.9,y:29,alpha:0,startPosition:3},23,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-121.8,-94.3,356.1,264.5);


(lib.Bear_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bubble_float
	this.instance = new lib.Bubble_float("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(96,456.2,1,1,0,0,0,96,456.2);

	this.instance_1 = new lib.Bubble_break("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(77,437.7,1,1,0,0,0,96,456.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},119).to({state:[]},13).wait(3));
	this.timeline.addTween(cjs.Tween.get(this.instance).to({_off:true,x:77,y:437.7},119).wait(16));

	// Frog_base
	this.instance_2 = new lib.Bear_normal("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30.05,0.054,0.054,0,0,0,0,1);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(119).to({_off:false},0).to({regY:0.6,scaleX:1,scaleY:1,x:0,y:-29.4},10,cjs.Ease.cubicOut).to({y:0.6},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-207,-206.5,473.5,1203.9);


(lib.Bear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":7,"fear":16,"defeated":22});

	// Hedgehog
	this.normal = new lib.Bear_normal();
	this.normal.name = "normal";
	this.normal.parent = this;

	this.spawn = new lib.Bear_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;

	this.fear = new lib.Bear_fear();
	this.fear.name = "fear";
	this.fear.parent = this;

	this.defeated = new lib.Bear_defeated();
	this.defeated.name = "defeated";
	this.defeated.parent = this;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},7).to({state:[{t:this.fear}]},9).to({state:[{t:this.defeated}]},6).wait(10));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.5,-2.9,101.9,1000.3);


(lib.MainTitle = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"start":0,waitToStart:118,toArea:129,opEnd:186});

	// StartButton
	this.startButton = new lib.StartButton();
	this.startButton.name = "startButton";
	this.startButton.parent = this;
	this.startButton.setTransform(600,780);

	this.instance = new lib.StartButton_anim("synched",8,false);
	this.instance.parent = this;
	this.instance.setTransform(600,780);
	this.instance._off = true;

	this.instance_1 = new lib.StartButton_remove("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(600,450);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.startButton}]},110).to({state:[{t:this.instance}]},19).to({state:[{t:this.instance}]},3).to({state:[{t:this.instance}]},5).to({state:[{t:this.instance_1}]},1).to({state:[{t:this.instance_1}]},8).to({state:[]},1).wait(40));
	this.timeline.addTween(cjs.Tween.get(this.instance).wait(129).to({_off:false},0).to({scaleX:1.398,scaleY:1.398},3).to({scaleX:1.0268,scaleY:1.0268,x:600.05,y:780.05},5).to({_off:true},1).wait(49));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(138).to({_off:false},0).to({regX:0.1,scaleX:9.057,scaleY:9.057,x:600.9,y:-2424.95,mode:"single",startPosition:7},8).to({_off:true},1).wait(40));

	// T
	this.instance_2 = new lib.T_1("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(36.6,165.85,6.5115,6.5115,-149.791,0,0,-0.1,0);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(34).to({_off:false},0).to({regX:0,scaleX:1,scaleY:1,rotation:0,x:236.35,y:637.95},10).wait(88).to({startPosition:0},0).to({x:-185.5,y:940.4},5).to({_off:true},1).wait(49));

	// Eye
	this.instance_3 = new lib.Eye("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(668.75,573.3,2.7538,2.7538,21.6625);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(10).to({_off:false},0).to({scaleX:17.6247,scaleY:17.6247,rotation:21.6626,x:669.1,y:572.5},3).wait(15).to({startPosition:0},0).to({_off:true},1).wait(158));

	// Eye
	this.instance_4 = new lib.Eye("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(742.45,375.95,2.8426,2.8426,21.6626);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(9).to({_off:false},0).to({scaleX:17.6247,scaleY:17.6247},3).wait(16).to({startPosition:0},0).to({_off:true},1).wait(158));

	// BodyPart
	this.instance_5 = new lib.BodyPart("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(599.45,461.4,0.4405,0.4405,21.6621);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({scaleX:17.6247,scaleY:17.6247,rotation:21.6626,x:599.8,y:460.6},4,cjs.Ease.quadOut).wait(24).to({startPosition:0},0).to({_off:true},1).wait(158));

	// TitleAnim_scurve
	this.instance_6 = new lib.TitleAnim_s_no_guide("synched",1,false);
	this.instance_6.parent = this;
	this.instance_6.setTransform(157.7,1187.45,17.6247,17.6247,21.6626,0,0,-2.5,44.8);
	this.instance_6._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(29).to({_off:false},0).wait(1).to({regX:-38.1,regY:91.6,scaleX:16.0429,scaleY:16.0429,rotation:21.6476,x:-441.9,y:1621.5,startPosition:2},0).wait(1).to({scaleX:14.4871,scaleY:14.4871,rotation:21.6329,x:-158.6,y:1522.35,startPosition:3},0).wait(1).to({scaleX:12.9833,scaleY:12.9833,rotation:21.6186,x:115.15,y:1426.45,startPosition:4},0).wait(1).to({scaleX:11.5554,scaleY:11.5554,rotation:21.6051,x:375,y:1335.3,startPosition:5},0).wait(1).to({scaleX:10.2228,scaleY:10.2228,rotation:21.5924,x:617.6,y:1250.25,startPosition:6},0).wait(1).to({scaleX:8.9972,scaleY:8.9972,rotation:21.5808,x:840.65,y:1171.95,startPosition:7},0).wait(1).to({regX:-2.5,regY:44.8,scaleX:7.8837,scaleY:7.8837,rotation:21.5703,x:1439.95,y:860.95,startPosition:8},0).wait(1).to({regX:-38.1,regY:91.6,scaleX:7.1723,scaleY:7.1723,rotation:21.5685,x:988.95,y:1002.35,startPosition:9},0).wait(1).to({scaleX:6.5357,scaleY:6.5357,rotation:21.5669,x:940.4,y:914.1,startPosition:10},0).wait(1).to({scaleX:5.9684,scaleY:5.9684,rotation:21.5654,x:897,y:835.55,startPosition:11},0).wait(1).to({scaleX:5.4643,scaleY:5.4643,rotation:21.5642,x:858.55,y:765.75,startPosition:12},0).wait(1).to({scaleX:5.0168,scaleY:5.0168,rotation:21.563,x:824.35,y:703.7,startPosition:13},0).wait(1).to({scaleX:4.6201,scaleY:4.6201,rotation:21.562,x:794.05,y:648.8,startPosition:14},0).wait(1).to({scaleX:4.2687,scaleY:4.2687,rotation:21.5611,x:767.2,y:600.15,startPosition:15},0).wait(1).to({scaleX:3.9575,scaleY:3.9575,rotation:21.5604,x:743.45,y:557.05,startPosition:16},0).wait(1).to({regX:-2.5,regY:44.8,scaleX:3.6823,scaleY:3.6823,rotation:21.5597,x:907.55,y:406.7,startPosition:17},0).wait(1).to({regX:-38.1,regY:91.6,scaleX:3.6306,scaleY:3.6306,rotation:21.5754,x:728.2,y:511.95,startPosition:18},0).wait(1).to({scaleX:3.585,scaleY:3.585,rotation:21.5893,x:733.5,y:505.9,startPosition:19},0).wait(1).to({scaleX:3.5449,scaleY:3.5449,rotation:21.6016,x:738.1,y:500.55,startPosition:20},0).wait(1).to({scaleX:3.5098,scaleY:3.5098,rotation:21.6123,x:742.25,y:495.85,startPosition:21},0).wait(1).to({scaleX:3.4791,scaleY:3.4791,rotation:21.6216,x:745.7,y:491.75,startPosition:22},0).wait(1).to({scaleX:3.4525,scaleY:3.4525,rotation:21.6298,x:748.8,y:488.2,startPosition:23},0).wait(1).to({scaleX:3.4295,scaleY:3.4295,rotation:21.6368,x:751.45,y:485.15,startPosition:24},0).wait(1).to({scaleX:3.4099,scaleY:3.4099,rotation:21.6428,x:753.75,y:482.55,startPosition:25},0).wait(1).to({scaleX:3.3933,scaleY:3.3933,rotation:21.6478,x:755.7,y:480.35,startPosition:26},0).wait(1).to({scaleX:3.3796,scaleY:3.3796,rotation:21.652,x:757.25,y:478.5,startPosition:27},0).wait(1).to({scaleX:3.3685,scaleY:3.3685,rotation:21.6554,x:758.55,y:477.05,startPosition:28},0).wait(1).to({scaleX:3.3597,scaleY:3.3597,rotation:21.6581,x:759.55,y:475.85,startPosition:29},0).wait(1).to({scaleX:3.3531,scaleY:3.3531,rotation:21.6601,x:760.3,y:475,startPosition:30},0).wait(1).to({scaleX:3.3486,scaleY:3.3486,rotation:21.6615,x:760.85,y:474.4,startPosition:31},0).wait(1).to({scaleX:3.346,scaleY:3.346,rotation:21.6623,x:761.1,y:474.05,startPosition:32},0).wait(1).to({regX:-2.6,regY:45.1,scaleX:3.3451,scaleY:3.3451,rotation:21.6625,x:929.85,y:372.5,startPosition:33},0).wait(30).to({startPosition:63},0).to({scaleX:2.1042,scaleY:2.1042,rotation:21.5658,x:722.35,y:381.45,startPosition:67},4).to({regX:-2.5,regY:45.2,scaleX:1.3387,scaleY:1.3387,rotation:21.6622,x:547.8,y:406.65,startPosition:70},8).to({regX:-2.6,regY:45.1,scaleX:1.9201,scaleY:1.9201,rotation:21.6625,x:632.1,y:376.25},2).wait(26).to({startPosition:70},0).to({y:-387.9},6).to({_off:true},1).wait(49));

	// NAKE
	this.instance_7 = new lib.Nake("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(1477.45,593.75);
	this.instance_7._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(88).to({_off:false},0).to({x:846.75},14,cjs.Ease.quadOut).to({x:930.5},4).wait(1).to({x:918.5},0).wait(23).to({startPosition:0},0).to({x:1518.15},7).to({_off:true},1).wait(49));

	// YFTs
	this.instance_8 = new lib.YFTs("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(-3.7,-240.25,3.0753,3.0753,0,0,0,0.1,0.1);
	this.instance_8._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(104).to({_off:false},0).to({regX:0,regY:0,scaleX:0.9207,scaleY:0.9207,x:239.1,y:204.3},5).wait(1).to({scaleX:1,scaleY:1,x:241.8},0).wait(19).to({startPosition:0},0).to({x:-193.3,y:-238.8},8).to({_off:true},1).wait(49));

	// bg
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFEDCC").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFEDCC").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMngEgLCAohQklEkAAGfQAAGeElElQElElGdAAQGeAAEmklQEkklAAmeQAAmfkkkkQkmklmeAAQmdAAklElg");
	this.shape_1.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape}]}).to({state:[{t:this.shape_1}]},110).to({state:[]},28).wait(49));

	// Tunnel
	this.instance_9 = new lib.Tunnel("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(597,780.05,1,1,0,0,0,960,540);
	this.instance_9._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_9).wait(111).to({_off:false},0).wait(7).to({mode:"single",startPosition:1},0).wait(20).to({mode:"synched",startPosition:0},0).to({regX:959.9,scaleX:0.8333,scaleY:0.8333,x:599.8,y:450,startPosition:1},6).to({scaleX:1.0117,scaleY:1.0118,x:599.9,startPosition:0},32).to({regY:539.9,scaleX:1.0229,scaleY:1.0229,y:449.95,mode:"single",startPosition:2},2).to({regX:959.8,regY:539.5,scaleX:18.668,scaleY:18.6693,x:599.05,y:446.45},8).wait(1));

	// area
	this.instance_10 = new lib.Area_1("single",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(598.7,783.75,0.0385,0.0385,0,0,0,612.5,469.4);
	this.instance_10._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_10).wait(111).to({_off:false},0).wait(27).to({startPosition:0},0).to({y:452.65},6).to({regX:613.1,regY:469.6,scaleX:0.1066,scaleY:0.1066,x:602.65,y:452.75},34).to({regX:602.8,regY:461.9,scaleX:1,scaleY:1,x:602.8,y:461.9},8).wait(1));

	// bg_area
	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape_2.setTransform(600,450);
	this.shape_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.shape_2).wait(111).to({_off:false},0).wait(76));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-17318.5,-9625.6,35842.6,20162.800000000003);


(lib.Area_2 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"start":0,"goButtonReady":12,"waitToGo":72,goEnd:93});

	// GoButton
	this.instance = new lib.GoButton_anim("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(600,400);

	this.goButton = new lib.GoButton();
	this.goButton.name = "goButton";
	this.goButton.parent = this;
	this.goButton.setTransform(600,400);
	this.goButton._off = true;

	this.instance_1 = new lib.GoButton("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(600,400,1.398,1.398);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},4).to({state:[{t:this.goButton}]},8).to({state:[{t:this.goButton}]},60).to({state:[{t:this.instance_1}]},3).to({state:[{t:this.instance_1}]},5).to({state:[{t:this.instance_1}]},13).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.goButton).wait(12).to({_off:false},0).wait(60).to({_off:true,scaleX:1.398,scaleY:1.398,mode:"synched",startPosition:0,loop:false},3).wait(19));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(72).to({_off:false},3).to({scaleX:1.0268,scaleY:1.0268,x:600.05},5).to({regX:0.1,regY:0.1,scaleX:9.6717,scaleY:9.6717,x:599.7,y:400.5,alpha:0},13).wait(1));

	// Exp_1
	this.instance_2 = new lib.Exp_2("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(204.8,28,1,1,0,0,0,204.8,28);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(4).to({_off:false},0).wait(68).to({startPosition:70},0).to({x:1392.9,startPosition:27},8).wait(14));

	// AreaAnim
	this.instance_3 = new lib.AreaAnim_2("synched",0,false);
	this.instance_3.parent = this;
	this.instance_3.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(72).to({startPosition:71},0).to({alpha:0},8).wait(14));

	// bg
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#BAD5F7").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(94));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-397.4,-596.6,2272.3,1992.3000000000002);


(lib.Exp_7 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Spider_spawn("synched",119);
	this.instance.parent = this;
	this.instance.setTransform(270.85,488.45,2.2625,2.2625,0,0,0,30,30);

	this.instance_1 = new lib.Spider_sa("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(270.85,488.45,2.2625,2.2625,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},16).wait(76));

	// exp_text_1
	this.instance_2 = new lib.exp_text_7("single",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(1733,314.9,1,1,0,0,0,507.7,288.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({x:540.95,mode:"synched",loop:false},9,cjs.Ease.quadOut).wait(83));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-265.3,-46.6,2316.4,1071.3);


(lib.Exp_6 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Bear_spawn("synched",119);
	this.instance.parent = this;
	this.instance.setTransform(270.85,488.45,2.2625,2.2625,0,0,0,30,30);

	this.instance_1 = new lib.Bear_normal("synched",39);
	this.instance_1.parent = this;
	this.instance_1.setTransform(270.85,488.45,2.2625,2.2625,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},16).wait(76));

	// exp_text_1
	this.instance_2 = new lib.exp_text_6("single",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(1733,314.9,1,1,0,0,0,507.7,288.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({x:540.95,mode:"synched",loop:false},9,cjs.Ease.quadOut).wait(83));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-265.3,-46.6,2140.2000000000003,1071.3);


(lib.Exp_4 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Mouse_spawn("synched",119);
	this.instance.parent = this;
	this.instance.setTransform(270.85,488.45,2.2625,2.2625,0,0,0,30,30);

	this.instance_1 = new lib.Mouse_normal("synched",15);
	this.instance_1.parent = this;
	this.instance_1.setTransform(270.85,488.45,2.2625,2.2625,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},16).wait(76));

	// exp_text_1
	this.instance_2 = new lib.exp_text_4("single",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(1733,314.9,1,1,0,0,0,507.7,288.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({x:540.95,mode:"synched",loop:false},9,cjs.Ease.quadOut).wait(83));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-265.3,-46.6,2140.2000000000003,1071.3);


(lib.Hedgehog_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bubble_float
	this.instance = new lib.Bubble_float("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(96,456.2,1,1,0,0,0,96,456.2);

	this.instance_1 = new lib.Bubble_break("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(77,437.7,1,1,0,0,0,96,456.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},119).to({state:[]},13).wait(3));
	this.timeline.addTween(cjs.Tween.get(this.instance).to({_off:true,x:77,y:437.7},119).wait(16));

	// Frog_base
	this.instance_2 = new lib.Hedgehog_normal("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30.05,0.054,0.054,0,0,0,0,1);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(119).to({_off:false},0).to({regY:0.6,scaleX:1,scaleY:1,x:0,y:-29.4},10,cjs.Ease.cubicOut).to({y:0.6},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-207,-206.5,473.5,1203.9);


(lib.Hedgehog = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":7,"fear":16,"defeated":22,"sa":32});

	// Hedgehog
	this.normal = new lib.Hedgehog_normal();
	this.normal.name = "normal";
	this.normal.parent = this;

	this.spawn = new lib.Hedgehog_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;

	this.fear = new lib.Hedgehog_fear_1();
	this.fear.name = "fear";
	this.fear.parent = this;

	this.defeated = new lib.Hedgehog_defeated();
	this.defeated.name = "defeated";
	this.defeated.parent = this;

	this.normal_1 = new lib.Hedgehog_sa();
	this.normal_1.name = "normal_1";
	this.normal_1.parent = this;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},7).to({state:[{t:this.fear}]},9).to({state:[{t:this.defeated}]},6).to({state:[{t:this.normal_1}]},10).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-7.6,-22.9,105,1020.3);


(lib.Enemies = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Spider
	this.instance = new lib.Spider();
	this.instance.parent = this;
	this.instance.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	// Bear
	this.instance_1 = new lib.Bear();
	this.instance_1.parent = this;
	this.instance_1.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(1));

	// Mouse
	this.instance_2 = new lib.Mouse();
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(1));

	// Hedgehog
	this.instance_3 = new lib.Hedgehog();
	this.instance_3.parent = this;
	this.instance_3.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(1));

	// Cancer
	this.instance_4 = new lib.Cancer();
	this.instance_4.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1));

	// Frog
	this.instance_5 = new lib.Frog();
	this.instance_5.parent = this;
	this.instance_5.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(1));

}).prototype = getMCSymbolPrototype(lib.Enemies, new cjs.Rectangle(-17.6,-10,95.6,77), null);


(lib.Area_7 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"start":0,"goButtonReady":12,"waitToGo":72});

	// GoButton
	this.instance = new lib.GoButton_anim("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(600,400);

	this.goButton = new lib.GoButton();
	this.goButton.name = "goButton";
	this.goButton.parent = this;
	this.goButton.setTransform(600,400);
	this.goButton._off = true;

	this.instance_1 = new lib.GoButton("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(600,400,1.398,1.398);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},4).to({state:[{t:this.goButton}]},8).to({state:[{t:this.goButton}]},60).to({state:[{t:this.instance_1}]},3).to({state:[{t:this.instance_1}]},5).to({state:[{t:this.instance_1}]},13).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.goButton).wait(12).to({_off:false},0).wait(60).to({_off:true,scaleX:1.398,scaleY:1.398,mode:"synched",startPosition:0,loop:false},3).wait(19));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(72).to({_off:false},3).to({scaleX:1.0268,scaleY:1.0268,x:600.05},5).to({regX:0.1,regY:0.1,scaleX:9.6717,scaleY:9.6717,x:599.7,y:400.5,alpha:0},13).wait(1));

	// Exp_1
	this.instance_2 = new lib.Exp_7("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(204.8,28,1,1,0,0,0,204.8,28);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(4).to({_off:false},0).wait(68).to({startPosition:70},0).to({x:1392.9,startPosition:27},8).wait(14));

	// AreaAnim
	this.instance_3 = new lib.AreaAnim_7("synched",0,false);
	this.instance_3.parent = this;
	this.instance_3.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(72).to({startPosition:71},0).to({alpha:0},8).wait(14));

	// bg
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#BAD5F7").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(94));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-397.4,-596.6,2448.5,1992.3000000000002);


(lib.Area_6 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"start":0,"goButtonReady":12,"waitToGo":72});

	// GoButton
	this.instance = new lib.GoButton_anim("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(600,400);

	this.goButton = new lib.GoButton();
	this.goButton.name = "goButton";
	this.goButton.parent = this;
	this.goButton.setTransform(600,400);
	this.goButton._off = true;

	this.instance_1 = new lib.GoButton("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(600,400,1.398,1.398);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},4).to({state:[{t:this.goButton}]},8).to({state:[{t:this.goButton}]},60).to({state:[{t:this.instance_1}]},3).to({state:[{t:this.instance_1}]},5).to({state:[{t:this.instance_1}]},13).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.goButton).wait(12).to({_off:false},0).wait(60).to({_off:true,scaleX:1.398,scaleY:1.398,mode:"synched",startPosition:0,loop:false},3).wait(19));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(72).to({_off:false},3).to({scaleX:1.0268,scaleY:1.0268,x:600.05},5).to({regX:0.1,regY:0.1,scaleX:9.6717,scaleY:9.6717,x:599.7,y:400.5,alpha:0},13).wait(1));

	// Exp_1
	this.instance_2 = new lib.Exp_6("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(204.8,28,1,1,0,0,0,204.8,28);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(4).to({_off:false},0).wait(68).to({startPosition:70},0).to({x:1392.9,startPosition:27},8).wait(14));

	// AreaAnim
	this.instance_3 = new lib.AreaAnim_6("synched",0,false);
	this.instance_3.parent = this;
	this.instance_3.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(72).to({startPosition:71},0).to({alpha:0},8).wait(14));

	// bg
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#BAD5F7").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(94));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-397.4,-596.6,2272.3,1992.3000000000002);


(lib.Area_4 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"start":0,"goButtonReady":12,"waitToGo":72});

	// GoButton
	this.instance = new lib.GoButton_anim("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(600,400);

	this.goButton = new lib.GoButton();
	this.goButton.name = "goButton";
	this.goButton.parent = this;
	this.goButton.setTransform(600,400);
	this.goButton._off = true;

	this.instance_1 = new lib.GoButton("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(600,400,1.398,1.398);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},4).to({state:[{t:this.goButton}]},8).to({state:[{t:this.goButton}]},60).to({state:[{t:this.instance_1}]},3).to({state:[{t:this.instance_1}]},5).to({state:[{t:this.instance_1}]},13).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.goButton).wait(12).to({_off:false},0).wait(60).to({_off:true,scaleX:1.398,scaleY:1.398,mode:"synched",startPosition:0,loop:false},3).wait(19));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(72).to({_off:false},3).to({scaleX:1.0268,scaleY:1.0268,x:600.05},5).to({regX:0.1,regY:0.1,scaleX:9.6717,scaleY:9.6717,x:599.7,y:400.5,alpha:0},13).wait(1));

	// Exp_1
	this.instance_2 = new lib.Exp_4("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(204.8,28,1,1,0,0,0,204.8,28);

	this.instance_3 = new lib.Exp_1("synched",70);
	this.instance_3.parent = this;
	this.instance_3.setTransform(204.8,28,1,1,0,0,0,204.8,28);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance_2}]},4).to({state:[{t:this.instance_3}]},68).to({state:[{t:this.instance_3}]},8).wait(14));
	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(72).to({_off:false},0).to({x:1392.9,startPosition:27},8).wait(14));

	// AreaAnim
	this.instance_4 = new lib.AreaAnim_4("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(72).to({startPosition:71},0).to({alpha:0},8).wait(14));

	// bg
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#BAD5F7").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(94));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-397.4,-596.6,2608.2000000000003,1992.3000000000002);


(lib.Exp_3 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Frog_normal
	this.instance = new lib.Hedgehog_spawn("synched",116,false);
	this.instance.parent = this;
	this.instance.setTransform(271.45,507.4,2.2625,2.2625,0,0,0,30,30);

	this.instance_1 = new lib.Hedgehog_sa("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(270.85,488.45,2.2625,2.2625,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},19).wait(73));

	// exp_text_1
	this.instance_2 = new lib.exp_text_3("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(1594.65,169.85,1,1,0,0,0,367.7,145);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({x:457.15},9,cjs.Ease.quadOut).wait(83));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-264.7,-27.6,2141.2999999999997,1071.3);


(lib.Area_3 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"start":0,"goButtonReady":12,"waitToGo":72});

	// GoButton
	this.instance = new lib.GoButton_anim("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(600,400);

	this.goButton = new lib.GoButton();
	this.goButton.name = "goButton";
	this.goButton.parent = this;
	this.goButton.setTransform(600,400);
	this.goButton._off = true;

	this.instance_1 = new lib.GoButton("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(600,400,1.398,1.398);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},4).to({state:[{t:this.goButton}]},8).to({state:[{t:this.goButton}]},60).to({state:[{t:this.instance_1}]},3).to({state:[{t:this.instance_1}]},5).to({state:[{t:this.instance_1}]},13).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.goButton).wait(12).to({_off:false},0).wait(60).to({_off:true,scaleX:1.398,scaleY:1.398,mode:"synched",startPosition:0,loop:false},3).wait(19));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(72).to({_off:false},3).to({scaleX:1.0268,scaleY:1.0268,x:600.05},5).to({regX:0.1,regY:0.1,scaleX:9.6717,scaleY:9.6717,x:599.7,y:400.5,alpha:0},13).wait(1));

	// Exp_1
	this.instance_2 = new lib.Exp_3("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(204.8,28,1,1,0,0,0,204.8,28);
	this.instance_2._off = true;

	this.instance_3 = new lib.Exp_1("synched",27);
	this.instance_3.parent = this;
	this.instance_3.setTransform(1392.9,28,1,1,0,0,0,204.8,28);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance_2}]},4).to({state:[{t:this.instance_2}]},68).to({state:[{t:this.instance_3}]},8).wait(14));
	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(4).to({_off:false},0).wait(68).to({startPosition:70},0).to({_off:true,x:1392.9,startPosition:27},8).wait(14));

	// AreaAnim
	this.instance_4 = new lib.AreaAnim_3("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(72).to({startPosition:71},0).to({alpha:0},8).wait(14));

	// bg
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#BAD5F7").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(94));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-397.4,-596.6,2608.2000000000003,1992.3000000000002);


(lib.AreaTitle_graphics = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{area_0:0,area_1:9,area_2:17,area_3:26,area_4:35,area_5:44,area_6:55,area_7:65});

	// Area_1
	this.instance = new lib.Area_1("single",0);
	this.instance.parent = this;
	this.instance.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.instance_1 = new lib.Area_2("single",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.instance_2 = new lib.Area_3("single",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.instance_3 = new lib.Area_4("single",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.instance_4 = new lib.Area_5("single",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.instance_5 = new lib.Area_6("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.instance_6 = new lib.Area_7("single",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.instance_7 = new lib.Area_8("single",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},9).to({state:[{t:this.instance_2}]},8).to({state:[{t:this.instance_3}]},9).to({state:[{t:this.instance_4}]},9).to({state:[{t:this.instance_5}]},9).to({state:[{t:this.instance_6}]},11).to({state:[{t:this.instance_7}]},10).wait(8));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-355.7,1200,1598.9);


(lib.AreaTitle = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// areaTitleAnim_7
	this.areaTitleAnim_7 = new lib.Area_8();
	this.areaTitleAnim_7.name = "areaTitleAnim_7";
	this.areaTitleAnim_7.parent = this;
	this.areaTitleAnim_7.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.timeline.addTween(cjs.Tween.get(this.areaTitleAnim_7).wait(75));

	// areaTitleAnim_6
	this.areaTitleAnim_6 = new lib.Area_7();
	this.areaTitleAnim_6.name = "areaTitleAnim_6";
	this.areaTitleAnim_6.parent = this;
	this.areaTitleAnim_6.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.timeline.addTween(cjs.Tween.get(this.areaTitleAnim_6).wait(75));

	// areaTitleAnim_5
	this.areaTitleAnim_5 = new lib.Area_6();
	this.areaTitleAnim_5.name = "areaTitleAnim_5";
	this.areaTitleAnim_5.parent = this;
	this.areaTitleAnim_5.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.timeline.addTween(cjs.Tween.get(this.areaTitleAnim_5).wait(75));

	// areaTitleAnim_4
	this.areaTitleAnim_4 = new lib.Area_5();
	this.areaTitleAnim_4.name = "areaTitleAnim_4";
	this.areaTitleAnim_4.parent = this;
	this.areaTitleAnim_4.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.timeline.addTween(cjs.Tween.get(this.areaTitleAnim_4).wait(75));

	// areaTitleAnim_3
	this.areaTitleAnim_3 = new lib.Area_4();
	this.areaTitleAnim_3.name = "areaTitleAnim_3";
	this.areaTitleAnim_3.parent = this;
	this.areaTitleAnim_3.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.timeline.addTween(cjs.Tween.get(this.areaTitleAnim_3).wait(75));

	// areaTitleAnim_2
	this.areaTitleAnim_2 = new lib.Area_3();
	this.areaTitleAnim_2.name = "areaTitleAnim_2";
	this.areaTitleAnim_2.parent = this;
	this.areaTitleAnim_2.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.timeline.addTween(cjs.Tween.get(this.areaTitleAnim_2).wait(75));

	// areaTitleAnim_1
	this.areaTitleAnim_1 = new lib.Area_2();
	this.areaTitleAnim_1.name = "areaTitleAnim_1";
	this.areaTitleAnim_1.parent = this;
	this.areaTitleAnim_1.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.timeline.addTween(cjs.Tween.get(this.areaTitleAnim_1).wait(75));

	// areaTitleAnim_0
	this.areaTitleAnim_0 = new lib.Area_1();
	this.areaTitleAnim_0.name = "areaTitleAnim_0";
	this.areaTitleAnim_0.parent = this;
	this.areaTitleAnim_0.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.timeline.addTween(cjs.Tween.get(this.areaTitleAnim_0).wait(75));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-355.8,1200,1598.8999999999999);


(lib.Gate_go = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// wave2
	this.instance = new lib.Gate_wave();
	this.instance.parent = this;
	this.instance.setTransform(30,30,0.6393,0.6393);
	this.instance._off = true;

	this.instance_1 = new lib.Gate_outer();
	this.instance_1.parent = this;
	this.instance_1.setTransform(30.85,30.85,8.494,8.494,0,0,0,0.1,0.1);
	this.instance_1.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},2).to({state:[{t:this.instance_1}]},10).to({state:[]},1).wait(111));
	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({_off:false},0).to({_off:true,regX:0.1,regY:0.1,scaleX:8.494,scaleY:8.494,x:30.85,y:30.85,alpha:0},10,cjs.Ease.quadOut).wait(112));

	// wave
	this.instance_2 = new lib.Gate_wave();
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30,0.7383,0.7383);

	this.instance_3 = new lib.Gate_outer();
	this.instance_3.parent = this;
	this.instance_3.setTransform(30.85,30.85,8.494,8.494,0,0,0,0.1,0.1);
	this.instance_3.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_2}]}).to({state:[{t:this.instance_3}]},10).to({state:[]},1).wait(113));
	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({_off:true,regX:0.1,regY:0.1,scaleX:8.494,scaleY:8.494,x:30.85,y:30.85,alpha:0},10,cjs.Ease.quadOut).wait(114));

	// gate
	this.instance_4 = new lib.Gate_base("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({scaleX:39.0085,scaleY:39.0085,rotation:690.6513,x:26.1,y:26,startPosition:23},65).to({regX:29.8,regY:29.8,scaleX:92.1537,scaleY:92.1537,rotation:720,x:20.35,y:20.35,alpha:0,startPosition:45},32).to({_off:true},1).wait(26));

	// tunnel
	this.instance_5 = new lib.Tunnel("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(0,0,1,1,0,0,0,960,540);
	this.instance_5._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(65).to({_off:false},0).wait(1).to({startPosition:0},0).to({regX:959.9,regY:539.9,scaleX:1.3521,scaleY:1.3521,x:-0.15,y:-0.15},6).to({regX:960,regY:540,scaleX:2.1151,scaleY:2.1151,x:0.2,y:0.15},34).to({regX:959.8,regY:539.9,scaleX:18.6351,scaleY:18.6351,x:-0.15},17).wait(1));

	// area
	this.areaTitle = new lib.AreaTitle_graphics();
	this.areaTitle.name = "areaTitle";
	this.areaTitle.parent = this;
	this.areaTitle.setTransform(0.45,0.7,0.1012,0.0998,0,0,0,611.3,469.1);
	this.areaTitle._off = true;

	this.timeline.addTween(cjs.Tween.get(this.areaTitle).wait(66).to({_off:false},0).to({regX:611.4,regY:468.9,scaleX:0.1354,scaleY:0.1354,x:-1.4,y:2.6},6).to({regX:612.8,regY:469.6,scaleX:0.2497,scaleY:0.2497,x:2.6,y:2.75},34).to({regX:612.7,regY:469.5,scaleX:0.9062,scaleY:0.9062,x:2.75,y:10.7},7).to({regX:602.7,regY:461.9,scaleX:1,scaleY:1,x:2.7,y:11.9},10).wait(1));

	// bg
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EjRuCLuMAAAkXbMGjdAAAMAAAEXbg");
	this.shape.setTransform(105.925,193.275);
	this.shape._off = true;

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(66).to({_off:false},0).to({_off:true},57).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-17886,-10060.9,35779.3,20125.9);


(lib.Gate = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":6,going:13,go:19});

	// Key
	this.normal = new lib.Gate_normal();
	this.normal.name = "normal";
	this.normal.parent = this;
	this.normal.setTransform(30,30,1,1,0,0,0,30,30);

	this.spawn = new lib.Gate_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(30,30,1,1,0,0,0,30,30);

	this.going = new lib.Gate_normal();
	this.going.name = "going";
	this.going.parent = this;
	this.going.setTransform(30,30,1,1,0,0,0,30,30);

	this.go = new lib.Gate_go();
	this.go.name = "go";
	this.go.parent = this;
	this.go.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},6).to({state:[{t:this.going}]},7).to({state:[{t:this.go}]},6).wait(6));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,60,60);


(lib.Items = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// gate
	this.gate = new lib.Gate();
	this.gate.name = "gate";
	this.gate.parent = this;
	this.gate.setTransform(12,26.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get(this.gate).wait(1));

	// berry
	this.berry = new lib.Berry();
	this.berry.name = "berry";
	this.berry.parent = this;
	this.berry.setTransform(12,26.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get(this.berry).wait(1));

	// wine
	this.wine = new lib.Wine();
	this.wine.name = "wine";
	this.wine.parent = this;
	this.wine.setTransform(12,26.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get(this.wine).wait(1));

	// apple
	this.apple = new lib.Apple();
	this.apple.name = "apple";
	this.apple.parent = this;
	this.apple.setTransform(12,26.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get(this.apple).wait(1));

	// key
	this.key = new lib.Key();
	this.key.name = "key";
	this.key.parent = this;
	this.key.setTransform(12,26.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get(this.key).wait(1));

	// coin
	this.coin = new lib.Coin();
	this.coin.name = "coin";
	this.coin.parent = this;
	this.coin.setTransform(12,26.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get(this.coin).wait(1));

	// レイヤー_2
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#000066").ss(0.1,1,1).p("AkrkrIJXAAIAAJXIpXAAg");
	this.shape.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = getMCSymbolPrototype(lib.Items, new cjs.Rectangle(-1,-1,62,62), null);


// stage content:
(lib.tsnake_v004 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Tile
	this.instance = new lib.Tile("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	// StatusBar
	this.instance_1 = new lib.StatusBar();
	this.instance_1.parent = this;
	this.instance_1.setTransform(100,20,1,1,0,0,0,100,20);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(1));

	// Snake
	this.instance_2 = new lib.SnakeHead();
	this.instance_2.parent = this;
	this.instance_2.setTransform(180.05,263.45,1,1,0,0,0,27.1,27.1);

	this.instance_3 = new lib.SnakeBody();
	this.instance_3.parent = this;
	this.instance_3.setTransform(116.85,264,1,1,0,0,0,27.1,27.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_3},{t:this.instance_2}]}).wait(1));

	// Enemies
	this.instance_4 = new lib.Enemies();
	this.instance_4.parent = this;
	this.instance_4.setTransform(66.55,138.85,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1));

	// Items
	this.instance_5 = new lib.Items();
	this.instance_5.parent = this;
	this.instance_5.setTransform(144.2,104.85);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(1));

	// MainTitle
	this.instance_6 = new lib.MainTitle();
	this.instance_6.parent = this;
	this.instance_6.setTransform(596.1,431.7,1,1,0,0,0,596.1,431.7);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(1));

	// AreaTitle
	this.instance_7 = new lib.AreaTitle("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(828.05,668.7,1,1,0,0,0,596.1,431.7);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(1));

	// Background
	this.instance_8 = new lib.Background();
	this.instance_8.parent = this;
	this.instance_8.setTransform(600,498.7,1,1,0,0,0,600,498.7);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(600,331.3,832,1148.9);
// library properties:
lib.properties = {
	id: '12203EAFB022374BAF15F927FCA8A97A',
	width: 1200,
	height: 900,
	fps: 24,
	color: "#CCCCCC",
	opacity: 1.00,
	manifest: [
		{src:"images/T.png", id:"T"},
		{src:"images/tunnel_0001.jpg", id:"tunnel_0001"},
		{src:"images/tunnel_0002.jpg", id:"tunnel_0002"},
		{src:"images/tunnel_0003.jpg", id:"tunnel_0003"},
		{src:"images/wasd.png", id:"wasd"},
		{src:"images/yfts.png", id:"yfts"}
	],
	preloads: []
};



// bootstrap callback support:

(lib.Stage = function(canvas) {
	createjs.Stage.call(this, canvas);
}).prototype = p = new createjs.Stage();

p.setAutoPlay = function(autoPlay) {
	this.tickEnabled = autoPlay;
}
p.play = function() { this.tickEnabled = true; this.getChildAt(0).gotoAndPlay(this.getTimelinePosition()) }
p.stop = function(ms) { if(ms) this.seek(ms); this.tickEnabled = false; }
p.seek = function(ms) { this.tickEnabled = true; this.getChildAt(0).gotoAndStop(lib.properties.fps * ms / 1000); }
p.getDuration = function() { return this.getChildAt(0).totalFrames / lib.properties.fps * 1000; }

p.getTimelinePosition = function() { return this.getChildAt(0).currentFrame / lib.properties.fps * 1000; }

an.bootcompsLoaded = an.bootcompsLoaded || [];
if(!an.bootstrapListeners) {
	an.bootstrapListeners=[];
}

an.bootstrapCallback=function(fnCallback) {
	an.bootstrapListeners.push(fnCallback);
	if(an.bootcompsLoaded.length > 0) {
		for(var i=0; i<an.bootcompsLoaded.length; ++i) {
			fnCallback(an.bootcompsLoaded[i]);
		}
	}
};

an.compositions = an.compositions || {};
an.compositions['12203EAFB022374BAF15F927FCA8A97A'] = {
	getStage: function() { return exportRoot.getStage(); },
	getLibrary: function() { return lib; },
	getSpriteSheet: function() { return ss; },
	getImages: function() { return img; }
};

an.compositionLoaded = function(id) {
	an.bootcompsLoaded.push(id);
	for(var j=0; j<an.bootstrapListeners.length; j++) {
		an.bootstrapListeners[j](id);
	}
}

an.getComposition = function(id) {
	return an.compositions[id];
}



})(createjs = createjs||{}, AdobeAn = AdobeAn||{});
var createjs, AdobeAn;
var Cood;

(function () {

    Cood = {
        "UNIT":60,
        "MAX_GX":1200,
        "MAX_GY":900,
        "MAX_X":14,
        "MAX_Y":14,
        "localToWorld": function (local) {
            if(typeof local == "object"){
                return local.mult(this.UNIT);
            } else {
                return local * this.UNIT;
            }
        }
    };

})();



var FieldObject;

(function () {

    FieldObject = function (map, pos, id) {
        if (map) {
            this.init(map, pos, id);
        }
    };

    FieldObject.prototype = {
        "init": function (map, pos, id, state) {
            this.map = map;
            this.id = id;
            this.position = pos.clone();
            this.mc = cjsUtil.createMc(id);
            this.mc.x = this.position.x;
            this.mc.y = this.position.y;
            this.map.addChild(this.mc);
            if(!state || state === "spawn"){
                this.spawn();
            } else {
                this.setState(state);
            }
            this.update(0);
        },
        "update": function (process) {
            this.mc.x = Cood.localToWorld(this.position.x);
            this.mc.y = Cood.localToWorld(this.position.y);
        },
        "setState": function (state, endListener) {
            this.state = state;
            this.mc.gotoAndStop(state);
            if (endListener) {
                this.onEndListener = _.bind(function (e) {
                    if (this.mc[this.state].currentFrame == this.mc[this.state].totalFrames - 1) {
                        this.mc.removeEventListener("tick", this.onEndListener);
                        endListener();
                    }
                }, this);
                this.mc[this.state].addEventListener("tick", this.onEndListener);
            }

        },
        "spawn": function () {
            this.setState("spawn", _.bind(function (e) {
                this.setState("normal");
            }, this));
        },
        "hitTest": function (p) {
            if (this.state == "spawn") {
                return false;
            }
            return this.position.equals(p);
        },
        "remove": function () {
            this.mc.stop();
            this.map.removeChild(this.mc);
            this.mc = null;
            this.state = "removed";
        }
    };

})();
var Vector = function (x, y) {
    this.x = x;
    this.y = y;
};

var DIRECTION;

Vector.prototype = {
    "clone": function () {
        return new Vector(this.x, this.y);
    },
    "set": function (v) {
        this.x = v.x;
        this.y = v.y;
    },
    "add": function (v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    },
    "sub": function (v) {
        this.x -= v.x;
        this.y -= v.y;
    },
    "mult": function (v) {
        return new Vector(this.x * v, this.y * v);
    },
    "dist": function (v) {
        return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.x - v.x, 2));
    },
    "sdist": function (v) {
        return Math.abs(this.x - v.x) + Math.abs(this.y - v.y);
    },
    "isZero": function () {
        return this.x == 0 && this.y == 0;
    },
    "equals": function (v) {
        return this.x == v.x && this.y == v.y;
    },
};

DIRECTION = {
    "n": new Vector(0, -1),
    "e": new Vector(1, 0),
    "s": new Vector(0, 1),
    "w": new Vector(-1, 0)
};



var Enemy;

(function () {

    StartTasks.push(function () {

        var data = {
            "Frog": {
                "dropItemRate": 0.2,
                "score": 2
            },
            "Cancer": {
                "dropItemRate": 0.25,
                "score": 3
            },
            "Hedgehog": {
                "dropItemRate": 0.25,
                "score": 3
            },
            "Mouse": {
                "dropItemRate": 0.1,
                "score": 1
            },
            "Bear": {
                "dropItemRate": 0.5,
                "score": 5
            },
            "Spider": {
                "dropItemRate": 0.3,
                "score": 5
            }
        };

        Enemy = function (map, pos, id) {
            this.init(map, pos, id);
        };

        Enemy.LIMIT = 60;

        Enemy.prototype = new FieldObject();

        Enemy.prototype.attackedTest = function (p) {
            return false;
        };

        Enemy.prototype.isAlive = function () {
            return this.state !== "defeated" &&
                this.state !== "removed";
        }

        Enemy.prototype.defeat = function () {
            this.setState("defeated", _.bind(function () {
                this.remove();
            }, this));
            return Math.random() < data[this.id].dropItemRate;
        };

        Enemy.prototype.setFear = function () {
            if (this.id == "Bear") {
                return;
            }
            if (this.state == "normal") {
                this.setState("fear");
            }
            return false;
        };

        Enemy.prototype.endFear = function () {
            if (this.state == "fear") {
                this.setState("normal");
            }
            return false;
        };

        Enemy.prototype.getScore = function () {
            return data[this.id].score;
        };

        Enemy.prototype.saHitTest = function (p) {
            if (this.state == "spawn") {
                return false;
            }
            if (this.id == "Cancer") {
                return this.position.y == p.y &&
                    Math.abs(this.position.x - p.x) == 1;
            } else if (this.id == "Hedgehog") {
                return this.position.x == p.x &&
                    Math.abs(this.position.y - p.y) == 1;
            } else if (this.id == "Spider") {
                return Math.abs(this.position.x - p.x) <= 1 &&
                    Math.abs(this.position.y - p.y) <= 1;
            } else {
                return false;
            }
        };

    });

})();

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
                game.setVmax(Item.VMAX_DURATION);
                snake.addBody();
            },
            "Wine": function (game, snake) {
                snake.removeBody();
            },
            "Berry": function (game, snake) {
                game.speedDown();
            },
        };

        Item = function (map, pos, id) {
            this.init(map, pos, id);
            this.life = Item.LIFETIME[id];
        };

        Item.DROP_LIMITS = {
            "Gate": 1,
            "Key": 1,
            "Coin": 30,
            "Apple": 30,
            "Wine": 1,
            "Berry": 15,
        }

        Item.LIFETIME = {
            "Gate": 0,
            "Key": 60,
            "Coin": 60,
            "Apple": 60,
            "Wine": 60,
            "Berry": 60,
        }

        Item.prototype = new FieldObject();

        Item.LIMIT = 60;
        Item.VMAX_DURATION = 40;

        Item.prototype.effect = function (game, snake) {
            _.bind(effects[this.id], this)(game, snake);
        };

    });


})();

var KeyManager;

(function () {

    $(window).keypress(function (e) {
        console.log("key:" + e.which);
        if(KeyManager.listeners[e.which]){
            KeyManager.listeners[e.which]();
        }
    });

    KeyManager = {
        "listeners": {},
        "setKeyListeners": function (args) {
            _.each(args, _.bind(function (callback, key) {
                this.listeners[key] = callback;
            }, this));
        }
    };

})();
var SnakeBody;

(function () {

    SnakeBody = function (map, position, isHead) {
        this.map = map;
        this.direction = new Vector(0, 0);
        if (isHead) {
            this.mc = cjsUtil.createMc("SnakeHead");
            this.dir(DIRECTION.s.clone());
        } else {
            this.mc = cjsUtil.createMc("SnakeBody");
        }
        this.setState("normal");
        this.mc.body.gotoAndPlay(Math.floor(Math.random() * 60));
        this.map.addChildAt(this.mc, this.map.numChildren);
        this.position = position.clone();
        this.update(new Vector(0, 0));
    };

    SnakeBody.prototype = {
        "setState": function (label) {
            this.state = label;
            this.mc.gotoAndStop(label);
        },
        "remove": function () {
            this.map.removeChild(this.mc);
            this.mc = null;
        },
        "effect": function () {
        },
        "pos": function (p) {
            this.position.x = p.x;
            this.position.y = p.y;
        },
        "isStopped": function () {
            return this.direction.x == 0 &&
                this.direction.y == 0;
        },
        "setRotation": function (v) {
            _.forEach([this.mc.body, this.mc.bodyVmax, this.mc.bodyVmaxWeak, this.mc.bodyWeak], _.bind(function (b) {
                if (b) {
                    b.rotation = v;
                }
            }, this));
        },
        "dir": function (d) {

            if (d.x == this.direction.x &&
                d.y == this.direction.y) {
                return;
            }

            this.direction.x = d.x;
            this.direction.y = d.y;
            if (d.x == -1) {
                this.setRotation(180);
            } else if (d.x == 1) {
                this.setRotation(0);
            } else {
                if (d.y == 1) {
                    this.setRotation(90);
                } else {
                    this.setRotation(270);
                }
            }
            this.mc.body.gotoAndPlay(Math.floor(Math.random() * 60));
        },
        "update": function (process) {
            this.mc.x = Cood.localToWorld(this.position.x) + process.x;
            this.mc.y = Cood.localToWorld(this.position.y) + process.y;
        }
    };

})();
var Snake;

(function () {

    Snake = function (map, position, numBody) {
        this.map = map;
        this.bodies = [];
        this.isLocked = false;

        if (!numBody) {
            numBody = 6;
        }
        _.times(6, _.bind(function () {
            this.addBody(position);
        }, this));

        this.direction = DIRECTION.s.clone();
    };

    Snake.prototype = {
        "addBody": function (v) {
            if (!v) {
                v = this.bodies[this.bodies.length - 1].position.clone();
            }
            var b = new SnakeBody(this.map, v, this.bodies.length == 0);
            this.bodies.push(b);
        },
        "remove": function () {
            _.forEach(this.bodies, _.bind(function (b) {
                b.remove();
            }, this));
            this.bodies = [];
        },
        "removeBody": function () {
            if(this.bodies.length > 1){
                this.bodies.pop().remove();
            }
        },
        "getState":function(){
            return this.getHead().state;
        },
        "setState":function(state){
            return this.getHead().setState(state);
        },
        "setNormal":function(){
            this.getHead().setState("normal");
        },
        "setWeak":function(){
            this.getHead().setState("weak");
        },
        "startVmax":function(){
            this.getHead().setState("vmax");
        },
        "setVmaxWeak":function(){
            this.getHead().setState("vmax_weak");
        },
        "endVmax":function(){
            this.getHead().setState("normal");
        },
        "move": function (process) {
            _.forEach(this.bodies, _.bind(function (b) {
                b.update(b.direction.mult(process));
            }, this));
        },
        "finish": function () {
            _.forEach(this.bodies, _.bind(function (b) {
                b.position.sub(b.direction);
            }, this));
            this.setDirection(new Vector(0, 0));
            this.isLocked = true;
        },
        "isFinished": function () {
            return _.every(this.bodies, function (b) {
                return b.isStopped();
            });
        },
        "update": function () {

            var prevDir;
            var prevPos;
            var i = 0;
            _.forEach(this.bodies, _.bind(function (b) {
                if (i == 0) {
                    prevDir = b.direction.clone();
                    prevPos = b.position.clone();
                    b.position.add(b.direction);
                    b.dir(this.direction);
                } else {
                    var nextDir = b.direction.clone();
                    var nextPos = b.position.clone();
                    b.dir(prevDir);
                    b.pos(prevPos);
                    prevDir.set(nextDir);
                    prevPos.set(nextPos);
                }

                while (b.position.x >= Cood.MAX_X) {
                    b.position.x -= Cood.MAX_X
                }
                while (b.position.y >= Cood.MAX_Y) {
                    b.position.y -= Cood.MAX_Y
                }
                while (b.position.x < 0) {
                    b.position.x += Cood.MAX_X
                }
                while (b.position.y < 0) {
                    b.position.y += Cood.MAX_Y
                }

                if(!b.direction.isZero()){
                    b.update(new Vector(0, 0));
                }
                i++;
            }, this));

        },
        "selfHitTest": function () {

            var i = 0;
            var headPos;
            var flag = false;

            _.forEach(this.bodies, _.bind(function (b) {
                if (i == 0) {
                    headPos = b.position;
                } else {
                    if (b.position.equals(headPos)) {
                        flag = true;
                    }
                }
                i++;
            }, this));

            return flag;

        },
        "getHead": function () {
            return this.bodies[0];
        },
        "pos": function (p) {
            this.position = p;
        },
        "dir": function (d) {
            this.direction = d;
        },
        "setDirection": function (d) {
            if (this.isLocked) {
                return;
            }
            if (this.getHead().direction.clone().add(d).isZero()) {
                return;
            } else {
                this.direction = d;
            }
        },
    };

})();
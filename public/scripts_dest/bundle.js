var Game;

const _CHEAT_ON = true;

(function () {

    const _SPEEDS = [0, 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60];

    var _rootMc;
    var _backgroundMc;
    var _statusBarMc;
    var _mapMc;

    const _STATUS_BAR_HEIGHT = 60;
    const _NUM_KEYS_MAX = 4;
    const _NUM_HEARTS_MAX = 8;
    const _UNIT_POWER = 500;

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

            if (this.vmax <= 0) {
                this.snake.powerDown(1, _.bind(function () {
                    this.gameOver();
                }, this));
                if(this.snake.power <= _UNIT_POWER){
                    this.snake.setWeak();
                } else if(this.snake.getState() == "weak"){
                    this.snake.setNormal();
                }
            }

            _.times(_NUM_HEARTS_MAX, _.bind(function (i) {
                var mc = _statusBarMc["powerGauge_" + i];

                if (Math.floor(this.snake.power / _UNIT_POWER) < i) {
                    mc.visible = false;
                    mc.gotoAndStop("beat_strong");
                } else if (Math.floor(this.snake.power / _UNIT_POWER) == i) {
                    mc.visible = true;
                    if (this.snake.power % _UNIT_POWER > _UNIT_POWER * 0.6) {
                        mc.gotoAndPlay("beat_strong");
                    } else if (this.snake.power % _UNIT_POWER > _UNIT_POWER * 0.3) {
                        mc.gotoAndPlay("beat_normal");
                    } else {
                        mc.gotoAndPlay("beat_weak");
                    }
                } else {
                    mc.visible = true;
                    mc.gotoAndStop("stop");
                }
            }, this));
        },
        "updateVmaxGauge": function () {

            if (this.isFinishing) {
                return;
            }

            _statusBarMc.vmaxGauge.progress.gotoAndStop(Item.VMAX_DURATION - this.vmax);

            if (this.vmax <= 0) {
                _statusBarMc.vmaxGauge.progress.cover.visible = true;
                _statusBarMc.vmaxGauge.progress.frame.gotoAndStop(0);
            } else {
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
                if (this.snake.bodies.length > 0 &&
                    item.hitTest(this.snake.bodies[0].position)) {
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

            _.find(this.enemies, function (enemy) {
                return enemy.isAlive();
            }).defeat();

        },
        "gameLoop": function () {

            if (this.isGameLoopLocked) {
                return;
            }

            this.updatePower();
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

            if(_CHEAT_ON){
                KeyManager.setKeyListeners({
                    //q
                    "113": _.bind(function () {
                        this.addKey(new Vector(0, 0));
                    }, this),
                });
            }

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
            var tickListener = _.bind(function () {
                mc.go.areaTitle.gotoAndStop("area_" + (this.areaNo + 1));
            }, this);
            mc.addEventListener("tick", tickListener);
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
                if (this.hasSpace(item.id)) {
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
        "hasSpace": function (id) {
            return this.getNumAllItems() >= Item.LIMIT ||
                this.getNumItems(id) >= Item.DROP_LIMITS[id];
        },
        "spawnItem": function (id) {
            if (this.hasSpace(id)) {
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
            this.onClearListener(this.numCoins);
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
        this.numCoins = 0;

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

            var areaTitleMc = cjsUtil.createMc("AreaTitle");
            this.stage.addChild(areaTitleMc);
            areaTitleMc.gotoAndStop("area_" + this.area);

            var areaTitleAnim = areaTitleMc["areaTitleAnim_" + this.area];
            var areaTitleEndListener = _.bind(function () {
                if (areaTitleAnim.currentFrame == areaTitleAnim.totalFrames - 1) {
                    this.stage.removeEventListener("tick", areaTitleEndListener);
                    this.stage.removeChild(areaTitleMc);
                    this.createGame();
                }
            }, this);

            var goButtonClickListener = _.bind(function () {
                areaTitleAnim.removeEventListener("tick", onAreaTitleStopListener);
                areaTitleAnim.goButton.removeEventListener("click", goButtonClickListener);
                areaTitleAnim.gotoAndPlay("waitToGo");
                this.stage.addEventListener("tick", areaTitleEndListener);
            }, this);


            var onAreaTitleStopListener = _.bind(function () {
                if (areaTitleAnim.currentLabel == "waitToGo") {
                    areaTitleAnim.removeEventListener("tick", onAreaTitleStopListener);
                    areaTitleAnim.stop();
                } else if (areaTitleAnim.currentLabel == "goButtonReady") {
                    areaTitleAnim.goButton.addEventListener("click", goButtonClickListener);
                    areaTitleAnim.goButton.cursor = "pointer";
                }
            }, this);

            areaTitleAnim.addEventListener("tick", onAreaTitleStopListener);

        },
        "resetGame": function () {
            this.game.kill();
            this.clearTasks();
            this.area = 0;
            this.numCoins = 0;
        },
        "createGame": function () {

            this.clearTasks();

            this.game = new Game(this.stage, this.area,
                //onClearListener
                _.bind(function (coins) {
                    this.clearTasks();
                    this.area++;
                    this.numCoins += coins;
                    this.setAreaTitle(this.area);
                    this.game.kill();
                }, this),
                //onGameOverListener
                _.bind(function () {
                    this.resetGame();
                    this.setMainTitle();
                }, this), this.numCoins);

            this.addTask(_.bind(this.game.gameLoop, this.game));

        }
    };

})();
var Areas;

(function () {

    Areas = [
        //1
        {
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Wine",
                    //"spawnRate": 0.03,
                    "spawnRate": 0.2,
                }
            ],
            "dropItems": [
                {
                    "id": "Berry",
                    "dropRate": 0.8,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.7,
                },
                {
                    "id": "Key",
                    "dropRate": 0.9,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.4,
                }
            ],
            "initialSpeed": 4
        },

        //2
        {
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.03,
                }
            ],
            "dropItems": [
                {
                    "id": "Berry",
                    "dropRate": 0.8,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.7,
                },
                {
                    "id": "Key",
                    "dropRate": 0.9,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.8,
                    "dropItemRate": 0.4
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
	this.shape.setTransform(29.8,29.5);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

	// レイヤー_1
	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f().s("#FF9900").ss(0.1,1,1).p("Aj6kXIHuAGAkcD/IAGn4AEVkDIAIH1AD/EQIoRAI");
	this.shape_1.setTransform(30.3,29.9);

	this.timeline.addTween(cjs.Tween.get(this.shape_1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0.3,0.6,59.6,58.4);


(lib.x = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#660000").s().p("AA6BUIgFgFIgJgLIgRgVIgIgKIgTgXIgPAUIgMAQIgMAOIgJAKIgHAJIgDACQAAAAgBAAQAAABgBAAQAAAAAAAAQgBAAAAAAQgEgBgDgDQgDgCgBgFIABgDIAFgGIAQgSIACgDIARgUIATgZIgRgVIgTgWIgDgDIgTgYIgCgBIAAgDQAAgEADgDQADgDAEAAQABAAAAAAQABAAABAAQAAAAAAAAQABABAAAAIAGAGIAEAGIARAUIAWAaIAJAKIAMgTIAQgWIARgZIADgDIAEgBQAEAAADADQADADAAAEIgBACIgCAEIgNATIgIANIgJALIgMARIgGAJIAlAsIAMAOIALANIACACIAAADQAAAEgDADQgCADgFAAIgFgCg");
	this.shape.setTransform(7.3,8.6);

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
p.nominalBounds = new cjs.Rectangle(-3,-3,206,36);


(lib.cover = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFFFCC").s().p("AvnCWIAAkrIfPAAIAAErg");
	this.shape.setTransform(100,15);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = getMCSymbolPrototype(lib.cover, new cjs.Rectangle(0,0,200,30), null);


(lib.Heart_base_weak = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AgMh0IABAXQAiAOghAOIAAAlAA9gHQAUAAAVAEAhlAsQASgOAUgKIAVBcQA1APAogaQAKgGAJgKAg5BqQAIADAHADAg/AUQA4gcBEABIgKBs");
	this.shape.setTransform(23.6,23.2);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFCC00").s().p("AgoA5IgVhaQA4geBDACIgKBrQgZARgeAAQgSAAgTgGg");
	this.shape_1.setTransform(23.4,28.6);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FFFFFF").s().p("Ah8AcQgJAAgDgDIgLgFIgIgGQgEgFABgCIAcgVIARgMQAKgDANADQAAACADADQASAMAHANIACADIgDAHQgFADgDgDIgDADIgOAEQgRAIgOAAIgFgBgAB6AZIgCgCIgQACIgFgCIgDgCIgGgDIgCgDIgFABIgCgCQgBgBgBAAQAAAAgBAAQAAAAAAAAQAAAAAAABQAAgHgEAEIAAgJIACgEQADgCAAgCIADgEIABgDIADgBQAAAAABgBQABgBAAAAQAAgBAAAAQAAgBAAAAQAEABACgGQABABAAAAQAAAAABAAQAAAAABgBQAAAAAAgBIADgDIADgBIARABIgCADIAGgBIAAACIAFAAQAEAFABgDIAAABIAGACIAAACIAHADIAGAHIABAAIAFAMIAAADIgCgBIAAAGQAAAEgEACQgBABgBAAQAAAAgBAAQgBABAAgBQgBAAAAAAQAAABAAABQAAAAgBABQAAAAAAABQgBAAAAAAIgGACg");
	this.shape_2.setTransform(22.7,9.7);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#333333").s().p("AiOArQgKgDgFgFQgIgEgDgFIgBgBIABgBIgEgOQAEgLgCgFQADAAAAgFIAEgGIADAAIAFgEIAHgDIALgHIANgFIAHgEIAHgBIAhAAIAGgBIASATQgBAAAAAAQAAAAAAAAQAAABAAAAQAAABABABIAEACIAJALIgBABIABACIADAOIgCAKQgEgBgGACIgSANIgMAGQgUAIgSAAQgNAAgMgFgAhvgZIgRALIgcAWQgBACAEAFIAIAGIALAFQADADAJAAQAQABAUgIIAOgEIADgDQADADAFgDIADgHIgCgEQgHgNgSgLQgDgDAAgCIgMgCQgGAAgFACgABjAqQgFgBgCgCIgHgGIgGgGQgHgGgHAFIAAAAIgBgBIAAgZIACAAIgCAAIAJgaIABgBIgCgCQAIgGARgEIAIgFIAEgCIAEgBIATAAIAFABIAFADQAFAEAKACIAEAGQAAACADADIAHAQQAEAKgCAMQAAAFgCAGIgNANIgIAGIgHAEIgJAAQgQAAgTgEgAB8AZIASACIAGgCQAAAAABAAQAAAAAAgBQABAAAAgBQAAgBAAgBQAAABABAAQAAAAABAAQAAAAABgBQABAAABgBQAEgBAAgFIAAgFIACABIAAgEIgFgMIgBAAIgGgHIgHgCIAAgDIgGgCIAAAAQgBACgEgEIgFAAIAAgDIgGABIACgCIgRgBIgDABIgDACQAAABgBABQAAAAAAAAQgBABAAgBQAAAAgBAAQgCAFgEgBQAAAAAAABQAAAAAAABQAAAAgBABQgBABAAABIgDAAIgBADIgDAEQAAACgDADIgCAEIAAAJQADgFABAHQAAAAAAgBQAAAAAAAAQABAAAAAAQABABABAAIACADIAFgBIACADIAGACIADADIAFABIAQgBg");
	this.shape_3.setTransform(22.5,9.6);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

	// レイヤー_1
	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f().s("#333333").ss(1,1,1).p("AjmhDQAAA/A+A4QAiAgBEAsQAXASAXAoQACADACADQAJARAHAOQAIgOAJgRQABgDACgDQAYgoAXgSQBDgsAjggQA+g4AAg/QAAhWg4guQg3guhkAuQgKAFgKAFQgKgFgKgFQhjgug3AuQg4AuAABWg");
	this.shape_4.setTransform(23.1,22.3);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#6600FF").s().p("AgQDAIgDgGQgYgogXgSQhEgsgiggQg+g4AAg/QAAhWA4guQA3guBkAuIATAKIAUgKQBkguA3AuQA4AuAABWQAAA/g+A4QgiAghEAsQgXASgYAoIgDAGIgRAfIgQgfg");
	this.shape_5.setTransform(23.1,22.3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_5},{t:this.shape_4}]}).wait(1));

}).prototype = getMCSymbolPrototype(lib.Heart_base_weak, new cjs.Rectangle(-1,-1,48.2,46.6), null);


(lib.Heart_base_strong = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AgIgrIAAAXQAiAOghANIABAl");
	this.shape.setTransform(23.2,15.9);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFCC00").s().p("AgNAOQgKgEgFgKIgBgBIAAgBIgCgIQAAAAgBAAQAAAAAAgBQgBAAAAgBQAAAAAAAAIgBgBIAAAAIASABIAdAAIAWgBQgJAKgKAGIgIAFIgQAGg");
	this.shape_1.setTransform(22.9,25.1);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#333333").s().p("AgQBqIgJgDIgIgHIgDgEIgDgLIgDgEQAAgBAAgBQgBAAAAAAQAAgBgBAAQAAAAAAAAIABgBQgKgDgOgFIgLgEQAAgDAEAAQAJAAAFADIAGADIALAEIASADIA6AAIAHgBIACgBQAEgCAEACIACgBQAIgEADABQAAAAABABQAAAAAAAAQABABAAAAQAAAAAAABIgCABQgFADgKACIgHAIQgKAKgJAFIgSAIIgGACIgDAAIgLgBgAgfBMQAAAAAAABQAAAAAAAAQAAABABAAQAAAAABABIABAIIABAAIAAADQAGAJAKAEIAEABIAQgHIAJgFQAKgHAIgKIgVABIgdAAIgSgBIAAAAIABABgAhwgmIgFgCIgEgCQgCgCABgFIABgDIAEgDQAAgBAAgBQAAAAAAgBQAAgBAAAAQAAgBABAAIACgCIAFgBIADgBIASAAIAFAAIAAABIAIABQAEgBACACQAAAAAAAAQAAABAAAAQAAAAABAAQAAAAAAAAIAAADIgBADQAAAAABABQAAAAAAAAQgBAAAAABQAAAAAAAAIgBABIgFAHIgGAFIgCABIgCAAIgDABIgDABQgOAAgHgCgABEgrIgDAAIgCgCIgCgBQgBgBAAAAQgBAAAAgBQAAAAAAgBQAAAAAAgBIAAgCQAAAAAAgBQAAAAgBAAQAAAAAAAAQAAAAAAABIgBgFIABAAIABgCIAAAAIACgBIAFgCIAAgBIACgBIAFgBIAGAAIACAAIAFgBIABgBQACABAEgCIABABIAAgBIALAAQABAAAAAAQABAAAAAAQABAAAAABQABAAAAAAIABACQABAHgCAFIgDAEIgCABIgMAFIgDAAgAhPhGQgDgBgEgDIgFgHQgLgNgSgDQABgCAEAAIAJABIAMAFIAGAEIAEAEQAFAHAIAHQgDABgDAAIgCAAgAA6hJIAAgBIAMgGIAIgDIAHgDIAMgKIAJgHQADgCACgBIAHAAQAEAAABABQAAAAAAABQAAAAAAAAQgBAAAAAAQgBABAAAAIgEAAIgCACIgKAHIgJAIIgCADIgbAKIgDAAIgGAAg");
	this.shape_2.setTransform(22.7,16.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

	// レイヤー_1
	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f().s("#333333").ss(1,1,1).p("AjmhDQAAA/A+A4QAiAgBEAsQAXASAXAoQACADACADQAJARAHAOQAIgOAJgRQABgDACgDQAYgoAXgSQBDgsAjggQA+g4AAg/QAAhWg4guQg3guhkAuQgKAFgKAFQgKgFgKgFQhjgug3AuQg4AuAABWg");
	this.shape_3.setTransform(23.1,22.3);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#FF0000").s().p("AgQDAIgDgGQgYgogXgSQhEgsgiggQg+g4AAg/QAAhWA4guQA3guBkAuIATAKIAUgKQBkguA3AuQA4AuAABWQAAA/g+A4QgiAghEAsQgXASgYAoIgDAGIgRAfIgQgfg");
	this.shape_4.setTransform(23.1,22.3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_4},{t:this.shape_3}]}).wait(1));

}).prototype = getMCSymbolPrototype(lib.Heart_base_strong, new cjs.Rectangle(-1,-1,48.2,46.6), null);


(lib.Heart_base = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AgIgrIAAAXQAiAOghANIABAl");
	this.shape.setTransform(23.2,15.9);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#333333").s().p("AgMBgIgCgBIgCgFIgCgDQgCgDABgEQACgDAEAAQAEgCACAGIAEAFIABAAIAEACIgBgFIgDgGQAAAAAAgBQAAgBgBAAQAAAAAAgBQgBAAAAAAIgCgCIgGgEIgDgBQgCgCAAgCQAAgBgBAAQAAgBAAAAQAAgBAAAAQABgBAAgBIAAgBQACgCAEAAIASgGQgJgEgLABQgFAAgCgCQgCgCABgFQACgDADAAIAEgBIANgBIAFABIAGACQAEAEACAEQACAFAAAFQAAAFgDACIgKACQgBAAAAABQgBAAAAAAQAAAAAAABQgBAAAAAAIACACIADAFIAGANIABAEQAAAIgDAEIgJABQgHAAgJgFgAh2hWIgCgBIgCgBIgBgDIAAgDIADgDQAAAAABAAQAAAAAAAAQABAAAAAAQABAAAAAAIAAgBIAFABQAAABAAAAQAAAAAAABQAAAAAAAAQABAAAAAAIAAACIAAADIgCAEIgDABIgCgBgABxhaIgBgBIgBgCIABgEIACgCIADgBQACAAADACIABABIABACIAAABIAAABIgCAEQgBACgEAAg");
	this.shape_1.setTransform(23.3,19.3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

	// レイヤー_1
	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f().s("#333333").ss(1,1,1).p("AjmhDQAAA/A+A4QAiAgBEAsQAXASAXAoQACADACADQAJARAHAOQAIgOAJgRQABgDACgDQAYgoAXgSQBDgsAjggQA+g4AAg/QAAhWg4guQg3guhkAuQgKAFgKAFQgKgFgKgFQhjgug3AuQg4AuAABWg");
	this.shape_2.setTransform(23.1,22.3);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#333333").s().p("Ah4ARIgFgFIgFgEQgBgCAAgFQAAgEABgDIAFgEQAFgEAFgCIAJgBQAMABACAIQACAEgDAEIgGAIQgGAHgDABIgHACIgFgBgAB3AOIgIAAQgDAAgCgCQgGgDACgHIABgEIABgFQABgDAEgBQAGgBAKAEIAFADQADADgBADIgDAIIgDAEIgGABIgBAAg");
	this.shape_3.setTransform(23.1,9.3);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#FF00FF").s().p("AgQDAIgDgGQgYgogXgSQhEgsgiggQg+g4AAg/QAAhWA4guQA3guBkAuIATAKIAUgKQBkguA3AuQA4AuAABWQAAA/g+A4QgiAghEAsQgXASgYAoIgDAGIgRAfIgQgfgAh0iSQgFACgFAEIgEAEQgCACAAAFQAAAFACACIAEAEIAGAFQAFADAGgDQADgCAHgGIAGgIQACgFgBgFQgCgHgMgBIgKABgABtiNQgEABgBADIgBAEIgCAFQgCAHAHAEQACABADAAIAHABQAEAAADgBIAEgFIADgHQABgEgDgDIgGgEQgHgDgFAAIgDABg");
	this.shape_4.setTransform(23.1,22.3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_4},{t:this.shape_3},{t:this.shape_2}]}).wait(1));

}).prototype = getMCSymbolPrototype(lib.Heart_base, new cjs.Rectangle(-1,-1,48.2,46.6), null);


(lib.Eye_weak = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AAMgVIgXAr");
	this.shape.setTransform(-2.7,-1);

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
	this.shape.setTransform(-3.4,-0.1);

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
	this.shape.setTransform(-4.4,0.3);

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
	this.shape.setTransform(54,19.1);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,107.9,38.2);


(lib.Bubble_red_body = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFD4C9").s().p("AlYFYQiOiOAAjKQAAjICOiQQCQiODIAAQDKAACOCOQCPCQAADIQAADKiPCOQiOCPjKAAQjIAAiQiPg");
	this.shape.setTransform(48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,97.4,97.4);


(lib.Bubble_body = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#E2EFFF").s().p("AlYFYQiOiOAAjKQAAjICOiQQCQiODIAAQDKAACOCOQCPCQAADIQAADKiPCOQiOCPjKAAQjIAAiQiPg");
	this.shape.setTransform(48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,97.4,97.4);


(lib.Bubble_blue_body = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#00CCFF").s().p("AlYFYQiOiOAAjKQAAjICOiQQCQiODIAAQDKAACOCOQCPCQAADIQAADKiPCOQiOCPjKAAQjIAAiQiPg");
	this.shape.setTransform(48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,97.4,97.4);


(lib.Wine_base = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#660066").ss(2,1,1).p("ACGh3QAGAZAAAcQAABGgpAzQgpAyg6AAQg5AAgpgyQgpgzAAhGQAAgcAGgZQAKglAYgeIDHAAQAYAeAKAlgAgnC7IAnAAIAAhSAAAC7IAoAAAiFh3IELAA");
	this.shape.setTransform(14,18.7);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#EE0083").s().p("AhiA+QgpgyAAhGQAAgcAGgaIELAAQAGAaAAAcQAABGgpAyQgqAzg5AAQg5AAgpgzg");
	this.shape_1.setTransform(14,18);

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
	this.shape.setTransform(12,26.8);

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
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AC9AAQAABPg4A3Qg3A3hOAAQhOAAg3g3Qg3g3AAhPQAAhOA3g3QA3g3BOAAQBOAAA3A3QA4A3AABOg");
	this.shape.setTransform(30.1,30);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f().s("#333333").ss(0.3,1,1).p("ADjAAQAABehDBCQhCBDheAAQhdAAhChDQhDhCAAheQAAhdBDhCQBChDBdAAQBeAABCBDQBDBCAABdg");
	this.shape_1.setTransform(30.1,30.1);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f().s("#333333").ss(0.2,1,1).p("AClAAQAABFgwAwQgxAwhEAAQhDAAgwgwQgxgwAAhFQAAhDAxgwQAwgxBDAAQBEAAAxAxQAwAwAABDg");
	this.shape_2.setTransform(30.1,30.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

	// レイヤー_2
	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f().s("#333333").ss(1,1,1).p("Ag/gYQASAxAugBQAvAAAQgv");
	this.shape_3.setTransform(29.9,34.6);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#333333").s().p("AhPAIQgCgDAAgEQAAgEACgDQACgDADAAQADAAACADQACADAAAEQAAAEgCADQgCADgDAAQgDAAgCgDgABGAHQgCgDAAgEQAAgEACgDQACgDADAAQADAAACADQACADAAAEQAAAEgCADQgCADgDAAQgDAAgCgDg");
	this.shape_4.setTransform(29.4,21.7);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_4},{t:this.shape_3}]}).wait(1));

	// レイヤー_3
	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.lf(["#FFCC33","#FCE192"],[0,1],14.1,17.7,-14.1,-17.7).s().p("AifCgQhChCAAheQAAhdBChCQBDhCBcABQBdgBBCBCQBDBCAABdQAABehDBCQhCBBhdABQhcgBhDhBg");
	this.shape_5.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get(this.shape_5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(6.4,6.4,47.4,47.4);


(lib.BerryBase = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_3
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#000066").ss(1,1,1).p("AAjizQARgLAWAAQADAAADAAQAZACASASQARARADAXQABAFAAAFQAAAGgBAFQgBADAAACQAJANACAQQABAFAAAFQAAAagRAUQgCABgCACQgMAMgOAEQgIACgHABQgEgEgEgFQgCgCgBgCQgIgHgIgFQgKgFgLgCQgDgBgEAAQgDAAgDAAQgEAAgEAAQgJgQAAgTQAAgXANgSQADgFAEgEQAVgUAdAAQADAAADAAQAZACASASQAFAFAEAGAhjiRQgBgFAAgFQAAgdAUgVQAVgUAdAAQAdAAATAUQAMAMAFAOQAEALAAANQAAAagRATQADACACACAgyh3QANgGARAAQADAAADAAQAKABAIADQAKAEAIAHAAogWQADAAADAAAAsgdQgCAEgCADAgCAFQACgEAEgDQAQgQAUgEACPhtQATAGAPAPQAYAZAAAiQAAAZgNATQAGALACANQAAAFAAAFQAAAdgUAUQgGAGgGAEQgFADgEACQgNAGgQAAQgVAAgRgLQgPAIgTAAQgQAAgOgGQgLgFgJgJQAAgBgBAAQgDAEgDAEQgVAVgdAAQgMAAgLgEQgOgFgMgMQgKgJgFgLQgGgOAAgPQAAgHABgGQAEgVAQgQQAJgIAKgFQAEgBAEgCQAKgDAMAAQADAAADAAQAZACATARQAAABABAAACJgTQAWACARARQAHAHAFAIAhjiRQAZACASASQADADADADAhZgqQgBgGAAgHQAAgdAUgVQAJgJALgFAiogsQgHgOAAgRQAAgdAUgVQAVgUAdAAQADAAADAAAimBKQgHgEgHgHQgUgUAAgdQAAgcAUgVQAGgFAGgEQAQgLAWAAQADAAADAAQATABAQAMAhLgMQgLgNgDgRAh1BTQgGABgHAAQgUAAgQgKAhTCvQgKAEgMAAQgdAAgVgVQgUgUAAgdQAAgUAJgPAA2CfQgBAbgUAUQgUAUgcAAQgdAAgVgUQgNgOgFgRQgCgJAAgKQAAgUAJgQAByALQAHAMACANQABAFAAAFQAAAdgVAVQgHAHgIAFACkBsQgDAZgSASQgUAUgdAAQgXAAgRgMQgFgEgFgEQgRgSgDgXAADBfQgSgVAAgcQAAgXANgS");
	this.shape.setTransform(20.1,22.6);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-1.8,-1.1,0,-1.8,-1.1,9.8).s().p("AgPBCQgPgFgMgMQgKgJgEgLQgHgOAAgPIACgMQADgVAQgQQAJgIALgFIAHgEQALgDALAAIAGABQAYABATASIABABQgNASAAAYQAAAbATAUIgHAIQgVAVgcAAQgMAAgKgEg");
	this.shape_1.setTransform(14.1,28);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-1.7,-1.1,0,-1.7,-1.1,9.8).s().p("AgbA8QgIgEgGgGQgVgVAAgdQAAgcAVgUIAMgKQAQgLAVAAIAFAAQAUACAQAMQACAQAMANIgIAEQgLAFgIAIQgQAPgEAVIgBANQAAAPAGAOIgNABQgUAAgPgKg");
	this.shape_2.setTransform(6.3,24);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-2.2,-0.6,0,-2.2,-0.6,9.8).s().p("AAUBBQgTgTgYgBIgGgBQgMAAgKAEQgMgOgCgQQgBgHgBgHQAAgcAVgUQAJgJALgFQANgHAQAAIAGABQAKAAAJAEQAJAEAJAHIAEADQgNASABAXQAAATAJAQIAIgBIAGABIAGABIgDAHQgVAEgPAPIgIAJIAAgBg");
	this.shape_3.setTransform(17.8,16.6);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-2,-1.6,0,-2,-1.6,10.5).s().p("AAjAvQgJgEgKAAIgGgBQgPAAgOAHIgFgGQgTgTgZgBIgBgLQAAgcAVgUQAUgVAcAAQAdAAAVAVQALALAFAPQAEAKAAAMQAAAagRAUQgIgHgKgEg");
	this.shape_4.setTransform(17,5.8);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-2.5,-4.9,0,-2.5,-4.9,9.8).s().p("AgnATIgKgIQgRgQgDgXQAOAGAQAAQATAAAPgJQAQALAVAAQAQAAANgGIAJgEQgDAYgSARQgUAVgdAAQgWAAgRgNg");
	this.shape_5.setTransform(29.5,36.6);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-2.5,-1.5,0,-2.5,-1.5,9.8).s().p("AgwAtQgOgNgEgRQgDgJAAgJQAAgUAKgQQAKADANAAQAcAAAUgUIAHgJIABABQAKAJALAFQACAYASARIAJAIQgBAbgTATQgVAVgdAAQgcAAgUgVg");
	this.shape_6.setTransform(18.5,38.7);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-0.4,-2.8,0,-0.4,-2.8,9.8).s().p("AgcAgQgVgVAAgcQAAgTAJgPQAQAJAUAAIANgBQAFALAJAKQAMAMAPAFQgKAPAAAUQAAAKADAJQgLADgMAAQgcAAgUgUg");
	this.shape_7.setTransform(7.5,35.3);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-1.7,0.7,0,-1.7,0.7,9.8).s().p("AgLAnIgFgBQgWAAgQALQgIgOABgRQgBgcAVgUQAUgVAdAAIAFABQAZABATATIAGAGQgLAFgJAJQgVATAAAdQABAHABAHQgQgMgTgBg");
	this.shape_8.setTransform(8.8,13.2);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-4,-1.1,0,-4,-1.1,9.8).s().p("Ag1A6QAIgEAHgHQAVgVAAgcIgBgKQgCgNgHgNIgHgKQAOgFAMgMIAEgDQAVACARARQAHAHAFAJQAGALACAMIAAAKQAAAcgUAVQgGAGgHAEIgIAFQgNAFgPAAQgVABgRgMg");
	this.shape_9.setTransform(34.3,27.6);

	this.shape_10 = new cjs.Shape();
	this.shape_10.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-3.4,1.6,0,-3.4,1.6,9.8).s().p("AAyAhQgSgTgZgBIgGgBQgcAAgVAVIgHAIIgFgEQARgTAAgZQAAgMgEgLQARgMAWAAIAGAAQAYACASATQARAQADAWIABAKIgBAMIgBAEIgJgKg");
	this.shape_10.setTransform(28.4,7.8);

	this.shape_11 = new cjs.Shape();
	this.shape_11.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-0.2,1.7,0,-0.2,1.7,8.3).s().p("AA3AvQgRgRgWgDQARgTAAgaIAAgKQgDgQgJgNIABgEQATAGAPAPQAZAYgBAhQAAAZgNAUQgFgIgHgHgAhMARQALACAKAGIgFgBIgGAAIgIAAIgGABIAEgIg");
	this.shape_11.setTransform(32.2,17.9);

	this.shape_12 = new cjs.Shape();
	this.shape_12.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-2.5,-1.1,0,-2.5,-1.1,9.8).s().p("AgcBAQgLgFgKgJIgBgBQgTgVAAgcQAAgWANgSIAHgIQAQgQAUgEIAGAAIAHgBIAGABIAFAAQAJAEAHAIIADADIAIALIAPgDIAIAKQAGANADANIAAAJQAAAdgVAVQgHAHgIAEQgPAJgTAAQgPAAgNgGg");
	this.shape_12.setTransform(25.5,27.3);

	this.shape_13 = new cjs.Shape();
	this.shape_13.graphics.rf(["#FFFFFF","#675E6E","#0E0019"],[0,0.173,1],-2.5,-1,0,-2.5,-1,9.8).s().p("AAAA7IgCgDQgHgIgJgEQgKgGgLgBIgGgBIgHgBIgIABQgJgQAAgUQAAgWANgSIAIgIQAUgVAcAAIAGABQAZABATATIAIAKQAJANADAQIAAAJQAAAbgRATIgDAEQgNAMgOAFIgPADIgIgLg");
	this.shape_13.setTransform(28.5,16);

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
	this.shape_1.setTransform(20,37.3);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FF3300").s().p("AgCBzQhUhQhmBQQgLgfAAgkQAAhRA6g7QA6g6BRgBIACAAIAAA8IAAg8QBTAAA6A7QA7A7AABRQAAAkgKAfQgwAlgwAAQgwAAgwglgAAAiXIAAAAg");
	this.shape_2.setTransform(20,21.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,-2.5,40,48.5);


(lib.Spider_legs_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#0000FF").ss(2,1,1).p("AB+APIhsiIIgpgMIgkAaIAOB8IgzAaACDgoIhhiRIhWgWIg/AzIAQBqIgnATACLBFIhTAVIhFByIgsAEACBAkIh0g7IgGBUIgaAwIhKAU");
	this.shape.setTransform(-13.9,0);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-28.7,-21.7,29.8,43.5);


(lib.Spider_leg_4 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(2,1,1).p("AA8gpIgyANIgqBEIgbAC");
	this.shape.setTransform(-6.3,4.1);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-13.2,-1.1,13.9,10.4);


(lib.Spider_leg_3 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(2,1,1).p("ABEgJIhGgkIgEAyIgQAdIgtAM");
	this.shape.setTransform(-6.9,1);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-14.6,-4.6,15.5,11.3);


(lib.Spider_leg_2 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(2,1,1).p("ABEAkIhBhRIgZgHIgWAPIAIBLIgfAP");
	this.shape.setTransform(-7.3,-3.9);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-15,-10.2,15.5,12.6);


(lib.Spider_leg_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(2,1,1).p("ABSAwIg7hXIg0gNIgmAfIAJA/IgXAL");
	this.shape.setTransform(-8.3,-4.9);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-17.4,-11.2,18.3,12.7);


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
	this.shape.graphics.f("#0000FF").s().p("AgcBwQgNgSAAgZQAAgZANgSIAEgGQgKgGgJgLQgTgWgBghQgCghAYgRIAfgWQALgIALAIIAgAYQAUARAAAgQAAAggSAWQgKALgKAGIAFAGQAMASAAAZQAAAZgMASQgNARgRAAQgRAAgMgRg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-6.4,-12.9,12.8,25.9);


(lib.Spider_body = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#333333").s().p("AggB+QgOgUAAgcQAAgdAOgUIAFgGQgMgHgKgMQgVgagBglQgCglAbgUIAjgZQAMgIAMAIIAkAcQAXATABAkQAAAkgVAaQgLAMgLAHIAFAGQAOAUAAAdQAAAcgOAUQgOAUgUAAQgTAAgOgUg");
	this.shape.setTransform(0,0,0.884,0.884);

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
	this.shape_1.setTransform(-0.1,-2.6);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-6.6,-5.5,11,19.2);


(lib.Mouse_nose = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AgDASQgbAmgpgNAgFgwQACAaABATQAAAMgBAJQALAqBAgO");
	this.shape.setTransform(0,0.4);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#333333").s().p("AgBAbIgCgtIACAtQgKgBgHgHQgIgIAAgLQAAgKAIgIQAIgHAKgBQALABAIAHQAIAIgBAKQABALgIAIQgIAHgLABIgBAAg");
	this.shape_1.setTransform(-0.1,-2.6);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-8.2,-5.5,16.4,11.9);


(lib.Mouse_mustache_upper = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#484848").ss(1,1,1).p("AhBAEICDgH");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-7.6,-1.3,15.3,2.8);


(lib.Mouse_face = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFCCFF").s().p("AAAAvQgYASgjAAQgjAAgagTQgYgUAAgaQAAgMAFgLQAGgNANgKQAagTAjAAQAkAAAYATQAYgSAiAAQAkAAAYATQAOAKAHANQAFALAAAMQAAAagaAUQgYATgkAAQgjAAgYgTg");
	this.shape.setTransform(0.2,14.2);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF9900").s().p("AjTDEQhYhYAAh7QAAh9BchJQBdhJB8ADQB9AEBTBGQBSBFAAB9QAAB7hYBYQhYBYh8AAQh7AAhYhYgAA9DPQAkAAAYgTQAagTAAgbQAAgNgFgKQgHgNgOgLQgYgTgkAAQgiAAgYASQgYgTgkAAQgjAAgaATQgNALgGANQgFAKAAANQAAAbAYATQAaATAjAAQAjAAAXgSQAZATAjAAg");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-30,-28.3,60,56.8);


(lib.Mouse_eye_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AAfgRIgGAEIgrAYIgMAH");
	this.shape.setTransform(-0.9,-0.8);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#333333").s().p("AgTASQgHgHgBgKIArgYIADADQAJAIAAALQAAALgJAIQgHAIgMAAQgKAAgJgIgAgbgBIAAgBIApgXIACACIgrAYIAAgCgAAQgXIAAAAg");
	this.shape_1.setTransform(0,0.2);

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


(lib.Mouse_Ear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#FF9900").ss(4,1,1).p("ABqAAQAAAsgfAeQgfAfgsAAQgrAAgfgfQgfgeAAgsQAAgrAfgfQAfgeArAAQAsAAAfAeQAfAfAAArg");

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFCCFF").s().p("AhKBKQgfgeAAgsQAAgrAfgfQAggeAqAAQAsAAAfAeQAfAfAAArQAAAsgfAeQgfAfgsAAQgqAAgggfg");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-12.6,-12.5,25.2,25.1);


(lib.Hedgehog_nose = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#333333").s().p("AgVAQQgIgGAAgKQAAgJAIgHQAKgHAMAAQALAAAKAHQAIAHAAAJQAAAKgIAGQgKAIgLAAQgMAAgKgIg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-3,-2.3,6,4.8);


(lib.Hedgehog_nail = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#B1305B").s().p("AgQANQgmhDBHAqQAQAMgEAJQgFAKgIAFQgFAFgGAAQgJAAgMgQg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-2.9,-2.9,6,5.8);


(lib.Hedgehog_mouth_base_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#D27151").ss(1,1,1).p("AA1gFQAMAUAVAHAgugEIAwAQIAzgRAhVAZIAngdQA2gnAtAm");
	this.shape.setTransform(-0.3,-2.2);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#6633FF").s().p("AgxABQA2gmAsAmIgxARg");
	this.shape_1.setTransform(0,-2.8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-9.8,-5.6,19.1,7);


(lib.Hedgehog_mouth = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#D27151").ss(1,1,1).p("AAygbQAWgFAYgLAgxgaIA2BHIAthIAhfgsQAWALAYAHQAwAMAzgN");

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF6200").s().p("AgxgjQAwAMAygMIgtBHg");
	this.shape_1.setTransform(0,0.9);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-10.5,-5.5,21.1,11);


(lib.Hedgehog_Face_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#6666FF").s().p("Ai+BrQhPgsAAg/QAAg+BPgsQBPgtBvAAQBwAABOAtQBQAsAAA+QAAA/hQAsQhOAthwAAQhvAAhPgtg");
	this.shape.setTransform(-0.1,-4.2);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#0000FF").s().p("AiSDTIg4BqIgQhYQjfieCujjIAoiQIBIBTIAeiEIBCBnIA/iKIA9CKIBLhsIAhB7IA+gwIArCFIAAABQCaCEjODgIgqB5IhOhrIgvCbIhGiNIhXCSgAjAiUQhPAtAAA/QAAA9BPAtQBPAsBwAAQBvAABPgsQBPgtAAg9QAAg/hPgtQhPgthvAAQhwAAhPAtg");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-34.4,-38.5,68.8,77);


(lib.Hedgehog_Face = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FC9776").s().p("Ai+BrQhPgsAAg/QAAg+BPgsQBPgtBvAAQBwAABOAtQBQAsAAA+QAAA/hQAsQhOAthwAAQhvAAhPgtg");
	this.shape.setTransform(-0.1,-4.2);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#00CCFF").s().p("AiSDTIg4BqIgQhYQjfieCujjIAoiQIBIBTIAeiEIBCBnIA/iKIA9CKIBLhsIAhB7IA+gwIArCFIAAABQCaCEjODgIgqB5IhOhrIgvCbIhGiNIhXCSgAjAiUQhPAtAAA/QAAA9BPAtQBPAsBwAAQBvAABPgsQBPgtAAg9QAAg/hPgtQhPgthvAAQhwAAhPAtg");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-34.4,-38.5,68.8,77);


(lib.Hedgehog_eye_base_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AA0gXIgQAIIhHAfIgQAI");
	this.shape.setTransform(-1.1,-2.4);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFFFFF").s().p("AgFAHQgEgCAAgEQAAgDACgDIAAAAQADgCAEgBQADAAADACQADACABAEIgBACIgCAEQgDADgDAAIgBAAQgDAAgCgCg");
	this.shape_1.setTransform(2.4,1.3);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#333333").s().p("AgFArQgNgBgLgKQgPgMgCgTQgBgFABgGIBHggIAFADQAPANACATQACATgNAPQgGAHgHAEQgIAFgKAAIgFAAIgFAAgAAXABQgEABgDACIAAAAQgCADAAAEQAAAEAEACQADADAEgBQADAAADgDIACgEIABgDQgBgEgDgCQgCgCgDAAIgCAAg");
	this.shape_2.setTransform(0,0.3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-7.3,-5.7,12.5,10.4);


(lib.Hedgehog_eye = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFFFFF").s().p("AgFAHQgEgCAAgEQAAgDACgDIAAAAQADgCAEgBQADAAADACQADACABAEIgBACIgCAEQgDADgDAAIgBAAQgDAAgCgCg");
	this.shape.setTransform(2,-2);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#333333").s().p("AgFAuQgNgBgLgKQgPgMgCgTQgCgSANgQQANgOATgCQASgBAPALQAPANACATQACATgNAPQgGAHgHAEQgIAFgKAAIgFABIgFgBgAATgcQgEABgDACIAAAAQgCADAAAEQAAAEAEACQADADAEgBQADAAADgDIACgEIABgDQgBgEgDgCQgCgCgDAAIgCAAg");

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.7,-4.6,9.5,9.3);


(lib.FrogFace_defeated_lower = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#CFFF81").s().p("AAGE/IgDAAIgDAAQhxgBhThvIgHgKQgOgSgLgUIgohaQgWhAgGhJQAnhxBPhDQBRhGBhAAQBiAABRBGQBPBDAnBxQgFA1gMAwIggBbIgfA3IgMASIgHAKIgKAOQhNBdhmAFIgDAAg");
	this.shape.setTransform(29.7,31.9);

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
	this.shape.setTransform(5.2,5.2);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,10.4,10.4);


(lib.FrogFace_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#0000FF").s().p("AEpCSQgnhGhPgrQhRgqhiAAQhhAAhRAqQhPArgnBGQgDgTAAgUQAAhGAfg5QgfggAAgsQAAgvAjghQAjghAyAAQAxAAAkAhIALALQAogKArAAQAvAAApALIAHgGQAjgiAyAAQAxAAAkAiQAjAhAAAvQAAAqgdAgQAdA3AABEQAAA3gUAwQAMgeAFgigAChiVQgQAPAAAUQAAAVAQAPQAPAPAXAAQAWAAAPgPQAMgLADgPIhWgyIgEAFgAj6hqQACAQANAMQAPAPAXAAQAVAAAQgPQAQgPAAgVQAAgUgQgPIgFgFg");
	this.shape.setTransform(30,21);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#CFFF81").s().p("AAGDIIgDAAIgDAAQhxAAhThGIgIgGQgNgMgLgMIgog5QgWgogGguIAAAAQAnhGBPgqQBRgsBhAAQBiAABRAsQBPAqAnBGQgFAigMAeIggA5IgfAiIgMAMIgHAGIgKAIQhNA7hmADIgDAAg");
	this.shape_1.setTransform(30,40);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#003701").s().p("AChAeQgQgOAAgVQAAgUAQgPIAFgEIBVAwQgCAPgMALQgQAPgWABQgXgBgPgPgAjrAeQgNgMgCgQIBVguIAFAEQAQAPAAAUQAAAVgQAOQgPAPgWABQgXgBgPgPg");
	this.shape_2.setTransform(30,10.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,60,60);


(lib.Frog_base = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#CFFF81").s().p("AAGDIIgDAAIgDAAQhxAAhThGIgIgGQgNgMgLgMIgog5QgWgogGguIAAAAQAnhGBPgqQBRgsBhAAQBiAABRAsQBPAqAnBGQgFAigMAeIggA5IgfAiIgMAMIgHAGIgKAIQhNA7hmADIgDAAg");
	this.shape.setTransform(30,40);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFFFFF").s().p("ACuAMQgGgFAAgHQAAgGAGgFQAFgFAHAAQAIAAAEAFQAGAFAAAGQAAAHgGAFQgEAFgIAAQgHAAgFgFgAjGAMQgFgFAAgHQAAgGAFgFQAGgFAHAAQAIAAAEAFQAGAFAAAGQAAAHgGAFQgEAFgIAAQgHAAgGgFg");
	this.shape_1.setTransform(30,7.9);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#003701").s().p("AChAjQgQgOAAgVQAAgUAQgPQAPgOAXAAQAWAAAPAOQAQAPAAAUQAAAVgQAOQgPAPgWABQgXgBgPgPgACtgcQgGAFAAAGQAAAIAGAFQAFAEAHAAQAIAAAFgEQAGgFgBgIQABgGgGgFQgFgGgIAAQgHAAgFAGgAjrAjQgQgOAAgVQAAgUAQgPQAPgOAXAAQAVAAAQAOQAQAPAAAUQAAAVgQAOQgQAPgVABQgXgBgPgPgAjGgcQgFAFgBAGQABAIAFAFQAFAEAHAAQAIAAAFgEQAFgFAAgIQAAgGgFgFQgFgGgIAAQgHAAgFAGg");
	this.shape_2.setTransform(30,9.6);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#26BF4A").s().p("AEpCSQgnhGhPgrQhRgqhiAAQhhAAhRAqQhPArgnBGQgDgTAAgUQAAhGAfg5QgfggAAgsQAAgvAjghQAjghAyAAQAxAAAkAhIALALQAogKArAAQAvAAApALIAHgGQAjgiAyAAQAxAAAkAiQAjAhAAAvQAAAqgdAgQAdA3AABEQAAA3gUAwQAMgeAFgigAChiVQgQAPAAAUQAAAVAQAPQAPAPAXAAQAWAAAPgPQAQgPAAgVQAAgVgQgOQgPgPgWAAQgXAAgPAPgAjriVQgQAOAAAVQAAAVAQAPQAPAPAXAAQAVAAAQgPQAQgPAAgVQAAgUgQgPQgQgPgVAAQgXAAgPAPg");
	this.shape_3.setTransform(30,21);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,60,60);


(lib.Cancer_foot_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#0000FF").ss(4,1,1).p("AA7gRIhOgPIgnBB");
	this.shape.setTransform(-5.9,0);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-13.8,-5.2,15.9,10.5);


(lib.Cancer_foot = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#FF3300").ss(4,1,1).p("AA7gRIhOgPIgnBB");
	this.shape.setTransform(-5.9,0);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-13.8,-5.2,15.9,10.5);


(lib.Cancer_eye_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#333333").ss(1,1,1).p("AA6gfIgSAKIhNAqIgUAL");
	this.shape.setTransform(-1.2,-15.5);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#0000FF").s().p("AgdgrIALABQAKAAAIgEQgFAnAkAnIgUAPQgwgvAIgrg");
	this.shape_1.setTransform(1.8,-4.7);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FFFFFF").s().p("AgGAHQgDgDAAgEQAAgDADgDIAAAAQADgCADgBQAEABADACQADADAAADIgBADQAAABAAAAQAAAAAAABQgBAAAAABQAAAAgBABQgDACgEAAQgDAAgDgCg");
	this.shape_2.setTransform(1.7,-11.2);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#333333").s().p("AgKArQgNgDgLgLQgMgMgBgRIBMgrIAFAFQAOAOAAAUQAAATgOAOQgHAHgIAEQgJAEgKAAIgKgBgAALAOIAAABQgDACAAAEQAAAEADADQADADAEAAQAEAAADgDQAAgBABAAQAAgBAAAAQABAAAAgBQAAAAAAgBIABgDQAAgEgDgDQgDgCgEAAQgEAAgDACg");
	this.shape_3.setTransform(-0.1,-13.3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-8,-19.7,13.7,19.7);


(lib.Cancer_eye = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF3300").s().p("AgdgrIALABQAKAAAIgEQgFAnAkAnIgUAPQgwgvAIgrg");
	this.shape.setTransform(1.8,-4.7);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FFFFFF").s().p("AgGAHQgDgDAAgEQAAgDADgDIAAAAQADgCADgBQAEABADACQADADAAADIAAADQgBAAAAABQAAAAAAABQgBAAAAABQgBAAAAABQgDACgEAAQgDAAgDgCg");
	this.shape_1.setTransform(2.1,-15.6);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#333333").s().p("AgKAvQgNgDgKgKQgOgOgBgUQABgTAOgPQAOgOATABQAUgBAOAOQAPAPAAATQAAAUgPAOQgHAHgHADQgJAEgLABIgKgCgAAPgYIAAAAQgDADAAAEQAAAEADADQADACAEAAQAEAAADgCQAAgBABAAQAAgBABAAQAAgBAAAAQAAgBABAAIAAgDQAAgEgDgDQgDgCgEgBQgEABgDACg");
	this.shape_2.setTransform(-0.1,-13.8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.9,-18.6,9.9,18.7);


(lib.Cancer_cissor_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF3300").s().p("AhNAtQgNgJgIgKIBQgbIhPgZQAHgKANgIQAegSAsgBQApABAfASQAeASAAAaQAAAbgeASQgfASgpABQgsgBgegSg");
	this.shape.setTransform(-9.8,0);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF3300").s().p("AgOA5QglgOgUgTQgUgUgFgmIAAgBIAAAAQAWgWAggGQAggFAgAJQAhAJAYAaQAYAZgHAZQgHAagiAKQgOAEgPAAQgUAAgUgJg");
	this.shape_1.setTransform(-9.6,-2.7);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape}]}).to({state:[{t:this.shape_1}]},2).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-19.7,-6.3,19.7,12.7);


(lib.Cancer_cissor_minor_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#0000FF").s().p("AgXAiQgSgJgGgRQgFgPAKgOQAKgOAUgEQATgDASAKQARAIAFARQAGAQgKAOQgKAOgUACIgMABQgMAAgMgGg");
	this.shape.setTransform(-4.9,0);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-9.8,-4,9.9,8.1);


(lib.Cancer_cissor_minor = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF3300").s().p("AgXAiQgSgJgGgRQgFgPAKgOQAKgOAUgEQATgDASAKQARAIAFARQAGAQgKAOQgKAOgUACIgMABQgMAAgMgGg");
	this.shape.setTransform(-4.9,0);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-9.8,-4,9.9,8.1);


(lib.Cancer_cissor_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#0000FF").s().p("AhNAtQgNgJgIgKIBQgbIhPgZQAHgKANgIQAegSAsgBQApABAfASQAeASAAAaQAAAbgeASQgfASgpABQgsgBgegSg");
	this.shape.setTransform(-9.8,0);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-19.7,-6.3,19.7,12.7);


(lib.Cancer_cissor = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF3300").s().p("AhNAtQgNgJgIgKIBQgbIhPgZQAHgKANgIQAegSAsgBQApABAfASQAeASAAAaQAAAbgeASQgfASgpABQgsgBgegSg");
	this.shape.setTransform(-9.8,0);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-19.7,-6.3,19.7,12.7);


(lib.Cancer_body_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#0000FF").s().p("AiUCUQg9g9AAhXQAAhWA9g+QA+g9BWAAQBXAAA9A9QA+A+AABWQAABXg+A9Qg9A+hXAAQhWAAg+g+g");

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
	this.shape.graphics.f("#0000FF").s().p("AjTC/QhYhPAAhwQAAhvBYhPQBXhPB8AAQB8AABYBPQBYBPAABvQAABwhYBPQhYBPh8AAQh8AAhXhPg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-30,-27,60,54);


(lib.Bear_face = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#660000").s().p("AjTC/QhYhPAAhwQAAhvBYhPQBXhPB8AAQB8AABYBPQBYBPAABvQAABwhYBPQhYBPh8AAQh8AAhXhPg");

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
p.nominalBounds = new cjs.Rectangle(-9.8,-9.5,19.7,19);


(lib.Bear_ear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#660000").s().p("AhFBDQgcgcAAgnQAAgnAcgcQAdgbAoAAQApAAAcAbQAdAcAAAnQAAAngdAcQgcAcgpAAQgoAAgdgcg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-9.8,-9.5,19.7,19);


(lib.YFTs = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.yfts();
	this.instance.parent = this;
	this.instance.setTransform(-214.3,-15.9,0.507,0.507,-19.2);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-214.3,-145.7,428.7,291.6);


(lib.Tunnel = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_6 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("Eia2BdwMAAAi7fME1tAAAMAAAC7fgAp+uaQiGCEAAC6QAAC7CGCDQCICFC/gBQDBABCFiFQCIiDAAi7QAAi6iIiEQiFiEjBAAQi/AAiICEg");
	mask.setTransform(991.1,600);

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
	this.instance.setTransform(-262.8,-110.1,0.56,0.56,-22.3);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-262.8,-262.8,525.8,525.8);


(lib.Start = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF0000").s().p("AgNCaQgFgEAAgHIAAkHIgUAAIgQAAIgUAAIgfAAIgRAAIgGAAIgCAAQgEgBgEgFQgDgFAAgGQAAgFACgEQADgFAEgDIAHgBIAPAAIAbAAIAnAAIAsgBIAsAAIAjgBIATAAIARAAIAJgBQAJAAAFAEQAEAFAAAIQAAAHgDAFQgEAFgFAAIgPACIgbAAIgjABIglABIAAEHQAAAHgFAEQgFAFgGAAQgIAAgFgFg");
	this.shape.setTransform(56,1.6);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF0000").s().p("AhiCcQgFgEgCgEIAAgCIAAgBIAFkIIAAAAIgDAAIgCAAIgCAAIAAAAQgFAAgEgFQgDgFgBgHQABgEACgFQACgFAEgCIAEgBIAMgBIAJAAIASgBIAfgBIAfgBIAUgBQAxAAAaAVQAaAUAAAmQAAAngXAaQgYAZgtAKIBcBqIAFAGIABAHQAAAHgHAGQgFAFgIABIgGgBIgGgEIhoiCIgOABIgQAAIgXABIgBB2QAAAGgGAEQgGAFgGAAQgGAAgFgDgAgNh8IgoACIgNAAIgBByIAOAAIAKAAQArABAbgHQAbgHAMgQQALgPAAgaQAAgRgGgLQgGgKgPgEQgOgFgYAAIgZABg");
	this.shape_1.setTransform(27.8,1.6);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FF0000").s().p("AiLCjQgFgFAAgHQAAgCAGgSIATguIAahAIAfhJIAghLIAHgOIAEgMIADgFQABgFADgCQADgCAGAAQAHAAAEAFQAGAEgBAHIAAACIAAADIAAABIgBABIgBABIAWA4IAbA7IAjBJIAwBjIACADIAAADQAAAHgGAFQgFAFgJAAQgGAAgDgDQgDgDgGgKIgbg3IgghHIgphcIgNghIgNAeIgTAtIgOAjIgOAhIAWAAIAfgBIARAAIAKgBIAJAAIAHAAQAGAAAFAEQAFAFAAAHQgBAGgCAEQgCAFgDACIgEABIgIABIgTAAIgbAAIgiACIgHAAIgGAAIgIAAIgDgCIgEAJIgEAKIgJAWIgJAXIgGAPIgCAGIgBACQgCACgDACIgIABQgIAAgFgFg");
	this.shape_2.setTransform(-1.3,1.2);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#FF0000").s().p("AgNCaQgFgEAAgHIAAkHIgUAAIgQAAIgUAAIgfAAIgRAAIgGAAIgCAAQgEgBgEgFQgDgFAAgGQAAgFACgEQADgFAEgDIAHgBIAPAAIAbAAIAnAAIAsgBIAsAAIAjgBIATAAIARAAIAJgBQAJAAAFAEQAEAFAAAIQAAAHgDAFQgEAFgFAAIgPACIgbAAIgjABIglABIAAEHQAAAHgFAEQgFAFgGAAQgIAAgFgFg");
	this.shape_3.setTransform(-30.3,1.6);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#FF0000").s().p("AgyCaQgYgKgRgQQgIgHgEgHQgEgGAAgGQABgIAGgGQAGgGAIAAQAGAAAEACQAEADAEAHQAKAPATAJQATAKAVAAQAgAAARgNQARgNAAgXQAAgVgRgPQgSgPgngNQgigLgVgMQgUgNgJgRQgJgRAAgYQAAgXANgTQAOgTAXgLQAXgLAdAAQARAAAQAFQAQAGANAJQANAJAJANIAHANQADAFAAAEQgBAIgFAFQgGAGgIAAQgGAAgEgDQgEgCgCgGQgIgTgPgJQgPgKgWAAQgdABgQANQgRANAAAXQgBAPAGAKQAGALAOAIQAPAIAZAIQA0ARAaAYQAbAYAAAgQAAAZgOASQgOATgYALQgYALggAAQgZAAgZgJg");
	this.shape_4.setTransform(-57.5,1.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-72.4,-33.9,144.8,67.9);


(lib.Nake = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF9900").s().p("AnNLFQgVgTgBggIAAzAIgFAAQgYgBgUgXQgSgXgBgfQABgfASgWQASgWAZgDIPQgNQAbABASAVQARAVABAiQgBAjgRAVQgQAWgcAAIsvANIAAG7IKXgJQAcABASAUQASAVAAAiQAAAkgPAUQgQAWgbgBIqdAKIAAHaIMvgHQAcABARAUQASAWABAhQgBAkgRAVQgRAWgbgBIsxAGQgBAdgWAQQgVASgiAAQgiAAgWgTg");
	this.shape.setTransform(200.1,8.4);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF9900").s().p("An2LEQgWgTAAggIAA0hQAAgfAXgTQAVgVAgAAQAiAAAWAVQAWATAAAfIAAI9QB/hWB9hoQB8hnBshpQBshqBMheQAOgTAPgJQAOgJAUACQAgABAXAWQAYAYAAAiQABAMgFALQgFALgSAWIg9BEQhhBnh6BtQh6BuiQBxIKAKPQAJAJAEAOQAFAOAAAQQgBAmgXAaQgYAZglABQgOAAgOgGQgOgHgLgLIp+qwIgSANQgpAegUANQgUANgUAMIAAI2QAAAggWATQgWAVgigBQgiABgUgVg");
	this.shape_1.setTransform(79.3,5.4);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FF9900").s().p("ApvLYQgYgVgBgfQABgLAehOQAehPA0iAQA0iABCigICKlJQBIirBHikIAchAIAXg0IAJgYQAHgVAOgIQAPgJAZABQAhAAAWAUQAVATABAcIgBALIgEAPIAAABIgDAFIgEAGQAxB9AzB7QA1B7BBCQQBCCOBbC8QBaC8B+D+QAFAJABAGQABAGAAAHQAAAfgZAVQgYAWglABQgcABgPgNQgPgNgWgtQg4huhAiJQhBiJhRi1QhQizhpjuIg9iQIg3CDIhWDJIhCChIg7CUIBfgCICJgBIBVgBQAlgBAHgCIAngCIAbgBQAgABAVAVQAUAUAAAhQABAXgKAUQgIAVgRAJQgEAFgLABQgLABgcABIhTACIh9ACQhIAChRADIgiABIgXABQgaAAgIgCQgKgCgHgFIgSAqIgQAqIgoBkIgpBnIgYBDIgMAbIgEAIQgIALgPAGQgOAGgTAAQgkgBgXgWg");
	this.shape_2.setTransform(-56.8,5.3);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#FF9900").s().p("An+LNQgUgLgFgNIgNgdIADgHIAXzeIgRgXQgEgGgEgJQgCgKAAgLQABgiAWgVQAWgUAlgBQAWgBAOAKQAOAJAbAiQCiDTDCEVQDCETDpFgIAAxLQABgfAWgTQAWgVAiAAQAiAAAWAVQAVATABAfIAATtQgBAygbAfQgbAeguABQgYAAgWgLQgWgKgPgSIgJgPIgdgtQiXjeh9i2Qh6i0hoiSQhpiVhch8IgBDUIgII4QgEDNgDA5QgDAggXATQgXAVghgBQgUAAgVgLg");
	this.shape_3.setTransform(-194.1,5.4);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-265.6,-144.8,531.2,289.8);


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

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-74.9,-83.6,149.8,167.4);


(lib.Stage_g = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#00CC00").s().p("AGiNHQgYgXgCgoIgIjsQhgCih2BLQh2BLidgBQjegBifhmQihhohVi+QhWi/gBkIQABi0A+ibQA/icBuh2QBvh2CShCQCRhCCogBQCGABB3AzQB2A0BRBeQAZAbAJAUQAJATgBAWQAAAsgaAcQgaAbgrAAQgYABgSgKQgTgJgOgVQgyhOhXgsQhWgshoAAQipACiIBbQiIBbhQCbQhQCagCDCQABDPA9CTQA/CVBzBPQB0BPChABQCrABB1h6QB2h6BGj9IAAgwIkuAEQgegBgWgcQgUgagBglQABgkATgaQAVgaAegBIKkgEQAdABAWAcQAVAbACAjQgBAlgVAaQgVAagdABIi+AEIAWJ8QABAqgaAcQgbAbgtABQgqgBgXgWg");

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

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-76.3,-88.2,152.6,176.6);


(lib.Num_2 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Num
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#00CC00").s().p("EgsUA0RIAAs9QCki8EijmQEjjsGQkRQDyijFTjCQFTjCGujmQHdj4EEjCQD/jBDUkcQCLi8BVkcQBUkXAAoIQAAr1mVlmQmWlfp7AAQmJAAlfCeQlfCXiwERQAqDBBDELQA8EKAAD+QAADmi7C2QjCCwl3AAQkvAAikjOQijjUAAlfQAAlHC2lHQC1lNFTkXQFNkQHriqQHqipI5AAQTYAALdInQLXItAAOeQAAG6h/FrQiGFmkiEVQlBE1muDgQmuDatzGKQoPDsnGEEQnGD+kjDzMBIwAAAIAAQ1g");
	this.shape.setTransform(-16.2,8.8);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-299.9,-325.7,567.3,669.1);


(lib.Num_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#00CC00").s().p("EggjA1vIAAm7QC6gMGOglQGIgsCWgsQDBg+BqiJQBjiPAAkYMAAAhEPI4OAAIAAoLIFXAAQKgAAIXj5QIRj5DmkfIIEAAQgTGVgTIeQgSIcAAGuMAAAA5pQAADbBkCtQBdCoC1BSQAxAVBFAUQCcAsD+AnQFwA4C0AGIAAG7g");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-210.9,-343.8,422,687.7);


(lib.Go = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF0000").s().p("AiqDMQg6hEgBiBQAAhSAeg/QAehAA0gjQA0gkBEAAQBEAAAzAjQAzAiAcA+QAcA+ABBRQgBBSgdA9QgdA+g0AiQg0AihFAAQhtgBg7hFgAhTi5QgnAdgVAyQgWAyAABAQAABoApA0QApAzBSAAQAwAAAlgcQAmgcAWgwQAWgwAAg+QgBhAgUgxQgUgwglgbQglgbgxAAQgwAAglAdg");
	this.shape.setTransform(24.4,2.4);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF0000").s().p("ACGEMQgIgHgBgNIgChLQgeA0gnAYQgmAYgxAAQhHgBgzghQgzghgcg9Qgbg9gBhUQABg5AUgyQAUgyAjglQAkgmAvgVQAugWA2AAQAqAAAmARQAmARAaAeQAIAIACAHQADAGAAAHQAAAOgIAJQgJAJgNAAQgIAAgGgDQgGgDgEgHQgQgZgcgOQgbgOghAAQg2ABgsAdQgsAdgZAxQgZAygCA9QABBCATAvQAVAwAlAZQAlAZA0ABQA2AAAlgnQAlgnAXhRIAAgPIhgABQgLAAgGgJQgHgJAAgLQAAgMAHgHQAGgJAKAAIDYgBQAKAAAGAJQAHAIAAALQAAAMgGAIQgHAIgJABIg+ABIAIDLQAAAOgIAJQgJAJgOAAQgOAAgHgIg");
	this.shape_1.setTransform(-27.7,2.6);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-58.8,-55.4,111.1,111.6);


(lib.Bg_area = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


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

	this.timeline.addTween(cjs.Tween.get(this.frame).wait(70));

	// cover
	this.cover = new lib.cover();
	this.cover.name = "cover";
	this.cover.parent = this;
	this.cover.setTransform(100,15,1,1,0,0,0,100,15);

	this.timeline.addTween(cjs.Tween.get(this.cover).wait(70));

	// mask (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	var mask_graphics_0 = new cjs.Graphics().p("AvnCWIAAkrIfPAAIAAErg");
	var mask_graphics_1 = new cjs.Graphics().p("AvZCWIAAkrIezAAIAAErg");
	var mask_graphics_2 = new cjs.Graphics().p("AvKCWIAAkrIeVAAIAAErg");
	var mask_graphics_3 = new cjs.Graphics().p("Au8CWIAAkrId5AAIAAErg");
	var mask_graphics_4 = new cjs.Graphics().p("AutCWIAAkrIdbAAIAAErg");
	var mask_graphics_5 = new cjs.Graphics().p("AufCWIAAkrIc/AAIAAErg");
	var mask_graphics_6 = new cjs.Graphics().p("AuRCWIAAkrIcjAAIAAErg");
	var mask_graphics_7 = new cjs.Graphics().p("AuCCWIAAkrIcFAAIAAErg");
	var mask_graphics_8 = new cjs.Graphics().p("At0CWIAAkrIbpAAIAAErg");
	var mask_graphics_9 = new cjs.Graphics().p("AtmCWIAAkrIbNAAIAAErg");
	var mask_graphics_10 = new cjs.Graphics().p("AtXCWIAAkrIavAAIAAErg");
	var mask_graphics_11 = new cjs.Graphics().p("AtJCWIAAkrIaTAAIAAErg");
	var mask_graphics_12 = new cjs.Graphics().p("As6CWIAAkrIZ1AAIAAErg");
	var mask_graphics_13 = new cjs.Graphics().p("AssCWIAAkrIZZAAIAAErg");
	var mask_graphics_14 = new cjs.Graphics().p("AseCWIAAkrIY9AAIAAErg");
	var mask_graphics_15 = new cjs.Graphics().p("AsPCWIAAkrIYfAAIAAErg");
	var mask_graphics_16 = new cjs.Graphics().p("AsBCWIAAkrIYDAAIAAErg");
	var mask_graphics_17 = new cjs.Graphics().p("AryCWIAAkrIXlAAIAAErg");
	var mask_graphics_18 = new cjs.Graphics().p("ArkCWIAAkrIXJAAIAAErg");
	var mask_graphics_19 = new cjs.Graphics().p("ArWCWIAAkrIWtAAIAAErg");
	var mask_graphics_20 = new cjs.Graphics().p("ArHCWIAAkrIWPAAIAAErg");
	var mask_graphics_21 = new cjs.Graphics().p("Aq5CWIAAkrIVzAAIAAErg");
	var mask_graphics_22 = new cjs.Graphics().p("AqqCWIAAkrIVVAAIAAErg");
	var mask_graphics_23 = new cjs.Graphics().p("AqcCWIAAkrIU5AAIAAErg");
	var mask_graphics_24 = new cjs.Graphics().p("AqOCWIAAkrIUdAAIAAErg");
	var mask_graphics_25 = new cjs.Graphics().p("Ap/CWIAAkrIT/AAIAAErg");
	var mask_graphics_26 = new cjs.Graphics().p("ApxCWIAAkrITjAAIAAErg");
	var mask_graphics_27 = new cjs.Graphics().p("ApjCWIAAkrITHAAIAAErg");
	var mask_graphics_28 = new cjs.Graphics().p("ApUCWIAAkrISpAAIAAErg");
	var mask_graphics_29 = new cjs.Graphics().p("ApGCWIAAkrISNAAIAAErg");
	var mask_graphics_30 = new cjs.Graphics().p("Ao3CWIAAkrIRvAAIAAErg");
	var mask_graphics_31 = new cjs.Graphics().p("AopCWIAAkrIRTAAIAAErg");
	var mask_graphics_32 = new cjs.Graphics().p("AobCWIAAkrIQ3AAIAAErg");
	var mask_graphics_33 = new cjs.Graphics().p("AoMCWIAAkrIQZAAIAAErg");
	var mask_graphics_34 = new cjs.Graphics().p("An+CWIAAkrIP9AAIAAErg");
	var mask_graphics_35 = new cjs.Graphics().p("AnvCWIAAkrIPfAAIAAErg");
	var mask_graphics_36 = new cjs.Graphics().p("AnhCWIAAkrIPDAAIAAErg");
	var mask_graphics_37 = new cjs.Graphics().p("AnTCWIAAkrIOnAAIAAErg");
	var mask_graphics_38 = new cjs.Graphics().p("AnECWIAAkrIOJAAIAAErg");
	var mask_graphics_39 = new cjs.Graphics().p("Am2CWIAAkrINtAAIAAErg");
	var mask_graphics_40 = new cjs.Graphics().p("AmnCWIAAkrINPAAIAAErg");
	var mask_graphics_41 = new cjs.Graphics().p("AmZCWIAAkrIMzAAIAAErg");
	var mask_graphics_42 = new cjs.Graphics().p("AmLCWIAAkrIMXAAIAAErg");
	var mask_graphics_43 = new cjs.Graphics().p("Al8CWIAAkrIL5AAIAAErg");
	var mask_graphics_44 = new cjs.Graphics().p("AluCWIAAkrILdAAIAAErg");
	var mask_graphics_45 = new cjs.Graphics().p("AlgCWIAAkrILBAAIAAErg");
	var mask_graphics_46 = new cjs.Graphics().p("AlRCWIAAkrIKjAAIAAErg");
	var mask_graphics_47 = new cjs.Graphics().p("AlDCWIAAkrIKHAAIAAErg");
	var mask_graphics_48 = new cjs.Graphics().p("Ak0CWIAAkrIJpAAIAAErg");
	var mask_graphics_49 = new cjs.Graphics().p("AkmCWIAAkrIJNAAIAAErg");
	var mask_graphics_50 = new cjs.Graphics().p("AkYCWIAAkrIIxAAIAAErg");
	var mask_graphics_51 = new cjs.Graphics().p("AkJCWIAAkrIITAAIAAErg");
	var mask_graphics_52 = new cjs.Graphics().p("Aj7CWIAAkrIH3AAIAAErg");
	var mask_graphics_53 = new cjs.Graphics().p("AjsCWIAAkrIHZAAIAAErg");
	var mask_graphics_54 = new cjs.Graphics().p("AjeCWIAAkrIG9AAIAAErg");
	var mask_graphics_55 = new cjs.Graphics().p("AjQCWIAAkrIGhAAIAAErg");
	var mask_graphics_56 = new cjs.Graphics().p("AjBCWIAAkrIGDAAIAAErg");
	var mask_graphics_57 = new cjs.Graphics().p("AizCWIAAkrIFnAAIAAErg");
	var mask_graphics_58 = new cjs.Graphics().p("AilCWIAAkrIFLAAIAAErg");
	var mask_graphics_59 = new cjs.Graphics().p("AiWCWIAAkrIEtAAIAAErg");
	var mask_graphics_60 = new cjs.Graphics().p("AiICWIAAkrIERAAIAAErg");
	var mask_graphics_61 = new cjs.Graphics().p("Ah5CWIAAkrIDzAAIAAErg");
	var mask_graphics_62 = new cjs.Graphics().p("AhrCWIAAkrIDXAAIAAErg");
	var mask_graphics_63 = new cjs.Graphics().p("AhdCWIAAkrIC7AAIAAErg");
	var mask_graphics_64 = new cjs.Graphics().p("AhOCWIAAkrICdAAIAAErg");
	var mask_graphics_65 = new cjs.Graphics().p("AhACWIAAkrICBAAIAAErg");
	var mask_graphics_66 = new cjs.Graphics().p("AgxCWIAAkrIBjAAIAAErg");
	var mask_graphics_67 = new cjs.Graphics().p("AgjCWIAAkrIBHAAIAAErg");
	var mask_graphics_68 = new cjs.Graphics().p("AgVCWIAAkrIArAAIAAErg");
	var mask_graphics_69 = new cjs.Graphics().p("AgGCWIAAkrIANAAIAAErg");

	this.timeline.addTween(cjs.Tween.get(mask).to({graphics:mask_graphics_0,x:100,y:15}).wait(1).to({graphics:mask_graphics_1,x:98.6,y:15}).wait(1).to({graphics:mask_graphics_2,x:97.1,y:15}).wait(1).to({graphics:mask_graphics_3,x:95.7,y:15}).wait(1).to({graphics:mask_graphics_4,x:94.2,y:15}).wait(1).to({graphics:mask_graphics_5,x:92.8,y:15}).wait(1).to({graphics:mask_graphics_6,x:91.4,y:15}).wait(1).to({graphics:mask_graphics_7,x:89.9,y:15}).wait(1).to({graphics:mask_graphics_8,x:88.5,y:15}).wait(1).to({graphics:mask_graphics_9,x:87,y:15}).wait(1).to({graphics:mask_graphics_10,x:85.6,y:15}).wait(1).to({graphics:mask_graphics_11,x:84.2,y:15}).wait(1).to({graphics:mask_graphics_12,x:82.7,y:15}).wait(1).to({graphics:mask_graphics_13,x:81.3,y:15}).wait(1).to({graphics:mask_graphics_14,x:79.9,y:15}).wait(1).to({graphics:mask_graphics_15,x:78.4,y:15}).wait(1).to({graphics:mask_graphics_16,x:77,y:15}).wait(1).to({graphics:mask_graphics_17,x:75.5,y:15}).wait(1).to({graphics:mask_graphics_18,x:74.1,y:15}).wait(1).to({graphics:mask_graphics_19,x:72.7,y:15}).wait(1).to({graphics:mask_graphics_20,x:71.2,y:15}).wait(1).to({graphics:mask_graphics_21,x:69.8,y:15}).wait(1).to({graphics:mask_graphics_22,x:68.3,y:15}).wait(1).to({graphics:mask_graphics_23,x:66.9,y:15}).wait(1).to({graphics:mask_graphics_24,x:65.5,y:15}).wait(1).to({graphics:mask_graphics_25,x:64,y:15}).wait(1).to({graphics:mask_graphics_26,x:62.6,y:15}).wait(1).to({graphics:mask_graphics_27,x:61.1,y:15}).wait(1).to({graphics:mask_graphics_28,x:59.7,y:15}).wait(1).to({graphics:mask_graphics_29,x:58.3,y:15}).wait(1).to({graphics:mask_graphics_30,x:56.8,y:15}).wait(1).to({graphics:mask_graphics_31,x:55.4,y:15}).wait(1).to({graphics:mask_graphics_32,x:53.9,y:15}).wait(1).to({graphics:mask_graphics_33,x:52.5,y:15}).wait(1).to({graphics:mask_graphics_34,x:51.1,y:15}).wait(1).to({graphics:mask_graphics_35,x:49.6,y:15}).wait(1).to({graphics:mask_graphics_36,x:48.2,y:15}).wait(1).to({graphics:mask_graphics_37,x:46.8,y:15}).wait(1).to({graphics:mask_graphics_38,x:45.3,y:15}).wait(1).to({graphics:mask_graphics_39,x:43.9,y:15}).wait(1).to({graphics:mask_graphics_40,x:42.4,y:15}).wait(1).to({graphics:mask_graphics_41,x:41,y:15}).wait(1).to({graphics:mask_graphics_42,x:39.6,y:15}).wait(1).to({graphics:mask_graphics_43,x:38.1,y:15}).wait(1).to({graphics:mask_graphics_44,x:36.7,y:15}).wait(1).to({graphics:mask_graphics_45,x:35.2,y:15}).wait(1).to({graphics:mask_graphics_46,x:33.8,y:15}).wait(1).to({graphics:mask_graphics_47,x:32.4,y:15}).wait(1).to({graphics:mask_graphics_48,x:30.9,y:15}).wait(1).to({graphics:mask_graphics_49,x:29.5,y:15}).wait(1).to({graphics:mask_graphics_50,x:28,y:15}).wait(1).to({graphics:mask_graphics_51,x:26.6,y:15}).wait(1).to({graphics:mask_graphics_52,x:25.2,y:15}).wait(1).to({graphics:mask_graphics_53,x:23.7,y:15}).wait(1).to({graphics:mask_graphics_54,x:22.3,y:15}).wait(1).to({graphics:mask_graphics_55,x:20.8,y:15}).wait(1).to({graphics:mask_graphics_56,x:19.4,y:15}).wait(1).to({graphics:mask_graphics_57,x:18,y:15}).wait(1).to({graphics:mask_graphics_58,x:16.5,y:15}).wait(1).to({graphics:mask_graphics_59,x:15.1,y:15}).wait(1).to({graphics:mask_graphics_60,x:13.7,y:15}).wait(1).to({graphics:mask_graphics_61,x:12.2,y:15}).wait(1).to({graphics:mask_graphics_62,x:10.8,y:15}).wait(1).to({graphics:mask_graphics_63,x:9.3,y:15}).wait(1).to({graphics:mask_graphics_64,x:7.9,y:15}).wait(1).to({graphics:mask_graphics_65,x:6.5,y:15}).wait(1).to({graphics:mask_graphics_66,x:5,y:15}).wait(1).to({graphics:mask_graphics_67,x:3.6,y:15}).wait(1).to({graphics:mask_graphics_68,x:2.1,y:15}).wait(1).to({graphics:mask_graphics_69,x:0.7,y:15}).wait(1));

	// bar
	this.shape = new cjs.Shape();
	this.shape.graphics.lf(["#FF0000","#F3D264"],[0,1],-100,0,100,0).s().p("AvnCWIAAkrIfPAAIAAErg");
	this.shape.setTransform(100,15);

	var maskedShapeInstanceList = [this.shape];

	for(var shapedInstanceItr = 0; shapedInstanceItr < maskedShapeInstanceList.length; shapedInstanceItr++) {
		maskedShapeInstanceList[shapedInstanceItr].mask = mask;
	}

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(70));

	// cover
	this.instance = new lib.cover();
	this.instance.parent = this;
	this.instance.setTransform(100,15,1,1,0,0,0,100,15);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(70));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-3,-3,206,36);


(lib.VmaxGauge = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Text
	this.text = new cjs.Text("V  -  M  A  X", "25px 'MS Gothic'", "#FFFEB8");
	this.text.lineHeight = 27;
	this.text.lineWidth = 188;
	this.text.parent = this;
	this.text.setTransform(13.9,2.9);

	this.timeline.addTween(cjs.Tween.get(this.text).wait(1));

	// progress
	this.progress = new lib.VmaxGauge_base();
	this.progress.name = "progress";
	this.progress.parent = this;
	this.progress.setTransform(100,15,1,1,0,0,0,100,15);

	this.timeline.addTween(cjs.Tween.get(this.progress).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-3,-3,206.7,36);


(lib.Heart_beat_weak = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Heart_base_weak();
	this.instance.parent = this;
	this.instance.setTransform(23.2,22.4,0.67,0.67,0,0,0,23.2,22.4);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:23.4,regY:22.6,scaleX:0.31,scaleY:0.31},19).to({regX:23.2,regY:22.4,scaleX:0.67,scaleY:0.67},4).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(7.3,7,31.7,30.6);


(lib.Heart_beat_strong = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Heart_base_strong();
	this.instance.parent = this;
	this.instance.setTransform(18.3,17.7,1.002,1.002,0,0,0,18.2,17.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:18.3,scaleX:0.91,scaleY:0.91,x:18.4},19).to({regX:18.2,scaleX:1,scaleY:1,x:18.3},4).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-0.5,-0.5,47.3,45.7);


(lib.Heart_beat_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Heart_base();
	this.instance.parent = this;
	this.instance.setTransform(18.3,17.6,0.763,0.763,0,0,0,18.3,17.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regY:17.7,scaleX:0.67,scaleY:0.67,y:17.7},19).to({regY:17.6,scaleX:0.76,scaleY:0.76,y:17.6},4).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(4,3.8,36.1,34.8);


(lib.Spider_legs_move_2 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Spider_leg_4
	this.instance = new lib.Spider_leg_4("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0.6,7.1,1.654,1.654);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:0.1,regY:0.1,x:0.7,y:7.2},23,cjs.Ease.quadInOut).wait(1));

	// Spider_leg_3
	this.instance_1 = new lib.Spider_leg_3("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(-0.6,3.6,1.654,1.654);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regX:0.1,regY:0.1,x:-0.5,y:3.7},23,cjs.Ease.quadInOut).wait(1));

	// Spider_leg_2
	this.instance_2 = new lib.Spider_leg_2("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(-0.3,1.9,1.654,1.654);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({x:-0.4},23,cjs.Ease.quadInOut).wait(1));

	// Spider_leg_1
	this.instance_3 = new lib.Spider_leg_1("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(-0.5,-3.8,1.654,1.654);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({scaleX:1.66,x:-0.4},23,cjs.Ease.quadInOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-29.3,-22.3,31.1,44.8);


(lib.Spider_legs_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Spider_leg_4
	this.instance = new lib.Spider_leg_4("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0.6,7.1,1.654,1.654);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:0.1,regY:0.1,rotation:3,y:7.2},15,cjs.Ease.quadInOut).wait(1).to({regX:-6.3,regY:4.1,rotation:2.9,x:-10.3,y:13.2},0).wait(1).to({rotation:2.7,y:13.3},0).wait(1).to({rotation:2.3,x:-10.2,y:13.4},0).wait(1).to({rotation:1.7,x:-10.1,y:13.5},0).wait(1).to({rotation:1.1,y:13.6},0).wait(1).to({rotation:0.6,x:-9.9,y:13.7},0).wait(1).to({rotation:0.2,y:13.8},0).wait(1).to({regX:0.1,regY:0.1,rotation:0,x:0.7,y:7.2},0).wait(1));

	// Spider_leg_3
	this.instance_1 = new lib.Spider_leg_3("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(-0.6,3.6,1.654,1.654);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regX:0.1,regY:0.1,rotation:5.8,x:-0.9,y:3.7},15,cjs.Ease.quadInOut).wait(1).to({regX:-6.9,regY:1,rotation:5.6,x:-12.5,y:4.1},0).wait(1).to({rotation:5.2,y:4.2},0).wait(1).to({rotation:4.4,y:4.3},0).wait(1).to({rotation:3.3,x:-12.3,y:4.5},0).wait(1).to({rotation:2.1,x:-12.2,y:4.7},0).wait(1).to({rotation:1.1,x:-12.1,y:4.9},0).wait(1).to({rotation:0.4,x:-12,y:5.1},0).wait(1).to({regX:0.1,regY:0.1,rotation:0,x:-0.5,y:3.7},0).wait(1));

	// Spider_leg_2
	this.instance_2 = new lib.Spider_leg_2("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(-0.3,1.9,1.654,1.654);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({rotation:3.9,x:-1.3},15,cjs.Ease.quadInOut).wait(1).to({regX:-7.3,regY:-3.9,rotation:3.8,x:-12.9,y:-5.4},0).wait(1).to({rotation:3.5},0).wait(1).to({rotation:3,x:-12.8,y:-5.3},0).wait(1).to({rotation:2.3,x:-12.7,y:-5.1},0).wait(1).to({rotation:1.5,x:-12.6,y:-4.9},0).wait(1).to({rotation:0.8,x:-12.5,y:-4.8},0).wait(1).to({rotation:0.3,x:-12.4,y:-4.7},0).wait(1).to({regX:0,regY:0,rotation:0,x:-0.4,y:1.9},0).wait(1));

	// Spider_leg_1
	this.instance_3 = new lib.Spider_leg_1("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(-0.5,-3.8,1.654,1.654);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({scaleX:1.71,rotation:5.2},15,cjs.Ease.quadInOut).wait(1).to({regX:-8.3,regY:-4.9,scaleX:1.71,rotation:5.1,x:-13.8,y:-13.1},0).wait(1).to({scaleX:1.7,rotation:4.7,x:-13.9,y:-13},0).wait(1).to({scaleX:1.7,rotation:4,y:-12.9},0).wait(1).to({scaleX:1.69,rotation:3,x:-14,y:-12.6},0).wait(1).to({scaleX:1.68,rotation:1.9,x:-14.1,y:-12.3},0).wait(1).to({scaleX:1.67,rotation:1,y:-12.1},0).wait(1).to({scaleX:1.66,rotation:0.4,y:-12},0).wait(1).to({regX:0,regY:0,scaleX:1.66,rotation:0,x:-0.4,y:-3.8},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-29.3,-22.3,31.1,44.8);


(lib.Spider_eye_wink = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Spider_eye("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0,0.2,1.654,1.014,0,0,0,0,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regY:0,scaleY:1.65,rotation:5.2,x:0.2,y:0},11,cjs.Ease.quadOut).wait(1).to({rotation:4.5,x:0.1},0).wait(1).to({rotation:3.7},0).wait(1).to({rotation:3},0).wait(1).to({rotation:2.4},0).wait(1).to({rotation:1.8},0).wait(1).to({rotation:1.4},0).wait(1).to({rotation:1},0).wait(1).to({rotation:0.7},0).wait(1).to({rotation:0.4},0).wait(1).to({rotation:0.2},0).wait(1).to({rotation:0.1},0).wait(1).to({rotation:0,x:0},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1.6,-1.4,3.3,3);


(lib.Spider_eye_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Spider_eye("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0,0,1.654,1.654);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({rotation:5.2,x:0.2},11,cjs.Ease.quadOut).wait(1).to({rotation:4.5,x:0.1},0).wait(1).to({rotation:3.7},0).wait(1).to({rotation:3},0).wait(1).to({rotation:2.4},0).wait(1).to({rotation:1.8},0).wait(1).to({rotation:1.4},0).wait(1).to({rotation:1},0).wait(1).to({rotation:0.7},0).wait(1).to({rotation:0.4},0).wait(1).to({rotation:0.2},0).wait(1).to({rotation:0.1},0).wait(1).to({rotation:0,x:0},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1.6,-2.5,3.3,5);


(lib.Spider_body_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Spider_body("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0,0,1.654,1.654);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({rotation:4,x:0.5,y:0.1},11,cjs.Ease.quadInOut).to({rotation:0,x:0,y:0},13,cjs.Ease.quadInOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-10.6,-21.3,21.2,42.8);


(lib.Head_weak = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Eye
	this.instance = new lib.Eye_weak("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(6,4.5,1,1,0,180,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:-1.8},18).to({y:17.8},24).to({y:5.1},21).wait(1));

	// Eye
	this.instance_1 = new lib.Eye_weak("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(5.8,-7.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({y:-13.7},18).to({y:5.9},24).to({y:-6.8},21).wait(1));

	// BodyPart
	this.instance_2 = new lib.BodyPart_weak("synched",0);
	this.instance_2.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({y:-7.7},19).to({y:12.2},24).to({y:0.6},20).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-18,36,36);


(lib.Head_vmax_weak = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Eye
	this.instance = new lib.Eye_vmax_weak("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(6,4.5,1,1,0,180,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:-1.8},18).to({y:17.8},24).to({y:5.1},21).wait(1));

	// Eye
	this.instance_1 = new lib.Eye_vmax_weak("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(5.8,-7.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({y:-13.7},18).to({y:5.9},24).to({y:-6.8},21).wait(1));

	// BodyPart
	this.instance_2 = new lib.BodyPart_vmax_weak("synched",0);
	this.instance_2.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({y:-7.7},19).to({y:12.2},24).to({y:0.6},20).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-18,36,36);


(lib.Head_vmax = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Eye
	this.instance = new lib.Eye_vmax("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(6,4.5,1,1,0,180,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:-1.8},18).to({y:17.8},24).to({y:5.1},21).wait(1));

	// Eye
	this.instance_1 = new lib.Eye_vmax("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(5.8,-7.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({y:-13.7},18).to({y:5.9},24).to({y:-6.8},21).wait(1));

	// BodyPart
	this.instance_2 = new lib.BodyPart_vmax("synched",0);
	this.instance_2.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({y:-7.7},19).to({y:12.2},24).to({y:0.6},20).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-18,36,36);


(lib.Head = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Eye
	this.instance = new lib.Eye("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(6,4.5);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:-1.8},18).to({y:17.8},24).to({y:5.1},21).wait(1));

	// Eye
	this.instance_1 = new lib.Eye("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(5.8,-7.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({y:-13.7},18).to({y:5.9},24).to({y:-6.8},21).wait(1));

	// BodyPart
	this.instance_2 = new lib.BodyPart("synched",0);
	this.instance_2.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({y:-7.7},19).to({y:12.2},24).to({y:0.6},20).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-18,36,36);


(lib.Body = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// BodyPart
	this.instance = new lib.BodyPart("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:-10.5},22).to({y:9.9},25).to({y:0.3},24).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18,-18,36,36);


(lib.Bubble_red_break = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble_red_body("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,48.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:48.5,regY:48.5,scaleX:4.86,scaleY:4.86,x:47.8,y:47.8,alpha:0},11,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,97.4,97.4);


(lib.Bubble_red = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble_red_body("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,48.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:79.5},29).to({x:54.3},30).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,97.4,97.4);


(lib.Bubble_break = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble_body("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,48.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:48.5,regY:48.5,scaleX:4.86,scaleY:4.86,x:47.8,y:47.8,alpha:0},11,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,97.4,97.4);


(lib.Bubble_blue_break = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble_blue_body("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,48.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:48.5,regY:48.5,scaleX:4.86,scaleY:4.86,x:47.8,y:47.8,alpha:0},11,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,97.4,97.4);


(lib.Bubble_blue = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble_blue_body("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,48.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:79.5},29).to({x:54.3},30).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,97.4,97.4);


(lib.Bubble = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble_body("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,48.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:79.5},29).to({x:54.3},30).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,97.4,97.4);


(lib.Mouse_face_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Mouse_face("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleX:0.95},15,cjs.Ease.quadIn).wait(1).to({scaleX:0.95},0).wait(1).to({scaleX:0.96},0).wait(1).to({scaleX:0.96},0).wait(1).to({scaleX:0.96},0).wait(1).to({scaleX:0.97},0).wait(1).to({scaleX:0.97},0).wait(1).to({scaleX:0.98},0).wait(1).to({scaleX:0.99},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-30,-28.3,60,56.8);


(lib.Mouse_ear_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Mouse_Ear("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:0.1,scaleX:0.9,scaleY:1.1,rotation:-9.7,x:1.3,y:-0.9},11,cjs.Ease.quadInOut).wait(1).to({regX:0,scaleX:0.9,scaleY:1.09,rotation:-9.6,x:1.1},0).wait(1).to({scaleX:0.9,scaleY:1.09,rotation:-9.2},0).wait(1).to({scaleX:0.91,scaleY:1.09,rotation:-8.6,x:1,y:-0.8},0).wait(1).to({scaleX:0.92,scaleY:1.08,rotation:-7.8,x:0.9},0).wait(1).to({scaleX:0.93,scaleY:1.07,rotation:-6.7,x:0.8,y:-0.6},0).wait(1).to({scaleX:0.94,scaleY:1.05,rotation:-5.3,x:0.6,y:-0.5},0).wait(1).to({scaleX:0.96,scaleY:1.04,rotation:-4,x:0.4,y:-0.4},0).wait(1).to({scaleX:0.97,scaleY:1.03,rotation:-2.7,x:0.3,y:-0.3},0).wait(1).to({scaleX:0.98,scaleY:1.02,rotation:-1.7,x:0.2,y:-0.2},0).wait(1).to({scaleX:0.99,scaleY:1.01,rotation:-0.9,x:0.1,y:-0.1},0).wait(1).to({scaleX:1,scaleY:1,rotation:-0.4,x:0,y:0},0).wait(1).to({regX:0.2,scaleX:1,scaleY:1,rotation:0,x:0.1},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-12.6,-12.5,25.2,25.1);


(lib.Wine_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Wine_base("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(14,18.8,0.048,0.048,0,0,0,13.5,18.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:14,regY:18.6,scaleX:1.1,scaleY:1.1,rotation:375,x:16.3,y:15.7},17,cjs.Ease.quadOut).to({regX:13.9,regY:18.7,scaleX:1,scaleY:1,rotation:348.8,x:14,y:18.8},3).to({regX:14,rotation:360,y:18.7},2).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(12.4,16.9,3.4,3.8);


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
	this.instance.setTransform(12,26.9,0.018,0.018,0,0,0,11,27.4);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:12,regY:26.8,scaleX:1,scaleY:1,rotation:732.7},11,cjs.Ease.quadOut).to({rotation:718.3,x:12.1},2).wait(1).to({rotation:720,x:12,y:26.8},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(11.8,26.4,0.4,1);


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
	this.normal.setTransform(18,3.3);

	this.spawn = new lib.Key_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(30,26.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},6).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(18,3.3,24,53.7);


(lib.Gate_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Gate_wave();
	this.instance.parent = this;
	this.instance.setTransform(30,30,0.639,0.639);
	this.instance._off = true;

	this.instance_1 = new lib.Gate_outer();
	this.instance_1.parent = this;
	this.instance_1.setTransform(30.9,30.9,8.494,8.494,0,0,0,0.1,0.1);
	this.instance_1.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},2).to({state:[{t:this.instance_1}]},10).to({state:[]},1).wait(33));
	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({_off:false},0).to({_off:true,regX:0.1,regY:0.1,scaleX:8.49,scaleY:8.49,x:30.9,y:30.9,alpha:0},10,cjs.Ease.quadOut).wait(34));

	// レイヤー_2
	this.instance_2 = new lib.Gate_wave();
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30,0.738,0.738);

	this.instance_3 = new lib.Gate_outer();
	this.instance_3.parent = this;
	this.instance_3.setTransform(30.9,30.9,8.494,8.494,0,0,0,0.1,0.1);
	this.instance_3.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_2}]}).to({state:[{t:this.instance_3}]},10).to({state:[]},1).wait(35));
	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({_off:true,regX:0.1,regY:0.1,scaleX:8.49,scaleY:8.49,x:30.9,y:30.9,alpha:0},10,cjs.Ease.quadOut).wait(36));

	// レイヤー_1
	this.instance_4 = new lib.Gate_inner();
	this.instance_4.parent = this;
	this.instance_4.setTransform(30,30,0.086,0.086);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(2).to({_off:false},0).to({scaleX:1.48,scaleY:1.48,rotation:1080},37,cjs.Ease.quadOut).to({scaleX:1,scaleY:1},6).wait(1));

	// レイヤー_3
	this.instance_5 = new lib.Gate_outer();
	this.instance_5.parent = this;
	this.instance_5.setTransform(30,30,4.567,4.567);
	this.instance_5.alpha = 0;
	this.instance_5._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(2).to({_off:false},0).to({scaleX:6.11,scaleY:6.11,rotation:757.6,y:30.1,alpha:0.367},8,cjs.Ease.quadOut).to({scaleX:0.95,scaleY:0.95,rotation:-360,y:30,alpha:1},31,cjs.Ease.quadInOut).to({scaleX:1,scaleY:1,rotation:-360},4).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(7.5,7.5,45,45);


(lib.Gate_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Gate_base("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:29.9,regY:29.9,scaleX:1.2,scaleY:1.2,rotation:536.2,x:29.9,y:29.9,startPosition:22},22).to({scaleX:1,scaleY:1,rotation:360,startPosition:45},23).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,60,60);


(lib.Coin_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.CoinBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30.1,30.1,0.133,0.133,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleX:1,scaleY:1,rotation:360,x:30,y:30},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(26.1,26.1,8.1,8.1);


(lib.Coin_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.CoinBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(20.1,22.6,1,1,0,0,0,20.1,22.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(6.4,6.4,47.4,47.4);


(lib.Coin = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":6});

	// Key
	this.normal = new lib.Coin_normal();
	this.normal.name = "normal";
	this.normal.parent = this;

	this.spawn = new lib.Coin_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(10,5.8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},6).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(7.3,7.3,45.7,45.7);


(lib.Berry_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.BerryBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(20.2,22.6,0.082,0.082,0,0,0,20.2,22.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:20.1,scaleX:1,scaleY:1,rotation:360,x:20.1},23,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(17.5,19.8,5.3,5.7);


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
	this.normal.setTransform(10,5.8);

	this.spawn = new lib.Berry_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(10,5.8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},6).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(9.5,5.3,41.3,46.3);


(lib.Apple_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Apple_base("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(20.1,21.9,0.057,0.057,103,0,0,20.9,21.1);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:20.1,regY:21.8,scaleX:1.13,scaleY:1.13,rotation:740.7,x:22.5,y:19.7},21,cjs.Ease.quadIn).to({regX:20,scaleX:1,scaleY:1,rotation:703.8,x:15.9,y:22.1},4).to({regX:19.9,regY:21.9,rotation:722.7,x:20.1,y:21.9},3).wait(1).to({rotation:720,x:20},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(18.6,20.6,3.6,2.5);


(lib.Apple = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":6});

	// Key
	this.normal = new lib.Apple_base();
	this.normal.name = "normal";
	this.normal.parent = this;
	this.normal.setTransform(30,29.6,1,1,0,0,0,20,21.8);

	this.spawn = new lib.Apple_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(30,25.8,1,1,0,0,0,20,21.8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},6).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(10,5.3,40,48.5);


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
	this.instance_2.setTransform(26.6,34.5);

	this.instance_3 = new lib.Spider_eye_wink("synched",23);
	this.instance_3.parent = this;
	this.instance_3.setTransform(26.6,34.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_2}]}).to({state:[{t:this.instance_3}]},95).wait(25));

	// Spider_legs_move
	this.instance_4 = new lib.Spider_legs_move_2("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(48.4,32.9,1,1,0,0,180,-13.8,0);

	this.instance_5 = new lib.Spider_legs_move("synched",23);
	this.instance_5.parent = this;
	this.instance_5.setTransform(48.4,32.9,1,1,0,0,180,-13.8,0);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_4,p:{startPosition:0}}]}).to({state:[{t:this.instance_5}]},23).to({state:[{t:this.instance_4,p:{startPosition:23}}]},24).to({state:[{t:this.instance_5}]},48).wait(25));

	// Spider_legs_move
	this.instance_6 = new lib.Spider_legs_move_2("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(11.2,32.9,1,1,0,0,0,-13.8,0);

	this.instance_7 = new lib.Spider_legs_move("synched",23);
	this.instance_7.parent = this;
	this.instance_7.setTransform(11.2,32.9,1,1,0,0,0,-13.8,0);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_6,p:{startPosition:0}}]}).to({state:[{t:this.instance_7}]},23).to({state:[{t:this.instance_6,p:{startPosition:23}}]},24).to({state:[{t:this.instance_7}]},48).wait(25));

	// Spider_body
	this.instance_8 = new lib.Spider_body_move("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(29.9,21.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(120));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.4,0,68.4,55.3);


(lib.Spider_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Spider_eye
	this.instance = new lib.Spider_eye_fear("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(33.1,35.4,1.654,1.654,-3.7,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({y:33.4},0).wait(2));

	// Spider_eye
	this.instance_1 = new lib.Spider_eye_fear("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(26.4,33.9,1.654,1.654,-3.7,0,0,0,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(2).to({y:35.9},0).wait(2));

	// Spider_body
	this.instance_2 = new lib.Spider_body_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(28.9,21.3,1.654,1.654,-3.7);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(2).to({regX:0.1,regY:0.1,rotation:4.5,x:30.6,y:21.5},0).wait(2));

	// レイヤー_13
	this.instance_3 = new lib.Spider_legs_fear("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(47.4,32.8,1,1,0,0,180,-13.9,0);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(2).to({regX:-14,scaleX:0.76,x:44.1},0).wait(2));

	// Spider_legs_fear
	this.instance_4 = new lib.Spider_legs_fear("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(11.4,33,1,1,0,0,0,-13.9,0);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(2).to({regX:-13.8,scaleX:0.88,x:13.2},0).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-3.4,0.1,65.7,54.7);


(lib.Spider_defeated = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Spider_eye
	this.instance = new lib.Spider_eye_fear("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(33.1,35.4,1.654,1.654,-3.7,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleY:6.87,rotation:124.2,x:49.1,y:38.4,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_eye
	this.instance_1 = new lib.Spider_eye_fear("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(26.4,33.9,1.654,1.654,-3.7,0,0,0,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regY:0.3,scaleY:8.95,rotation:-134.1,x:12.6,y:38.2,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_body
	this.instance_2 = new lib.Spider_body_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(28.9,21.3,1.654,1.654,-3.7);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({regX:0.1,regY:0.3,scaleX:3.61,scaleY:3.41,x:28.6,y:10.8,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_4
	this.instance_3 = new lib.Spider_leg_4("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(34.7,39.9,1.654,1.654,0,0,180);
	this.instance_3.filters = [new cjs.ColorFilter(0, 0, 0, 1, 35, 21, 255, 0)];
	this.instance_3.cache(-15,-3,18,14);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({regX:-0.1,regY:0.1,skewX:67.2,skewY:247.2,x:24.9,y:63.1,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_3
	this.instance_4 = new lib.Spider_leg_3("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(36,36.4,1.654,1.654,0,0,180);
	this.instance_4.filters = [new cjs.ColorFilter(0, 0, 0, 1, 35, 21, 255, 0)];
	this.instance_4.cache(-17,-7,20,15);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({regX:-0.1,regY:0.1,skewX:73,skewY:253,x:64.8,y:50,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_2
	this.instance_5 = new lib.Spider_leg_2("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(35.7,34.7,1.654,1.654,0,0,180);
	this.instance_5.filters = [new cjs.ColorFilter(0, 0, 0, 1, 35, 21, 255, 0)];
	this.instance_5.cache(-17,-12,20,17);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({skewX:16.2,skewY:196.2,x:73.2,y:16.3,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_1
	this.instance_6 = new lib.Spider_leg_1("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(35.9,29.1,1.654,1.654,0,0,180);
	this.instance_6.filters = [new cjs.ColorFilter(0, 0, 0, 1, 35, 21, 255, 0)];
	this.instance_6.cache(-19,-13,22,17);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({regX:-0.1,regY:0.1,skewX:-43.2,skewY:136.8,x:50.6,y:-5.6,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_4
	this.instance_7 = new lib.Spider_leg_4("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(25.6,39.9,1.654,1.654);
	this.instance_7.filters = [new cjs.ColorFilter(0, 0, 0, 1, 35, 21, 255, 0)];
	this.instance_7.cache(-15,-3,18,14);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).to({regX:0.1,regY:0.1,rotation:-26.7,x:-5.8,y:53.5,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_3
	this.instance_8 = new lib.Spider_leg_3("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(24.4,36.4,1.654,1.654);
	this.instance_8.filters = [new cjs.ColorFilter(0, 0, 0, 1, 35, 21, 255, 0)];
	this.instance_8.cache(-17,-7,20,15);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).to({regX:0.1,regY:0.1,rotation:44.5,x:-5.5,y:39.9,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_2
	this.instance_9 = new lib.Spider_leg_2("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(24.7,34.7,1.654,1.654);
	this.instance_9.filters = [new cjs.ColorFilter(0, 0, 0, 1, 35, 21, 255, 0)];
	this.instance_9.cache(-17,-12,20,17);

	this.timeline.addTween(cjs.Tween.get(this.instance_9).to({rotation:28,x:-3.7,y:11.2,alpha:0},17,cjs.Ease.quadOut).wait(1));

	// Spider_leg_1
	this.instance_10 = new lib.Spider_leg_1("synched",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(24.5,29.1,1.654,1.654);
	this.instance_10.filters = [new cjs.ColorFilter(0, 0, 0, 1, 35, 21, 255, 0)];
	this.instance_10.cache(-19,-13,22,17);

	this.timeline.addTween(cjs.Tween.get(this.instance_10).to({regY:0.1,rotation:51.7,x:15.5,y:-10.4,alpha:0},17,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.4,0.1,69.1,55.2);


(lib.Mouse_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Mouse_mustache_upper
	this.instance = new lib.Mouse_mustache_upper("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(10.6,43.7,1,1,0,-15.2,164.8,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(18).to({startPosition:0},0).wait(2).to({skewX:-9.2,skewY:170.8},0).wait(2).to({skewX:-15.2,skewY:164.8},0).wait(54).to({startPosition:0},0).wait(2).to({skewX:-9.2,skewY:170.8},0).wait(2).to({skewX:-15.2,skewY:164.8},0).wait(17).to({startPosition:0},0).to({scaleX:0.99,scaleY:0.89,skewX:-17.2,skewY:166.6,y:45.7},4,cjs.Ease.quadOut).to({regX:-6.8,regY:0.7,scaleX:1,scaleY:0.99,skewX:-15.3,skewY:164.9,x:10.5,y:32.9},8,cjs.Ease.quadInOut).to({regY:0.8,scaleX:0.99,scaleY:0.87,skewX:-17.6,skewY:166.9,y:46.1},5,cjs.Ease.quadInOut).to({regX:-6.9,regY:0.6,scaleX:1,scaleY:1,skewX:-15.2,skewY:164.8,x:10.6,y:43.7},5,cjs.Ease.quadOut).wait(1));

	// Mouse_mustache_upper
	this.instance_1 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(10.6,39.2,1,1,0,0,180,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(18).to({startPosition:0},0).wait(2).to({skewX:10.2,skewY:190.2,y:39.3},0).wait(2).to({skewX:0,skewY:180,y:39.2},0).wait(54).to({startPosition:0},0).wait(2).to({skewX:10.2,skewY:190.2,y:39.3},0).wait(2).to({skewX:0,skewY:180,y:39.2},0).wait(17).to({startPosition:0},0).to({scaleY:0.88,y:41.8},4,cjs.Ease.quadOut).to({scaleY:0.99,y:28.4},8,cjs.Ease.quadInOut).to({regY:0.7,scaleY:0.86,y:42.3},5,cjs.Ease.quadInOut).to({regY:0.6,scaleY:1,y:39.2},5,cjs.Ease.quadOut).wait(1));

	// Mouse_mustache_upper
	this.instance_2 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(52.8,43.7,1,1,15.2,0,0,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(18).to({startPosition:0},0).wait(2).to({rotation:8.7},0).wait(2).to({rotation:15.2},0).wait(54).to({startPosition:0},0).wait(2).to({rotation:8.7},0).wait(2).to({rotation:15.2},0).wait(17).to({startPosition:0},0).to({scaleX:0.99,scaleY:0.89,rotation:0,skewX:17.2,skewY:13.4,y:45.7},4,cjs.Ease.quadOut).to({regX:-6.8,regY:0.7,scaleX:1,scaleY:0.99,skewX:15.3,skewY:15.1,x:52.9,y:32.9},8,cjs.Ease.quadInOut).to({regY:0.8,scaleX:0.99,scaleY:0.87,skewX:17.6,skewY:13.1,y:46.1},5,cjs.Ease.quadInOut).to({regX:-6.9,regY:0.6,scaleX:1,scaleY:1,rotation:15.2,skewX:0,skewY:0,x:52.8,y:43.7},5,cjs.Ease.quadOut).wait(1));

	// Mouse_mustache_upper
	this.instance_3 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(52.8,39.2,1,1,0,0,0,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(18).to({startPosition:0},0).wait(2).to({rotation:-4},0).wait(2).to({rotation:0},0).wait(54).to({startPosition:0},0).wait(2).to({rotation:-4},0).wait(2).to({rotation:0},0).wait(17).to({startPosition:0},0).to({scaleY:0.88,y:41.8},4,cjs.Ease.quadOut).to({scaleY:0.99,y:28.4},8,cjs.Ease.quadInOut).to({regY:0.7,scaleY:0.86,y:42.3},5,cjs.Ease.quadInOut).to({regY:0.6,scaleY:1,y:39.2},5,cjs.Ease.quadOut).wait(1));

	// Mouse_nose
	this.instance_4 = new lib.Mouse_nose("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(30,42.1,1,1,0,0,0,0,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(97).to({startPosition:0},0).to({scaleY:0.88,y:44.3},4,cjs.Ease.quadOut).to({scaleY:0.99,y:31.2},8,cjs.Ease.quadInOut).to({regY:0.4,scaleY:0.86,y:44.7},5,cjs.Ease.quadInOut).to({regY:0.3,scaleY:1,y:42.1},5,cjs.Ease.quadOut).wait(1));

	// Mouse_eye
	this.instance_5 = new lib.Mouse_eye("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(44,33.8);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(19).to({startPosition:0},0).wait(2).to({scaleY:0.29},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.29},0).wait(2).to({scaleY:1},0).wait(49).to({startPosition:0},0).wait(1).to({startPosition:0},0).wait(2).to({scaleY:0.29},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.29},0).wait(2).to({scaleY:1},0).wait(12).to({startPosition:0},0).to({scaleY:0.88,y:37},4,cjs.Ease.quadOut).to({regY:0.1,scaleY:0.99,y:23},8,cjs.Ease.quadInOut).to({regY:0.2,scaleY:0.86,y:37.6},5,cjs.Ease.quadInOut).to({regY:0,scaleY:1,y:33.8},5,cjs.Ease.quadOut).wait(1));

	// Mouse_eye
	this.instance_6 = new lib.Mouse_eye("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(16,33.8);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(19).to({startPosition:0},0).wait(2).to({scaleY:0.29},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.29},0).wait(2).to({scaleY:1},0).wait(49).to({startPosition:0},0).wait(1).to({startPosition:0},0).wait(2).to({scaleY:0.29},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.29},0).wait(2).to({scaleY:1},0).wait(12).to({startPosition:0},0).to({scaleY:0.88,y:37},4,cjs.Ease.quadOut).to({regY:0.1,scaleY:0.99,y:23},8,cjs.Ease.quadInOut).to({regY:0.2,scaleY:0.86,y:37.6},5,cjs.Ease.quadInOut).to({regY:0,scaleY:1,y:33.8},5,cjs.Ease.quadOut).wait(1));

	// Mouse_face
	this.instance_7 = new lib.Mouse_face_move("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(30,31.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(97).to({startPosition:0},0).to({scaleY:0.88,y:35.1,startPosition:4},4,cjs.Ease.quadOut).to({scaleY:0.99,y:20.8,startPosition:14},8,cjs.Ease.quadInOut).to({regY:0.1,scaleY:0.86,y:35.8,startPosition:17},5,cjs.Ease.quadInOut).to({regY:0,scaleY:1,y:31.6,startPosition:0},5,cjs.Ease.quadOut).wait(1));

	// Mouse_Ear
	this.instance_8 = new lib.Mouse_ear_move("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(50,6.4,1,1,0,0,180);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(97).to({startPosition:0},0).to({scaleY:0.88,y:13,startPosition:4},4,cjs.Ease.quadOut).to({scaleY:0.99,y:-4.2,startPosition:14},8,cjs.Ease.quadInOut).to({scaleY:0.86,y:14.1,startPosition:17},5,cjs.Ease.quadInOut).to({scaleY:1,y:6.4,startPosition:0},5,cjs.Ease.quadOut).wait(1));

	// Mouse_Ear
	this.instance_9 = new lib.Mouse_ear_move("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(10,6.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_9).wait(97).to({startPosition:0},0).to({scaleY:0.88,y:13,startPosition:4},4,cjs.Ease.quadOut).to({scaleY:0.99,y:-4.2,startPosition:14},8,cjs.Ease.quadInOut).to({scaleY:0.86,y:14.1,startPosition:17},5,cjs.Ease.quadInOut).to({scaleY:1,y:6.4,startPosition:0},5,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4,-6.1,71.4,66.1);


(lib.Mouse_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Mouse_mustache_upper
	this.instance = new lib.Mouse_mustache_upper("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(8.6,43.7,1,1,0,-62.4,117.6,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({x:12.6},0).wait(2));

	// Mouse_mustache_upper
	this.instance_1 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(8.7,39.2,1,1,0,-46.7,133.3,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(2).to({x:12.7},0).wait(2));

	// Mouse_mustache_upper
	this.instance_2 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(50.8,43.7,1,1,75.7,0,0,-6.8,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(2).to({x:54.8},0).wait(2));

	// Mouse_mustache_upper
	this.instance_3 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(50.8,39.1,1,1,70,0,0,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(2).to({x:54.8},0).wait(2));

	// Mouse_nose
	this.instance_4 = new lib.Mouse_nose_fear("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(28,42.1,1,1,0,0,0,0,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(2).to({x:32},0).wait(2));

	// Mouse_eye
	this.instance_5 = new lib.Mouse_eye_fear("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(42,33.7,0.444,0.439,0,0,180);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(2).to({regX:-0.1,x:46.1},0).wait(2));

	// Mouse_eye
	this.instance_6 = new lib.Mouse_eye_fear("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(13.9,33.7,0.437,0.439,0,0,0,-0.1,0);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(2).to({regX:0.1,scaleX:0.44,x:18},0).wait(2));

	// Mouse_face
	this.instance_7 = new lib.Mouse_face("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(28,31.6);
	this.instance_7.filters = [new cjs.ColorFilter(0, 0, 0, 1, 80, 80, 255, 0)];
	this.instance_7.cache(-32,-30,64,61);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(2).to({x:32},0).wait(2));

	// Mouse_Ear
	this.instance_8 = new lib.Mouse_Ear("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(48,6.4);
	this.instance_8.filters = [new cjs.ColorFilter(0, 0, 0, 1, 80, 80, 255, 0)];
	this.instance_8.cache(-15,-14,29,29);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(2).to({x:52},0).wait(2));

	// Mouse_Ear
	this.instance_9 = new lib.Mouse_Ear("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(8,6.4);
	this.instance_9.filters = [new cjs.ColorFilter(0, 0, 0, 1, 80, 80, 255, 0)];
	this.instance_9.cache(-15,-14,29,29);

	this.timeline.addTween(cjs.Tween.get(this.instance_9).wait(2).to({x:12},0).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.6,-6.1,65.2,66.1);


(lib.Mouse_defeated = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Mouse_mustache_upper
	this.instance = new lib.Mouse_mustache_upper("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(8.6,43.7,1,1,0,-62.4,117.6,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:-7.2,regY:-0.7,scaleX:1,scaleY:1,skewX:-145.4,skewY:34.6,x:-4.7,y:93.9,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_mustache_upper
	this.instance_1 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(8.7,39.2,1,1,0,-46.7,133.3,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regY:0.7,scaleX:1,scaleY:1,x:-19,y:35.2,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_mustache_upper
	this.instance_2 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(50.8,43.7,1,1,75.7,0,0,-6.8,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({rotation:2.7,x:82.8,y:69.7,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_mustache_upper
	this.instance_3 = new lib.Mouse_mustache_upper("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(50.8,39.1,1,1,70,0,0,-6.9,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({rotation:-34.5,x:29.3,y:-18.6,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_nose
	this.instance_4 = new lib.Mouse_nose_fear("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(28,42.1,1,1,0,0,0,0,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({regY:1,scaleX:0.11,scaleY:1.11,x:28.6,y:88.4,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_eye
	this.instance_5 = new lib.Mouse_eye_fear("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(42,33.8,1,1,0,0,180);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({scaleX:0.15,scaleY:0.19,x:51.2,y:-25.8,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_eye
	this.instance_6 = new lib.Mouse_eye_fear("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(14,33.8);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({scaleX:0.29,scaleY:0.29,x:-0.4,y:-34.2,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_face
	this.instance_7 = new lib.Mouse_face("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(28,31.6);
	this.instance_7.filters = [new cjs.ColorFilter(0, 0, 0, 1, 80, 80, 255, 0)];
	this.instance_7.cache(-32,-30,64,61);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).to({scaleX:1.47,scaleY:1.47,x:32,y:57.4,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_Ear
	this.instance_8 = new lib.Mouse_Ear("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(48,6.4);
	this.instance_8.filters = [new cjs.ColorFilter(0, 0, 0, 1, 80, 80, 255, 0)];
	this.instance_8.cache(-15,-14,29,29);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).to({regY:-0.1,scaleX:2.37,scaleY:2.37,x:75.2,y:-2.4,alpha:0},15,cjs.Ease.quadOut).wait(1));

	// Mouse_Ear
	this.instance_9 = new lib.Mouse_Ear("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(8,6.4);
	this.instance_9.filters = [new cjs.ColorFilter(0, 0, 0, 1, 80, 80, 255, 0)];
	this.instance_9.cache(-15,-14,29,29);

	this.timeline.addTween(cjs.Tween.get(this.instance_9).to({regX:-0.1,scaleX:2.06,scaleY:2.06,x:-11.8,y:-16.6,alpha:0},15,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.6,-6.1,65.2,66.1);


(lib.Hedgehog_nose_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_nose("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleX:1.19,scaleY:1.19},9).to({scaleX:1,scaleY:1},10,cjs.Ease.quadOut).wait(21));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-3,-2.3,6,4.8);


(lib.Hedgehog_mouse_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_mouth("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleY:1.29,y:1.3},9).to({scaleY:1,y:0},10).wait(21));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-10.5,-5.5,21.1,11);


(lib.Hedgehog_mouse_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_mouth_base_fear("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(-0.2,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({x:0.2},0).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-10,-5.6,19.1,7);


(lib.Hedgehog_hand = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_nail("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(7.6,-3.3,1,1,59.2,0,0,0,-0.1);

	this.instance_1 = new lib.Hedgehog_nail("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(1.5,-2.3,1,1,28,0,0,-0.1,-0.1);

	this.instance_2 = new lib.Hedgehog_nail("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(-4.2,0.7);

	this.shape = new cjs.Shape();
	this.shape.graphics.f("#B1305B").s().p("AglAhQgUgFgDgMQgDgNAOgNQAQgOAZgHQAYgGAVAFQAVACADANQADANgQAOQgPAOgZAHQgNAEgNAAQgKAAgJgCg");
	this.shape.setTransform(3.4,4.3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape},{t:this.instance_2},{t:this.instance_1},{t:this.instance}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-7.2,-7,16.8,14.9);


(lib.Hedgehog_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_Face_fear("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(-0.6,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({x:0.9},0).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-35,-38.5,68.8,77);


(lib.Hedgehog_face_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_Face("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(19).to({startPosition:0},0).to({scaleY:1.21},12).to({scaleY:1.17},6).to({scaleY:1},24).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-34.4,-38.5,68.8,77);


(lib.Hedgehog_eye_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_eye("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:-1.4},9).to({x:0},10).wait(14).to({scaleY:0.04},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.04},0).wait(2).to({scaleY:1},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.7,-4.6,9.5,9.3);


(lib.Hedgehog_eye_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_eye_base_fear("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({x:0.4},0).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-7.3,-5.7,12.5,10.4);


(lib.Frog_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Ring("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30.1,52.3,0.563,0.563,0,0,0,54,19.1);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(23).to({_off:false},0).wait(1).to({regX:53.9,regY:19.4,scaleX:1.04,scaleY:1.04,x:30,y:52.6},0).to({regX:53.7,regY:19.1,scaleX:2.84,scaleY:2.84,x:29.5,y:51.9,alpha:0},6,cjs.Ease.quadOut).to({_off:true},1).wait(98));

	// レイヤー_1
	this.instance_1 = new lib.Frog_base("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regY:30.1,scaleY:0.71,y:38.9},23).to({scaleY:1.01,y:27.4},1).to({regY:30,scaleY:1.2,y:-7},6,cjs.Ease.quadOut).to({regY:30.1,scaleY:0.78,y:36.6},9).to({regY:30,scaleY:1,y:30},4).to({regY:30.1,scaleY:0.92,y:32.6},16).to({regY:30,scaleY:1,y:30},26).wait(1).to({startPosition:0},0).to({regY:30.1,scaleY:0.92,y:32.6},16).to({regY:30,scaleY:1,y:30},26).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,60,60);


(lib.Frog_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.FrogFace_fear("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleY:0.99,x:32.5,y:30.4},1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,60,60);


(lib.Frog_defeated = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_4
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#003701").s().p("AgPAyQgUgFgKgTIgDgFQgBhOBFAHQAOAHAIAOQAKATgFAVQgGAVgSAMQgNAHgMAAQgGAAgHgBg");
	this.shape.setTransform(51.5,6.3);

	this.instance = new lib.FrogEye_defeated("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(56.1,1.1,1,1,0,0,0,5.2,5.2);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape}]}).to({state:[{t:this.instance}]},1).to({state:[{t:this.instance}]},10).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1).to({_off:false},0).to({regX:5.3,regY:5,scaleX:2.94,scaleY:2.94,x:86.4,y:-15.4,alpha:0},10,cjs.Ease.quadOut).wait(1));

	// レイヤー_3
	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#003701").s().p("AgEAzQgVgDgOgRQgOgRACgVQACgRALgMQAxgrApBPIgBAGQgCAWgQANQgNALgRAAIgHgBg");
	this.shape_1.setTransform(7.5,7.3);

	this.instance_1 = new lib.FrogEye_defeated("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(-4.4,-1.6,1,1,0,0,0,5.2,5.2);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1}]}).to({state:[{t:this.instance_1}]},1).to({state:[{t:this.instance_1}]},10).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(1).to({_off:false},0).to({regX:5.1,regY:5,scaleX:2.83,scaleY:2.83,x:-14.1,y:-17.6,alpha:0},10,cjs.Ease.quadOut).wait(1));

	// レイヤー_6
	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#CFFF81").s().p("AAGD6IgDAAIgDAAQhxAAhThXIgHgIQgOgPgLgPIgohGQgWgzgGg5QAnhZBPg1QBRg2BhAAQBiAABRA2QBPA1AnBZQgFAqgMAmIggBHIgfAqIgMAPIgHAIIgKAKQhNBKhmADIgDAAg");
	this.shape_2.setTransform(30.7,43.1);

	this.instance_2 = new lib.FrogFace_defeated_lower("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30.9,56.8,1,1,0,0,0,29.7,31.9);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_2}]}).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},10).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(1).to({_off:false},0).to({regY:31.8,scaleY:2.09,x:30.1,y:94.5,alpha:0},10,cjs.Ease.quadOut).wait(1));

	// レイヤー_5
	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#33CCFF").s().p("AEpC6QgnhahPg2QhSg2hhgBQhhABhRA2QhQA2gmBaQgDgZAAgZQAAhZAghIQgggqAAg4QAAg8AjgqQAjgqAyAAQAyAAAjAqIALAOQAogMArAAQAvAAApAOIAHgJQAjgqAyAAQAyAAAjAqQAjAqAAA9QgBA3gcAnQAdBGAABXQAABHgUA9QAMgnAFgrgACgi/QgPAUAAAZQAAAcAPASQAQAUAXgBQAVABARgUQALgOAEgTIhXg+IgFAEgAj6iHQACAUAMAPQAQAUAXgBQAVABAQgUQAQgSAAgcQAAgZgQgUIgFgFg");
	this.shape_3.setTransform(30.3,17.6);

	this.instance_3 = new lib.FrogFace_defeated("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(30.3,12.3,1,1,0,0,0,30,34.7);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_3}]}).to({state:[{t:this.instance_3}]},1).to({state:[{t:this.instance_3}]},10).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(1).to({_off:false},0).to({regY:34.6,scaleY:1.92,y:12.1,alpha:0},10,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0.3,-9.2,60.2,77.3);


(lib.Cancer_foot_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Cancer_foot("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(6,-0.1,1,1,15,0,0,-0.2,-1.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:-0.1,regY:-1.6,rotation:22.5,y:0},15,cjs.Ease.quadInOut).to({regX:-0.2,regY:-1.7,rotation:15,y:-0.1},16,cjs.Ease.quadInOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-8.5,-5.6,16.8,9.3);


(lib.Cancer_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Cancer_eye
	this.instance = new lib.Cancer_eye_fear("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(40.1,20.6,1,1,0,2.7,-177.3,2.5,-1.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regY:-2,scaleX:2.12,scaleY:4.66,skewX:122.2,skewY:-57.8,x:79.8,y:9.9,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_eye
	this.instance_1 = new lib.Cancer_eye_fear("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(15,20.5,1,1,-5.2,0,0,2.5,-1.8);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regY:-1.7,scaleX:2.65,scaleY:5.14,rotation:-62.2,x:-21.6,y:-23,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_cissor_minor
	this.instance_2 = new lib.Cancer_cissor_minor_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(46.1,29.5,1,1,0,0,180,-1.4,2.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({skewX:45.2,skewY:225.2,x:51.6,y:-4.7,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_cissor
	this.instance_3 = new lib.Cancer_cissor_fear("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(49.9,26.6,1.225,1.225,0,-15,165,0.3,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({regX:0.4,skewX:-95.5,skewY:84.5,x:80.4,y:58.3,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_cissor_minor
	this.instance_4 = new lib.Cancer_cissor_minor_fear("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(9.3,29.5,1,1,0,0,0,-1.4,2.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({x:-5.4,y:14.5,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_cissor
	this.instance_5 = new lib.Cancer_cissor_fear("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(5.5,26.6,1.225,1.225,15,0,0,0.3,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0.2,scaleX:2.3,scaleY:2.3,rotation:105,x:-17.9,y:-16.4,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_body
	this.instance_6 = new lib.Cancer_body_fear("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(27.5,37);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({scaleX:1.57,scaleY:1.57,x:29,y:27.8,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_foot
	this.instance_7 = new lib.Cancer_foot_fear("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(41.1,44.7,1,1,0,3,-177,6.3,0.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).to({skewX:-35.2,skewY:-215.2,x:91.2,y:34.9,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_foot
	this.instance_8 = new lib.Cancer_foot_fear("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(38.6,47.4,1,1,0,19.4,-160.6,7,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).to({skewX:48.2,skewY:-131.8,x:47.2,y:66.2,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_foot
	this.instance_9 = new lib.Cancer_foot_fear("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(41.9,38.2,1,1,0,-6.5,173.5,6.5,-0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_9).to({regX:6.4,skewX:-46,skewY:134,x:57.6,y:-13.3,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_foot
	this.instance_10 = new lib.Cancer_foot_fear("synched",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(14.7,45.9,1,1,-8.9,0,0,6.3,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_10).to({rotation:-27.9,x:-15.8,y:35.9,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_foot
	this.instance_11 = new lib.Cancer_foot_fear("synched",0);
	this.instance_11.parent = this;
	this.instance_11.setTransform(20.4,51.8,1,1,-11.5,0,0,7.2,0.3);

	this.timeline.addTween(cjs.Tween.get(this.instance_11).to({rotation:-81.7,x:5.4,y:55.7,alpha:0},12,cjs.Ease.quadOut).wait(1));

	// Cancer_foot
	this.instance_12 = new lib.Cancer_foot_fear("synched",0);
	this.instance_12.parent = this;
	this.instance_12.setTransform(6.7,39.9);

	this.timeline.addTween(cjs.Tween.get(this.instance_12).to({rotation:45,x:-20.5,y:0.9,alpha:0},12,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-18.9,2.5,93.3,58);


(lib.Cancer_body_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Cancer_body_base("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(1.5,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:-1.5},15,cjs.Ease.quadInOut).to({x:1.5},16,cjs.Ease.quadInOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-19.5,-21,42,42);


(lib.Cancer_base = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Cancer_eye("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(12.3,-10.3,1,1,0,0,180,2.5,-1.8);

	this.instance_1 = new lib.Cancer_eye("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(-12.7,-10.3,1,1,0,0,0,2.5,-1.8);

	this.instance_2 = new lib.Cancer_cissor_minor("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(18.4,-1.3,1,1,0,0,180,-1.4,2.2);

	this.instance_3 = new lib.Cancer_cissor("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(22.2,-4.2,1.225,1.225,0,-15,165,0.3,0.1);

	this.instance_4 = new lib.Cancer_cissor_minor("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(-18.4,-1.3,1,1,0,0,0,-1.4,2.2);

	this.instance_5 = new lib.Cancer_cissor("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(-22.2,-4.2,1.225,1.225,15,0,0,0.3,0.1);

	this.instance_6 = new lib.Cancer_body_base("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(-0.2,6.2);

	this.instance_7 = new lib.Cancer_foot("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(18.6,17.3,1,1,0,0,180,0.1,0);

	this.instance_8 = new lib.Cancer_foot("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(12.9,22.4,1,1,0,0,180,0.1,-0.8);

	this.instance_9 = new lib.Cancer_foot("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(18,8.9,1,1,0,-15,165,-0.2,-1.7);

	this.instance_10 = new lib.Cancer_foot("synched",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(-18.5,17.3,1,1,0,0,0,0.1,0);

	this.instance_11 = new lib.Cancer_foot("synched",0);
	this.instance_11.parent = this;
	this.instance_11.setTransform(-12.9,22.4,1,1,0,0,0,0.1,-0.8);

	this.instance_12 = new lib.Cancer_foot("synched",0);
	this.instance_12.parent = this;
	this.instance_12.setTransform(-18,8.9,1,1,15,0,0,-0.2,-1.7);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_12},{t:this.instance_11},{t:this.instance_10},{t:this.instance_9},{t:this.instance_8},{t:this.instance_7},{t:this.instance_6},{t:this.instance_5},{t:this.instance_4},{t:this.instance_3},{t:this.instance_2},{t:this.instance_1},{t:this.instance}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-46.6,-27.1,93.3,55.6);


(lib.Bear_fear = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bear_mouse
	this.instance = new lib.Bear_mouse("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(28,43,1,1,21.5);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({rotation:-40.2,x:32},0).wait(2));

	// Bear_ear
	this.instance_1 = new lib.Bear_ear_fear("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(50.3,8.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(2).to({x:54.3},0).wait(2));

	// Bear_ear
	this.instance_2 = new lib.Bear_ear_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(5.3,6.6);

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
p.nominalBounds = new cjs.Rectangle(-4.5,-2.9,64.7,60);


(lib.Bear_defeated = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bear_mouse
	this.instance = new lib.Bear_mouse("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30,43);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regY:0.2,scaleX:7.39,scaleY:3.65,rotation:-90,x:29.3,y:72.1,alpha:0},23,cjs.Ease.quadOut).wait(1));

	// Bear_ear
	this.instance_1 = new lib.Bear_ear_fear("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(52.3,8.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regX:0.1,regY:0.1,scaleX:2.16,scaleY:2.16,x:81.3,y:1.1,alpha:0},23,cjs.Ease.quadOut).wait(1));

	// Bear_ear
	this.instance_2 = new lib.Bear_ear_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(7.3,6.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({regY:-0.1,scaleX:2.14,scaleY:2.14,x:-10.5,y:-10.6,alpha:0},23,cjs.Ease.quadOut).wait(1));

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

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0.1,regY:0.1,scaleX:2.63,scaleY:2.63,x:30.3,y:30.3,alpha:0},23,cjs.Ease.quadOut).wait(1));

	// Bear_face
	this.instance_6 = new lib.Bear_face_fear("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({scaleX:1.92,scaleY:1.28,alpha:0},23,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-2.5,-2.9,64.7,60);


(lib.Bear_nose_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bear_nose("synched",0);
	this.instance.parent = this;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:1.8},13,cjs.Ease.quadOut).wait(1).to({x:1.5},0).wait(1).to({x:1.2},0).wait(1).to({x:0.9},0).wait(1).to({x:0.7},0).wait(1).to({x:0.5},0).wait(1).to({x:0.3},0).wait(1).to({x:0.2},0).wait(1).to({x:0.1},0).wait(1).to({x:0},0).wait(1).to({startPosition:0},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-6,-6,12,12);


(lib.Bear_face_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bear_face("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(-1.4,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:2.1},15,cjs.Ease.quadInOut).wait(1).to({x:2},0).wait(1).to({x:1.7},0).wait(1).to({x:1.3},0).wait(1).to({x:0.7},0).wait(1).to({x:0},0).wait(1).to({x:-0.6},0).wait(1).to({x:-1.1},0).wait(1).to({x:-1.3},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-31.4,-27,60,54);


(lib.TitleAnim_scurve_no_guide = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.body = new lib.Body();
	this.body.name = "body";
	this.body.parent = this;
	this.body.setTransform(126.7,41.9);

	this.timeline.addTween(cjs.Tween.get(this.body).wait(1).to({x:113.4,y:17.9},0).wait(1).to({x:90.1,y:4},0).wait(1).to({x:64.1,y:0.1},0).wait(1).to({x:39.1,y:4.9},0).wait(1).to({x:18,y:17.7},0).wait(1).to({x:4.9,y:37.5},0).wait(1).to({x:2.8,y:60.6},0).wait(1).to({x:9.9,y:81.6},0).wait(1).to({x:25.7,y:96.6},0).wait(1).to({x:44.4,y:106.2},0).wait(1).to({x:63.4,y:113.2},0).wait(1).to({x:81.4,y:119.9},0).wait(1).to({x:98,y:126.9},0).wait(1).to({x:113.2,y:134.8},0).wait(1).to({x:125.1,y:146.3},0).wait(1).to({x:132.4,y:160.6},0).wait(1).to({x:134.3,y:175.8},0).wait(1).to({x:131.5,y:190.1},0).wait(1).to({x:124.8,y:202.1},0).wait(1).to({x:115.6,y:211.4},0).wait(1).to({x:105.2,y:218},0).wait(1).to({x:94.6,y:222.4},0).wait(1).to({x:84.2,y:225.1},0).wait(1).to({x:74.4,y:226.4},0).wait(1).to({x:65.3,y:226.7},0).wait(1).to({x:57,y:226.2},0).wait(1).to({x:49.6,y:225.1},0).wait(1).to({x:43,y:223.6},0).wait(1).to({x:37.4,y:221.9},0).wait(1).to({x:32.5,y:220.1},0).wait(1).to({x:28.6,y:218.4},0).wait(1).to({x:25.4,y:216.9},0).wait(1).to({x:22.9,y:215.6},0).wait(1).to({x:21.2,y:214.6},0).wait(1).to({x:20.2,y:214},0).wait(1).to({x:19.9,y:213.8},0).wait(1).to({x:19,y:213.3},0).wait(1).to({x:32.8,y:220.2},0).wait(1).to({x:47.6,y:224.7},0).wait(1).to({x:63,y:226.6},0).wait(1).to({x:78.3,y:226},0).wait(1).to({x:93.4,y:222.8},0).wait(1).to({x:107.5,y:216.8},0).wait(1).to({x:119.8,y:207.6},0).wait(1).to({x:129.1,y:195.4},0).wait(1).to({x:133.9,y:180.7},0).wait(1).to({x:133.6,y:165.3},0).wait(1).to({x:128.1,y:150.8},0).wait(1).to({x:118.3,y:138.8},0).wait(1).to({x:104.8,y:130.1},0).wait(1).to({x:90.1,y:123.4},0).wait(1).to({x:75.5,y:117.7},0).wait(1).to({x:60.9,y:112.3},0).wait(1).to({x:46.4,y:107.1},0).wait(1).to({x:32.5,y:100.6},0).wait(1).to({x:19.7,y:92.3},0).wait(1).to({x:9.4,y:80.9},0).wait(1).to({x:3.8,y:66.5},0).wait(1).to({x:2.5,y:51.1},0).wait(1).to({x:5.5,y:36},0).wait(1).to({x:13.3,y:22.7},0).wait(1).to({x:24.7,y:12.3},0).wait(1).to({x:38.5,y:5.1},0).wait(1).to({x:53.5,y:1.1},0).wait(1).to({x:68.9,y:0.1},0).wait(1).to({x:84.2,y:2.2},0).wait(1).to({x:98.7,y:7.6},0).wait(1).to({x:111.5,y:16.2},0).wait(1).to({x:121.6,y:27.8},0).wait(1).to({x:126.7,y:41.9},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(108.7,23.9,36,36);


(lib.TitleAnim_scurve_head_no_guide = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.body = new lib.Head();
	this.body.name = "body";
	this.body.parent = this;
	this.body.setTransform(126.7,41.9);

	this.timeline.addTween(cjs.Tween.get(this.body).wait(1).to({scaleX:1,scaleY:1,rotation:-54.2,x:113.4,y:17.8},0).wait(1).to({scaleX:1,scaleY:1,rotation:-81.2,x:90.1,y:3.9},0).wait(1).to({scaleX:1,scaleY:1,rotation:-105.6,x:64.1,y:0},0).wait(1).to({scaleX:1,scaleY:1,rotation:-127.1,x:39,y:4.9},0).wait(1).to({scaleX:1,scaleY:1,rotation:-152.2,x:18,y:17.6},0).wait(1).to({scaleX:1,scaleY:1,rotation:-183,x:4.9,y:37.5},0).wait(1).to({scaleX:1,scaleY:1,rotation:-210.6,x:2.8,y:60.6},0).wait(1).to({rotation:-240.7,x:9.9,y:81.6},0).wait(1).to({scaleX:1,scaleY:1,rotation:-266.4,x:25.6,y:96.6},0).wait(1).to({scaleX:1,scaleY:1,rotation:-279,x:44.4,y:106.2},0).wait(1).to({rotation:-284.1,x:63.3,y:113.2},0).wait(1).to({rotation:-284.8,x:81.4,y:119.9},0).wait(1).to({rotation:-283.8,x:98,y:126.8},0).wait(1).to({scaleX:1,scaleY:1,rotation:-277.3,x:113.2,y:134.7},0).wait(1).to({scaleX:1,scaleY:1,rotation:-259,x:125,y:146.3},0).wait(1).to({rotation:-241.2,x:132.3,y:160.6},0).wait(1).to({scaleX:1,scaleY:1,rotation:-223.3,x:134.3,y:175.8},0).wait(1).to({scaleX:1,scaleY:1,rotation:-206.8,x:131.5,y:190.1},0).wait(1).to({rotation:-191.3,x:124.7,y:202},0).wait(1).to({scaleX:1,scaleY:1,rotation:-179,x:115.6,y:211.3},0).wait(1).to({scaleX:1,scaleY:1,rotation:-169,x:105.2,y:218},0).wait(1).to({rotation:-161.2,x:94.6,y:222.4},0).wait(1).to({rotation:-154.7,x:84.2,y:225},0).wait(1).to({rotation:-149.7,x:74.4,y:226.3},0).wait(1).to({scaleX:1,scaleY:1,rotation:-145.2,x:65.3,y:226.6},0).wait(1).to({rotation:-141.2,x:57,y:226.1},0).wait(1).to({rotation:-137.4,x:49.6,y:225},0).wait(1).to({rotation:-133.9,x:43,y:223.5},0).wait(1).to({rotation:-130.9,x:37.3,y:221.9},0).wait(1).to({rotation:-128.3,x:32.5,y:220.1},0).wait(1).to({rotation:-125.9,x:28.5,y:218.4},0).wait(1).to({rotation:-123.8,x:25.3,y:216.9},0).wait(1).to({scaleX:1,scaleY:1,rotation:-122.1,x:22.9,y:215.6},0).wait(1).to({rotation:-121.1,x:21.2,y:214.6},0).wait(1).to({rotation:-120.1,x:20.2,y:214},0).wait(1).to({scaleX:1,scaleY:1,rotation:-120,x:19.8,y:213.8},0).wait(1).to({rotation:0,x:19,y:213.3},0).wait(1).to({scaleX:1,scaleY:1,rotation:-11.6,x:33.3,y:220.4},0).wait(1).to({rotation:-22.1,x:48.6,y:224.9},0).wait(1).to({rotation:-32.3,x:64.4,y:226.6},0).wait(1).to({scaleX:1,scaleY:1,rotation:-42.4,x:80.3,y:225.7},0).wait(1).to({rotation:-54.1,x:95.7,y:222.1},0).wait(1).to({scaleX:1,scaleY:1,rotation:-67.7,x:110,y:215.3},0).wait(1).to({scaleX:1,scaleY:1,rotation:-84.2,x:122.2,y:205.2},0).wait(1).to({scaleX:1,scaleY:1,rotation:-103.5,x:130.8,y:191.8},0).wait(1).to({scaleX:1,scaleY:1,rotation:-124.1,x:134.3,y:176.3},0).wait(1).to({rotation:-144.9,x:132.4,y:160.6},0).wait(1).to({scaleX:1,scaleY:1,rotation:-165,x:125.1,y:146.3},0).wait(1).to({scaleX:1,scaleY:1,rotation:-185.3,x:113.5,y:135},0).wait(1).to({scaleX:1,scaleY:1,rotation:-194.8,x:98.8,y:127.2},0).wait(1).to({rotation:-198.1,x:83.7,y:120.8},0).wait(1).to({rotation:-200.1,x:68.7,y:115.1},0).wait(1).to({rotation:-201.6,x:53.6,y:109.7},0).wait(1).to({rotation:-196.5,x:38.8,y:103.8},0).wait(1).to({scaleX:1,scaleY:1,rotation:-188.3,x:25,y:96.1},0).wait(1).to({rotation:-173.2,x:13.1,y:85.9},0).wait(1).to({scaleX:1,scaleY:1,rotation:-151.9,x:5.3,y:72.1},0).wait(1).to({scaleX:1,scaleY:1,rotation:-136.1,x:2.5,y:56.2},0).wait(1).to({scaleX:1,scaleY:1,rotation:-119.3,x:4,y:40.5},0).wait(1).to({rotation:-99.8,x:10.7,y:26.1},0).wait(1).to({scaleX:1,scaleY:1,rotation:-83.4,x:21.6,y:14.6},0).wait(1).to({scaleX:1,scaleY:1,rotation:-69.9,x:35.4,y:6.4},0).wait(1).to({scaleX:1,scaleY:1,rotation:-57.4,x:50.6,y:1.6},0).wait(1).to({rotation:-47.4,x:66.6,y:0},0).wait(1).to({rotation:-34.6,x:82.4,y:1.8},0).wait(1).to({scaleX:1,scaleY:1,rotation:-22,x:97.4,y:7},0).wait(1).to({scaleX:1,scaleY:1,rotation:-8.3,x:110.8,y:15.6},0).wait(1).to({rotation:8.3,x:121.3,y:27.4},0).wait(1).to({rotation:45,x:126.7,y:41.9},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(108.7,23.9,36,36);


(lib.TitleAnim_s_no_guide = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// TitleAnim_scurve
	this.instance = new lib.TitleAnim_scurve_head_no_guide("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(-41.4,90,1,1,0,0,0,67.2,113.9);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(71));

	// TitleAnim_scurve
	this.instance_1 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(-41.4,90,1,1,0,0,0,67.2,113.9);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(36).to({_off:false},0).wait(35));

	// TitleAnim_scurve
	this.instance_2 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_2.parent = this;
	this.instance_2.setTransform(-41.4,90,1,1,0,0,0,67.2,113.9);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(33).to({_off:false},0).wait(38));

	// TitleAnim_scurve
	this.instance_3 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_3.parent = this;
	this.instance_3.setTransform(-41.4,90,1,1,0,0,0,67.2,113.9);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(30).to({_off:false},0).wait(41));

	// TitleAnim_scurve
	this.instance_4 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(-41.4,90,1,1,0,0,0,67.2,113.9);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(27).to({_off:false},0).wait(44));

	// TitleAnim_scurve
	this.instance_5 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_5.parent = this;
	this.instance_5.setTransform(-41.4,90,1,1,0,0,0,67.2,113.9);
	this.instance_5._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(24).to({_off:false},0).wait(47));

	// TitleAnim_scurve
	this.instance_6 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_6.parent = this;
	this.instance_6.setTransform(-41.4,90,1,1,0,0,0,67.2,113.9);
	this.instance_6._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(21).to({_off:false},0).wait(50));

	// TitleAnim_scurve
	this.instance_7 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_7.parent = this;
	this.instance_7.setTransform(-41.4,90,1,1,0,0,0,67.2,113.9);
	this.instance_7._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(18).to({_off:false},0).wait(53));

	// TitleAnim_scurve
	this.instance_8 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_8.parent = this;
	this.instance_8.setTransform(-41.4,90,1,1,0,0,0,67.2,113.9);
	this.instance_8._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(15).to({_off:false},0).wait(56));

	// TitleAnim_scurve
	this.instance_9 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_9.parent = this;
	this.instance_9.setTransform(-41.4,90,1,1,0,0,0,67.2,113.9);
	this.instance_9._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_9).wait(12).to({_off:false},0).wait(59));

	// TitleAnim_scurve
	this.instance_10 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_10.parent = this;
	this.instance_10.setTransform(-41.4,90,1,1,0,0,0,67.2,113.9);
	this.instance_10._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_10).wait(9).to({_off:false},0).wait(62));

	// TitleAnim_scurve
	this.instance_11 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_11.parent = this;
	this.instance_11.setTransform(-41.4,90,1,1,0,0,0,67.2,113.9);
	this.instance_11._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_11).wait(6).to({_off:false},0).wait(65));

	// TitleAnim_scurve
	this.instance_12 = new lib.TitleAnim_scurve_no_guide("synched",0,false);
	this.instance_12.parent = this;
	this.instance_12.setTransform(-41.4,90,1,1,0,0,0,67.2,113.9);
	this.instance_12._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_12).wait(3).to({_off:false},0).wait(68));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,36,36);


(lib.StartButton_anim = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Start("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(-0.1,0.2,0.175,0.175);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(3).to({_off:false},0).to({scaleX:1,scaleY:1,x:0.4,y:-0.3},5).wait(1));

	// レイヤー_4
	this.instance_1 = new lib.CircleFrame("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(0,0,0.059,0.059);

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
p.nominalBounds = new cjs.Rectangle(-100,-100,200,200);


(lib.StartButton = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Start("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0.4,-0.3);

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


(lib.AreaAnim_remove_2 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Stage_e
	this.instance = new lib.Stage_e("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(788.8,802.1);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(8).to({startPosition:0},0).to({y:1122.7},6).wait(3));

	// Stage_g
	this.instance_1 = new lib.Stage_g("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(628.1,799.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(7).to({startPosition:0},0).to({y:1119.7},6).wait(4));

	// Stage_a
	this.instance_2 = new lib.Stage_a("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(458.6,798.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(6).to({startPosition:0},0).to({y:1119},6).wait(5));

	// Stage_t
	this.instance_3 = new lib.Stage_t("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(306.4,800.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(5).to({startPosition:0},0).to({y:1121.1},6).wait(6));

	// TitleAnim_s_no_guide
	this.instance_4 = new lib.TitleAnim_s_no_guide("synched",70,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(133.7,733.6,1,1,0,0,0,-40.3,89.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(4).to({startPosition:70},0).to({y:1054.2,startPosition:31},6).wait(7));

	// 1
	this.instance_5 = new lib.Num_2("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(1165.6,541,0.97,0.97);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(3).to({startPosition:0},0).to({scaleX:1,scaleY:1,x:1530.2,y:542.3},6).wait(8));

	// レイヤー_1
	this.instance_6 = new lib.Bg_area("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({alpha:0},16).wait(1));

	// レイヤー_3
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#BAD5F7").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(17));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1425,900);


(lib.AreaAnim_remove = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Stage_e
	this.instance = new lib.Stage_e("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(788.8,802.1);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(8).to({startPosition:0},0).to({y:1122.7},6).wait(3));

	// Stage_g
	this.instance_1 = new lib.Stage_g("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(628.1,799.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(7).to({startPosition:0},0).to({y:1119.7},6).wait(4));

	// Stage_a
	this.instance_2 = new lib.Stage_a("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(458.6,798.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(6).to({startPosition:0},0).to({y:1119},6).wait(5));

	// Stage_t
	this.instance_3 = new lib.Stage_t("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(306.4,800.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(5).to({startPosition:0},0).to({y:1121.1},6).wait(6));

	// TitleAnim_s_no_guide
	this.instance_4 = new lib.TitleAnim_s_no_guide("synched",70,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(133.7,733.6,1,1,0,0,0,-40.3,89.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(4).to({startPosition:70},0).to({y:1054.2,startPosition:31},6).wait(7));

	// 1
	this.instance_5 = new lib.Num_1("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(1145.6,555,0.97,0.97);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(3).to({startPosition:0},0).to({scaleX:1,scaleY:1,x:1470.2,y:542.3},6).wait(8));

	// レイヤー_1
	this.instance_6 = new lib.Bg_area("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({alpha:0},16).wait(1));

	// レイヤー_3
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#BAD5F7").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(17));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1350.2,900);


(lib.AreaAnim_2 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Stage_e
	this.instance = new lib.Stage_e("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(788.8,1010.1);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(14).to({_off:false},0).to({y:802.1},7,cjs.Ease.quadOut).wait(51));

	// Stage_g
	this.instance_1 = new lib.Stage_g("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(628.1,1007.1);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(13).to({_off:false},0).to({y:799.1},7,cjs.Ease.quadOut).wait(52));

	// Stage_a
	this.instance_2 = new lib.Stage_a("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(458.6,1006.4);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(12).to({_off:false},0).to({y:798.4},7,cjs.Ease.quadOut).wait(53));

	// Stage_t
	this.instance_3 = new lib.Stage_t("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(306.4,1008.6);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(11).to({_off:false},0).to({y:800.6},7,cjs.Ease.quadOut).wait(54));

	// TitleAnim_s_no_guide
	this.instance_4 = new lib.TitleAnim_s_no_guide("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(133.7,733.6,1,1,0,0,0,-40.3,89.2);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1).to({_off:false},0).wait(71));

	// 1
	this.instance_5 = new lib.Num_2("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(596.9,435.5,1.187,1.187,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0,regY:0,scaleX:0.97,scaleY:0.97,x:1165.6,y:541},6,cjs.Ease.quadOut).wait(66));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(72));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


(lib.AreaAnim_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Stage_e
	this.instance = new lib.Stage_e("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(788.8,1010.1);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(14).to({_off:false},0).to({y:802.1},7,cjs.Ease.quadOut).wait(51));

	// Stage_g
	this.instance_1 = new lib.Stage_g("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(628.1,1007.1);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(13).to({_off:false},0).to({y:799.1},7,cjs.Ease.quadOut).wait(52));

	// Stage_a
	this.instance_2 = new lib.Stage_a("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(458.6,1006.4);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(12).to({_off:false},0).to({y:798.4},7,cjs.Ease.quadOut).wait(53));

	// Stage_t
	this.instance_3 = new lib.Stage_t("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(306.4,1008.6);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(11).to({_off:false},0).to({y:800.6},7,cjs.Ease.quadOut).wait(54));

	// TitleAnim_s_no_guide
	this.instance_4 = new lib.TitleAnim_s_no_guide("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(133.7,733.6,1,1,0,0,0,-40.3,89.2);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1).to({_off:false},0).wait(71));

	// 1
	this.instance_5 = new lib.Num_1("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(596.9,435.5,1.187,1.187,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0,regY:0,scaleX:0.97,scaleY:0.97,x:1145.6,y:555},6,cjs.Ease.quadOut).wait(66));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(72));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


(lib.GoButton_anim = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Go("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(-0.1,0.2,0.175,0.175);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(3).to({_off:false},0).to({scaleX:1,scaleY:1,x:0.4,y:-0.3},5).wait(1));

	// レイヤー_4
	this.instance_1 = new lib.CircleFrame("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(0,0,0.059,0.059);

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
p.nominalBounds = new cjs.Rectangle(-100,-100,200,200);


(lib.GoButton = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Go("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(0.4,-0.3);

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


(lib.exp_text_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.KeyBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(333.6,553.4,1,1,0,0,0,12,26.8);

	this.instance_1 = new lib.KeyBase("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(95.3,464.7,1,1,0,0,0,12,26.8);

	this.instance_2 = new lib.Heart_base("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(641.5,45.6,1,1,0,0,0,69.9,25.9);

	this.instance_3 = new lib.Apple_base("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(682,101,1,1,0,0,0,20,21.8);

	this.instance_4 = new lib.Wine_base("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(20.5,287.5,1,1,0,0,0,14,18.7);

	this.shape = new cjs.Shape();
	this.shape.graphics.f("#006600").s().p("AAVBuQgDgDAAgEIAAidIgSAAIgJAWIgJASIgIANQgEACgEAAQgEAAgDgCQgDgDAAgEIAAgEIAEgGQAMgTAIgVQAIgVAFgXQACgFACgCQACgCADAAQAFAAADADQADACAAAFIgBAGIgDAKIgCAMIBhAAQAEAAACACQADADAAAEQAAAEgDADQgCADgEAAIhBAAIAAAiIA6AAQAEAAACADQADACAAAFQAAAEgDACQgCADgEAAIg6AAIAAAiIA8AAQADAAADADQACADAAAEQAAAEgCADQgDACgDABIg8AAIAAAyQAAAEgDADQgDACgFAAQgEAAgDgCgAhJBuQgDgDAAgEIAAh7IgIAMIgIAKIgFAEIgFABQgEAAgDgDQgDgDAAgDIAAgEIAFgFQAJgMAJgPQAKgQAIgRQAIgRAFgPQACgEACgCQACgCAEAAQAEAAADADQAEACAAAEIgDAKIgGAQIgJASIAAChQAAAEgEADQgDACgEAAQgEAAgDgCg");
	this.shape.setTransform(323.5,78.7);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#006600").s().p("AAdBwQgDgCABgEIAAgxQgKAMgNALQgKALgNAIIgKAGIgGABQgFAAgDgDQgCgDAAgEIABgEIACgDIABgBIAGgDQAOgHANgLQANgKAMgMIguAAQgEgBgBgCQgCgCAAgEQAAgEACgCQABgCAEgBIA4AAIAAgJQgBgEADgCQADgCAEAAQAEAAADACQACACAAAEIAAAJIA8AAQADAAACADQACACAAAEQAAAEgCACQgCACgDABIgyAAIAPAOIATANIATAMIAFAEQACACAAADQAAAEgEADQgDADgDAAIgFgBIgHgEQgNgIgMgKQgMgLgLgNIAAAyQAAAEgCACQgDACgEAAQgEAAgDgCgAhrBuQgFgDgBgHQAAgEADgDQABgCAEAAIABAAIACAAIAGABIAGAAQAEAAABgBQACgCAAgEIAAg2IgPAEIgHABQgEAAgCgDQgCgDgBgFQABgDABgCQABgCADgBIABgBIAGgBIAGgCIAMgDIAAg6IgWAAQgDAAgCgDQgCgCgBgFQAAgEADgCQACgDADAAIAWAAIAAglQAAgEADgCQACgDAFAAQADAAADADQADACAAAEIAAAlIAVAAQADAAADADQABACABAEQgBAFgBACQgDADgDAAIgVAAIAAAzIAGgCIAFgBIAFgCIADgBQAEAAACADQACACABAEIgBAFQgCACgDABIgJAEIgNAGIAABGQABAKgGAEQgFAEgLAAQgPAAgHgCgAA4AMQgHAAgEgDQgDgEAAgGIAAgaQAAgOAOAAIAjAAQAPAAAAAOIAAAaQAAAGgEAEQgEADgHAAgAA7gXIAAASIABADIADABIAVAAIADgBIABgDIAAgSQAAgEgEAAIgVAAQgEAAAAAEgAgSAMQgIAAgDgDQgEgEAAgGIAAgaQAAgOAPAAIAhAAQAHAAAEADQADAEAAAHIAAAaQAAAGgDAEQgFADgGAAgAgPgaIgBADIAAASIABADIADABIAUAAQAEAAAAgEIAAgSQAAgEgEAAIgUAAIgDABgAAAg0QgGAAgEgEQgFgEAAgIIAAgUQAAgIAFgEQAEgEAGAAIBHAAQAIAAAEAEQAEAEAAAIIAAAUQAAAIgEAEQgEAEgIAAgAAEhYIgBAEIAAAMQAAABABAAQAAABAAAAQAAABAAAAQABABAAAAIAEABIA2AAIADgBIABgEIAAgMIgBgEIgDgBIg3AAIgEABg");
	this.shape_1.setTransform(299.7,78.6);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBQAMgBAIgBIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_2.setTransform(275.5,78.3);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#006600").s().p("AgJBqQgEgDAAgFQAAAAABgBQAAAAAAgBQAAAAAAgBQABgBAAAAIAGgFIAMgJIAQgOIAEgDIAEAAQAEAAADADQADADAAADQAAADgCAEIgMAKIgTAPQgHAEgDAAQgEAAgDgCgABlBrIgGgDIgKgJIgKgIIgIgHIgDgDIgBgFQAAgEACgDQADgCAEAAIAEAAIAEACIARAOIANAKIADAEIABAEQAAAEgDADQgDADgFAAIgCAAgAhuBiQgCgCgBgFIACgFQAAgBABAAQAAAAAAgBQABAAAAAAQABgBABAAIACgBIAHgBIAUgDIAYgGIAGgTIAGgYQABgFACgDQADgCAEAAQAFABADACQACACAAAFIgBAIIgEAPIgGAOIAEgBIAEgBIADgBIAGgBIACgBIADAAQADAAADACQADADAAAFQAAAEgDACQgCACgIACIgXAHIgbAHIgXAFIgPACQgEAAgDgEgAhXBFQgCgCgBgFIgDgNIgEgOIgBgDIAAgDQAAgEACgCQADgCAFgBQAEAAACADQACADADAIIADALIADAKIABAHQAAAEgDACQgDADgFAAQgDAAgDgCgAAUA7QgJAAgFgEQgEgFAAgIIAAhdQAAgIAEgFQAFgEAJAAIAQAAIADgLIACgKIgpAAQgDgBgCgCQgCgCAAgFQAAgDACgDQACgCADAAIBoAAQAEAAACACQACADAAADQAAAFgCACQgCACgEABIgrAAIgDAKIgDALIAeAAQAJAAAFAEQADAFAAAIIAABdQAAAIgDAFQgFAEgJAAgAAVAmQAAABAAAAQAAAAAAABQABAAAAAAQAAABAAAAQABAAAAABQAAAAABAAQAAAAABAAQAAABABAAIA1AAQABAAAAgBQABAAAAAAQABAAAAAAQAAgBABAAIABgDIAAgSIg/AAgAAVAFIA/AAIAAgUIg/AAgAAWgzQAAABAAAAQAAABgBAAQAAABAAAAQAAAAAAABIAAAQIA/AAIAAgQIgBgEQgBAAAAAAQAAAAgBgBQAAAAgBAAQAAAAgBAAIg1AAQgBAAAAAAQgBAAAAAAQgBABAAAAQAAAAgBAAgAhYALQgJAAgEgEQgEgFAAgHIAAgrQAAgJADgFQAFgDAJAAIA5AAQAJgBAEAFQAEAEAAAJIAAArQAAAHgEAFQgFAEgIAAgAhWgvIgBACIAAAkIABACIADABIAvAAQAAAAABAAQABAAAAAAQABgBAAAAQAAgBAAgBIAAgkQAAAAAAgBQAAgBgBAAQAAgBgBAAQgBAAAAAAIgvAAIgDABgAhphZQgEAAgCgCQgCgDAAgEQAAgFACgCQACgCAEAAIBXAAQACAAADACQACADAAAEQAAAEgCACQgDACgCABg");
	this.shape_3.setTransform(251.8,79.3);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_4.setTransform(227.5,78.9);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#006600").s().p("AgzBnIgSgBIgLgCQgIgDgDgFQgFgHAAgJIAAikQAAgEAEgDQADgDAFAAQAEAAAEADQADADAAAEIAABKIAngKIAlgNQATgHANgGIgMgSQgDgGgBgDQABgDACgDQACgCAEAAQABAAAAAAQABAAAAAAQABAAAAAAQABABAAAAIAEAFIAGAJIAIAMIAIAMIAFAIIACADIABADQAAAEgDABQgCADgEAAIgDAAIgCgDIgEgEIgiAMIgpAOIguALIAABBIABAFIABACQACACALAAIAeACIAcgBIAbgCIATgDIAGgCIAFgHIAGgFQACgBADAAQAFABAEADQADADAAAGQAAAGgHAGQgGAHgJADIgOADIgUACIgYACIgbAAIgYAAgABUgqQgCgBgDgFIgJgMIgQgYQgEgHAAgDQAAgDADgDQACgCADAAQABAAAAAAQABAAAAAAQABABAAAAQABAAAAAAQACABACAFIASAbIAKAMIACAEIABADQgBADgCADQgCACgEAAIgEgBg");
	this.shape_5.setTransform(204.8,78.3);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#006600").s().p("ABRBaQgGgEgFgFIgVgZIgXgfIgZgfIgVgeIgPgXIgCgCIgBAAIgBAAIgBACIgFAPIgJAWIgJAVIgIAOQgEAGgFAEQgFAEgFAAQgFAAgDgEQgEgDAAgGIABgFQACgDACgBIAEgDIAEgFIAIgPIAJgTIAJgUIAHgSQAFgJADgEQAFgFAEAAQAEAAADACQAEACADADIACADIADAGIAKAQIATAcIAaAiIAbAhIAWAaQAJAKAEACQADABABADQACACgBAEQAAAFgDADQgDAEgEAAQgFAAgGgEg");
	this.shape_6.setTransform(179.8,79.5);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#006600").s().p("AAeBcIgUgGIgSgHQgWgKgLgOQgLgNAAgQQAAgMAKgPQALgQATgSQASgSAagSIgnABIgsAAIgrABQgEAAgDgDQgDgDAAgFQAAgDACgCIAEgEIADgBIAFAAIAZAAIAlAAIAlgBIAkgBIAcgBIARgBIACAAQADABADADQADADAAADQAAAEgDADQgCAEgDAAIgGAAIgJABIgIAAQgUALgSAOQgSAOgOANQgNAOgIALQgIAMAAAIQgBAPARALQAQALAkAJIADABIADAAIABAAIADgBIACAAIACAAQAEAAADADQADADAAAFQAAAGgEADQgFAEgJAAIgPgDgAA/AfIgGgGIgLgPQgLgNgEgHQgFgGAAgCQAAgEADgCQACgDAEAAIAEABIAEAFIAGAJIAJAMIAJALIAGAHIACADIABACQgBAEgCACQgDADgDAAIgBAAIgDgBgABdAKIgGgGIgLgNIgQgVQgEgHAAgCQAAgDACgDQADgCADgBQABAAAAAAQABAAAAABQABAAAAAAQABAAAAABIAEAEIAIAMIAMAPIAKAMIACADIABADQAAADgDADQgCACgDAAIgBAAIgDgBg");
	this.shape_7.setTransform(195.8,37);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.f("#006600").s().p("AgZAMIgVAAIgWAAIgQAAIgJgBQgEAAgCgEQgCgDAAgEQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADADAAAFQAAADgCADQgDAEgEAAIgJABIgWAAIgdABIgfAAIgbAAg");
	this.shape_8.setTransform(171.8,35.7);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.f("#006600").s().p("AAfBpIgEgEIgBgBIgBgEIgDgLIgGgPIgIgVIgEgNIgvAPIgkAMIgCAAIgBAAQgEAAgEgDQgCgEAAgEIABgFQAAgBAAAAQAAgBAAAAQABgBAAAAQABAAAAAAIACgCIAFgBIAIgDIANgEIAPgEIAfgKIAOgEIgEgJIgDgHIgDgLIgEgHIgCgIIgkAKIgbAHIgMADQgEgBgDgDQgCgDAAgEQgBgEACgDIADgEIADAAIAEgBIALgCIARgFIATgEIATgFIgBgEIgCgGIgCgEIgGgQIgCgIIgDgHIgCgEIAAgBQAAgFAEgDQADgCAGAAQADgBACACQADACACAFIAHAUIAFANIAFAMIASgFIAXgHIAWgHIANgEIADgBIACgBQAEABADADQADADAAAFQAAADgBADQgCACgDABIgMAEIgUAGIgYAHIgXAGIAIAYIAHASIARgFIAdgIIASgFIAIgCIACAAQAEAAACADQADADABAFQAAACgCACIgDADIgBABIgFACIgQAEIgYAHIgaAIIAHATIADALIADAIIADAJIACAIIACAGIABADIAAADQAAAFgDADQgDADgFAAQgDAAgCgCg");
	this.shape_9.setTransform(147.8,36.3);

	this.instance_5 = new lib.wasd();
	this.instance_5.parent = this;
	this.instance_5.setTransform(8,9);

	this.shape_10 = new cjs.Shape();
	this.shape_10.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_10.setTransform(1021.4,102.9);

	this.shape_11 = new cjs.Shape();
	this.shape_11.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_11.setTransform(1005.3,102.9);

	this.shape_12 = new cjs.Shape();
	this.shape_12.graphics.f("#006600").s().p("AguBvQgDgDAAgEIACgFIAEgDIACgBIAGgBIAQgFIATgFIARgIIgPgLIgLgOIgTANQgIAFgEAAQgEAAgCgDQgDgDAAgEQAAgEACgCQACgCAGgDQAMgHALgJQALgKAIgKIgJAAQgJAAgEgFQgFgEAAgHIAAgoQABgIAEgFQAFgFAIAAIBWAAQAIAAAEAFQAFAFAAAIIAAAoQAAAHgFAEQgEAFgIAAIg3AAIgFAGIgFAHIA9AAQAIAAAFACQAEADAAAFIgBAGIgEAGQgIAIgIAHIgTAPIAZAJQANADAOADQAFABACACQADADAAADQAAAFgDADQgDADgEAAIgGgBIgKgBIgKgEQgNgDgKgFQgLgDgLgIQgRAJgQAHIgdAJIgHABIgEABQgEAAgDgDgAATA4QAHAGAJAFQANgIAJgHQAJgGAAgEIgBgBIgDAAIg6AAIAPAPgAgFgIIABAFIAEAAIBIAAIAEAAIACgFIAAgKIhTAAgAgDgtQAAAAgBABQAAAAAAAAQAAABAAAAQgBABAAABIAAAJIBTAAIAAgJIgCgEQAAAAAAgBQAAAAgBAAQAAAAgBAAQAAgBgBAAIhJAAQAAAAgBABQAAAAgBAAQAAAAAAAAQgBABAAAAgAhMBwQgDgDAAgEIAAhiIgIAJIgJAIIgEADIgEAAQgEAAgDgDQgDgCAAgFIABgEIAFgFIAQgOIARgUQAJgKAEgIQACgDACgBIAFgCQAFAAADACQACADAAAEQAAADgDAHIgNAQIAAB4QAAAEgCADQgDACgFAAQgEAAgDgCgAhsguQgDgDgBgEQAAgDACgCQABgCAEgDQAOgJAKgKQAKgKAJgKIADgDIAEgBQAEAAADADQADADAAAEQAAAEgGAHQgGAIgNALQgLALgIAHQgJAFgDABQgFgBgCgDgAgogxQgDgDAAgEIABgDIACgDIAFgHQAHgJAEgJQAGgKACgKQACgDACgBQACgCADAAQAFAAACACQADACAAAFIgBADIgCAIIBnAAQAEABACACQACADAAAEQAAADgCADQgCACgEAAIhvAAIgIAMIgHAKIgFAFIgFABQgEAAgDgCg");
	this.shape_12.setTransform(985.9,103);

	this.shape_13 = new cjs.Shape();
	this.shape_13.graphics.f("#006600").s().p("AhPBlQgKAAgGgEQgEgFAAgKIAAijQAAgUAUABICgAAQAJAAAFAEQAFAGAAAJIAACjQAAAKgFAFQgFAEgJAAgAhNhQQAAABAAAAQAAABgBAAQAAABAAAAQAAABAAABIAACYQAAAAAAABQAAABAAAAQABABAAAAQAAABAAAAQADABADAAICPAAQAEAAABgBQACgCAAgDIAAiXQAAgBAAAAQAAgBgBgBQAAAAAAgBQAAAAgBgBQgCgBgDAAIiQAAQgBAAgBAAQAAAAgBAAQAAABgBAAQAAAAgBAAgAgiA1QgKAAgEgEQgEgFAAgJIAAhGQAAgIAEgFQAEgFAKAAIBFAAQAIAAAFAFQAFAFAAAIIAABGQAAAJgFAFQgFAEgIAAgAgfghQAAABAAAAQAAABgBAAQAAABAAABQAAAAAAABIAAA4QAAABAAABQAAABAAAAQABABAAAAQAAABAAAAQABAAAAABQABAAAAAAQABAAABAAQAAAAABABIA0AAQABgBAAAAQABAAABAAQAAAAABAAQAAgBAAAAQABAAAAgBQAAAAABgBQAAAAAAgBQAAgBAAgBIAAg4QAAgBAAAAQAAgBAAgBQgBAAAAgBQAAAAgBgBQAAAAAAAAQgBAAAAgBQgBAAgBAAQAAAAgBAAIg0AAQgBAAAAAAQgBAAgBAAQAAABgBAAQAAAAgBAAg");
	this.shape_13.setTransform(962,103.2);

	this.shape_14 = new cjs.Shape();
	this.shape_14.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBQAMgBAIgBIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_14.setTransform(937.8,102.6);

	this.shape_15 = new cjs.Shape();
	this.shape_15.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEgBgCgDQgCgCAAgFQAAgFADgDQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAAEgCADQgDADgEAAIgJAAIgWABIgdAAIgfABIgbAAg");
	this.shape_15.setTransform(913.7,102.3);

	this.shape_16 = new cjs.Shape();
	this.shape_16.graphics.f("#006600").s().p("AgdBeQgDgDAAgGIABgEIACgDIACgBIAEgDQAXgMATgPQASgQAJgQQAHgLAEgNQAFgOADgQQADgQABgPIgcAAIgsACIgjABIgeAAIACAXIABARIAAAMQAAAGgDADQgDADgGAAQgEAAgCgCQgDgBgBgDIgBgCIAAgGIAAgSIgCgZIgBgYIgBgCIAAgBQABgEADgDQADgDAFAAQAEAAADACQACACABAEIAhAAIAlgBIAkAAIAjgCIAEgEQADgBAEAAQAFAAADAEQADADAAAHIgCASIgDAVIgEAWIgFAUQgGANgGAMQgHAMgIALQgJAKgMAKIgVAQIgSALQgJAFgEAAQgFAAgDgEg");
	this.shape_16.setTransform(889.9,103.6);

	this.shape_17 = new cjs.Shape();
	this.shape_17.graphics.f("#006600").s().p("AhlBlQgDgEAAgFIABgGIADgDQAIgIAIgKQAIgLAIgNQAHgNAFgPQADgKADgNIAEgfIACggIAAgFIgBgEIgBgEIgBgBIAAgCQAAgFADgDQADgEAFAAIAFACIAFAEQACADABAEQABAFAAAGQAAASgCASQgBATgDAQQgDAQgEAKQgFAOgHAOQgIAPgIANQgJANgIAHIgGAGIgGACQgFAAgEgDgABLBkQgEgDgHgJQgJgLgIgMQgIgMgHgOQgGgMgDgMIgHgdQgDgQgBgSQgCgRAAgOQAAgMAEgFQADgHAHAAQAEAAAEADQADADAAAFIgBADIgBADIgBAEIgBADIAAAHQAAAPACAQQACARAEAQQADAOAFAMIALAXIAQAWQAIAKAHAHIAEAEIABAGQAAAFgDAEQgEADgFAAIgBABQgDAAgDgDgAA8grQgHgEgEgHQgEgGAAgJQAAgIAEgHQAFgHAGgEQAHgEAIAAQAIAAAHAEQAHAEAEAHQAEAHAAAIQAAAJgEAGQgEAHgHAEQgHAEgIAAQgIAAgHgEgABAhQQgEAFAAAGQAAAGAEAFQAFAFAGAAQAHAAAEgFQAFgFAAgGQAAgGgFgFQgEgEgHgBQgGABgFAEg");
	this.shape_17.setTransform(865.8,103.3);

	this.shape_18 = new cjs.Shape();
	this.shape_18.graphics.f("#006600").s().p("AAiBdIgRgFIgRgHQgJgEgGgEQgRgJgJgMQgJgMAAgOQAAgMAKgPQALgQATgSQASgSAZgSIgmABIgsAAIgrABQgEAAgDgDQgDgDAAgFQAAgDACgCIAEgEIADgBIAFAAIAZAAIAlAAIAlgBIAkgBIAcgBIARgBIACAAQADABADADQADADAAADQAAAFgDADQgCADgEAAIgGAAIgJABIgHAAQgUAMgSANQgSAOgOANQgNAOgIALQgIAMAAAIQgBAPARALQAPALAlAJIADABIACAAIACAAIADgBIACAAIACAAQAEAAADADQADADAAAFQAAAGgFADQgEAEgJAAIgNgCg");
	this.shape_18.setTransform(841.7,103.6);

	this.shape_19 = new cjs.Shape();
	this.shape_19.graphics.f("#006600").s().p("AgxBjQgNgGgHgMIgEgKIgBgLIgBgVIABgbIABgeIABgdIABgXIABgEIAAgDIAAgHIgCgHIAAgBIAAgBQAAgFADgDQADgDAGAAQAGAAAEAFQAEAHAAAKIAAADIgBAEIAAAJIgDAiIgBAiIgBAfIABATIABAMIADAHQAEAHAHACQAIAEALAAQAOAAAKgFQALgEAJgIIAJgMIAJgPIAIgQQACgEACgCQADgCADAAQAFAAAEAFQADADABAFIgEAMIgJARQgFAJgGAIQgMAPgRAHQgSAJgWgBQgTAAgNgGg");
	this.shape_19.setTransform(819.1,103);

	this.shape_20 = new cjs.Shape();
	this.shape_20.graphics.f("#006600").s().p("Ag2BpQgDgDAAgFIAAgGIABgHIABg/IABhVIAAgVIAAgKIAAgEIABgBQABgEACgBQAEgCACAAIAGABIAEADIABAEIABAGIAAAFIAAAjIgBAKIAAANIAaAOIAbAOQAPAFAOAFQAFABACADQACADAAAFQAAAFgDAEQgDADgGAAIgDAAIgIgDQgTgIgQgKIghgRIAAAbIAAARIAAALIgBAKIAAAXIAAALIAAAGIgBACQgBAEgDABQgDACgEAAQgFAAgDgDg");
	this.shape_20.setTransform(796,102.9);

	this.shape_21 = new cjs.Shape();
	this.shape_21.graphics.f("#006600").s().p("AgfBQQgDgEAAgFIABgEIADgDIABgBIAEgCQARgLAMgMQANgNAJgPQAKgOAHgUQAIgUAGgbQABgEACgCQADgCAEAAQAEAAADADQADADAAAEIgCAHIgDANIgFAPIgEANQgGARgHANQgHANgIALQgJAMgMALQgMAMgKAIQgKAHgFAAQgFAAgDgDgAgzAGQgCgBgBgDIgEgIIgFgRIgGgRIgEgOIgCgIIgBgCQAAgEADgDQADgDAFAAIAFABIADADIAAACIACAFIADALIADAKIAFAOIAIAVIABADIABACQgBAEgDACQgCADgGAAIgFgBgAgCgHQgDgBgBgDIgEgJIgGgQIgFgQIgFgOIgBgHQAAgDADgDQADgDAEAAQABAAAAAAQABAAABAAQAAAAABABQAAAAABAAQAAABABAAQAAAAABABQAAAAABAAQAAABAAAAIABADIABAEIAEALIAEAPIAGAPIAEAKIABADIAAACQAAAEgDADQgCACgFAAIgEgBg");
	this.shape_21.setTransform(769.8,105.6);

	this.shape_22 = new cjs.Shape();
	this.shape_22.graphics.f("#006600").s().p("Ag5BmQgEgDAAgGIABgFQABgCADgCIABgBIAEgBQAPgJAJgHQAKgIAFgGQAFgIACgJQACgKAAgNIAAgqIgWABIgTAAIgHAAIgJAAQgFAJgHAKQgHAIgJAHIgGAEQAAAAgBABQAAAAgBAAQAAAAgBAAQgBAAAAAAQgGAAgCgDQgDgDAAgFIAAgEIAEgEQAJgHAGgIQAHgIADgIIAEgMIACgQIABgRIgBgLQAAgEADgDQADgCAFgBQAEAAADACQADACABAEIAAAMIgBASIgCARIAOAAIAJAAIAqAAIAogCIgIgPIgCgHQAAgEACgCQADgCADAAQABgBABAAQAAAAABABQAAAAABAAQAAAAABABIADAFIAJAPIAJARIAIALIABADIAAADQAAADgCACQgDACgDABQgDAAgDgDQgDgDgDgHIgMABIgMAAIgNABIgJAAIAAArQAAASgCAMQgDAMgGAJQgEAHgHAIQgJAHgLAIIgQAKQgGADgDABQgEgBgDgEgABhgqIgGgHIgKgSIgJgPIgFgJIgBgEQAAgDADgDQACgDAEAAIAEABIAEAGIAGAMIAKAQIAJAPIACADIAAACQAAAEgCACQgDADgDAAQgBAAAAAAQgBAAgBAAQAAgBgBAAQAAAAgBgBg");
	this.shape_22.setTransform(746.7,103);

	this.shape_23 = new cjs.Shape();
	this.shape_23.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBQAMgBAIgBIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_23.setTransform(721.8,102.6);

	this.shape_24 = new cjs.Shape();
	this.shape_24.graphics.f("#006600").s().p("AAeBcIgUgGIgSgHQgWgKgLgOQgLgNAAgQQAAgMAKgPQALgQATgSQASgSAagSIgnABIgsAAIgrABQgEAAgDgDQgDgDAAgFQAAgDACgCIAEgEIADgBIAFAAIAZAAIAlAAIAlgBIAkgBIAcgBIARgBIACAAQADABADADQADADAAADQAAAEgDADQgCAEgDAAIgGAAIgJABIgIAAQgUALgSAOQgSAOgOANQgNAOgIALQgIAMAAAIQgBAPARALQAQALAkAJIADABIADAAIABAAIADgBIACAAIACAAQAEAAADADQADADAAAFQAAAGgEADQgFAEgJAAIgPgDgAA/AfIgGgGIgLgPQgLgNgEgHQgFgGAAgCQAAgEADgCQACgDAEAAIAEABIAEAFIAGAJIAJAMIAJALIAGAHIACADIABACQgBAEgCACQgDADgDAAIgBAAIgDgBgABdAKIgGgGIgLgNIgQgVQgEgHAAgCQAAgDACgDQADgCADgBQABAAAAAAQABAAAAABQABAAAAAAQABAAAAABIAEAEIAIAMIAMAPIAKAMIACADIABADQAAADgDADQgCACgDAAIgBAAIgDgBg");
	this.shape_24.setTransform(109.7,395.4);

	this.shape_25 = new cjs.Shape();
	this.shape_25.graphics.f("#006600").s().p("AgkBqQgFAAgDgDQgDgDAAgGQgBgFACgBQACgCAGgDQAVgIAOgIQAMgIALgJQAIgIAEgIQAFgHACgLQABgKABgQQgBgXgBgWQgBgVgDgRIAAgBIAAgCQAAgEAEgDQADgDAGAAQAEAAADADQADADABAEIABAPIABAYIABAbIABAXQAAASgDAOQgDAMgHALQgHALgNAMIgNAJIgRALIgWALIgHADIgEABIgDAAgAg1AQIgEgFIgDgRQgCgKAAgMIAAgRIADgRIACgQIAAgEIAAgCIAAgDIAAgDIAAgBIAAgBQAAgEADgDQAEgCAFAAQAGgBACAFQADAFABAIIAAAEIgCAHIgCARIgBARIAAAOIAAAPIACAKIABAEIAAACQAAAGgDADQgDADgGAAIgGgCg");
	this.shape_25.setTransform(85.9,394.8);

	this.shape_26 = new cjs.Shape();
	this.shape_26.graphics.f("#006600").s().p("AhnBnQgDgEAAgEIAAgDIADgEIAHgHIAXgXIAXgaIAUgaQAJgMAFgKIACgEIACgIIACgPIgRAAIggAAIgWAAIgLAAIAAAAQgEAAgDgDQgDgDAAgEQAAgFADgDQADgDAEAAIADAAIACABIAHAAIAMAAIAhAAIAbAAIABgNIAAgKIAAgJQAAgFADgDQADgCADAAQADAAADABIADAEIABADIABAEIgBAKIgBAQIAAAEIAQAAIAYAAIANgBIAIAAIAHAAIALgBIAGAAQAEAAACABQADABABADIABACIAAADQAAAFgEADQgDADgGgBIgMABIgbABIgLAAIgPAAIgUAAIgBAPIgCAJIgCAHIAHgBIAIgBQANAAANAGQAMAFAIAJIAFAFQAAABAAAAQAAABABAAQAAABAAAAQAAABAAAAQgBAFgDAEQgDADgFAAQgBAAAAAAQgBAAAAAAQgBAAAAAAQgBgBAAAAIgEgEQgGgIgIgFQgIgEgJAAQgHAAgJACQgHACgIAEIgmAvQgTAXgQAQIgGAGIgFABQgEAAgEgDgAAZBlQgKgFgHgKIgIgMQgDgGAAgEQAAgEADgDQACgDAFAAIAEABIAEADIABABIABADQAFAKAHAGQAHAGAHABQAGgBAGgEQAIgEAHgIQAGgIAGgKIADgDIAFgBQAFAAADADQAEADgBAFQAAADgCAFIgIALIgLAMQgJAJgKAEQgJAFgJAAQgKAAgIgFg");
	this.shape_26.setTransform(61.6,394.7);

	this.shape_27 = new cjs.Shape();
	this.shape_27.graphics.f("#006600").s().p("AhYBrQgEAAgDgDQgCgDAAgEQAAgEACgDQADgDAEAAICeAAQADAAABgBQABgBAAAAQAAgBABAAQAAgBAAAAQAAgBAAgBIAAgcIifAAQgDgBgDgCQgCgDAAgEQAAgEACgDQADgCADAAICfAAIAAgbQAAgBAAgBQAAAAAAgBQgBAAAAgBQAAAAgBgBQgBgBgDAAIieAAQgDAAgDgCQgCgDAAgEQAAgEACgDQADgDADAAIBRAAIAAhOQAAgFADgCQADgDADAAQAFAAAEADQACACAAAFIAABOIBAAAQALAAAFAFQAFAFAAAKIAABUQAAALgFAFQgFAFgLAAgAAxghQgDgDAAgFQgBgBAAAAQAAgBAAAAQAAgBABAAQAAAAAAgBIAEgGIAMgRIANgWQACgDADgCQACgCADAAQAFABADADQAEADAAAFQAAADgFAKIgOAWIgJANQgDAEgDACQgDABgDAAQgFAAgDgDgAg5gfIgEgDIgBgBIgCgEIgXglIgBgFIgBgEQAAgEADgDQADgDAFAAQAEAAACABIAFAHIAVAgQAGALAAADQAAAFgDADQgEADgFAAIgFgBg");
	this.shape_27.setTransform(37.7,394.4);

	this.shape_28 = new cjs.Shape();
	this.shape_28.graphics.f("#006600").s().p("AAVBuQgDgDAAgEIAAgoIgZAAQgDAAgDgDQgCgDAAgEQAAgEACgCQACgDAEAAIAaAAIAAhIQgGARgIAQQgGARgKAPQgIAPgKALQgGAHgDACQgCACgDAAQgEAAgDgEQgDgDgBgEIABgEIADgEQAMgMALgRQAMgQAKgSQAJgTAIgUIg1AAQgEAAgCgDQgDgDABgEQgBgEADgDQACgCAEgBIA7AAIAAgjQAAgEADgDQADgCAFAAQAEAAADACQACADABAEIAAAjIBAAAQADAAADADQACADAAAEQAAAEgCADQgDADgDAAIg5AAIABADQAHAOAKARQAJAQANAQQAMARAMAOIADAEIABAEQAAAFgDADQgEAEgEAAQgCAAgDgCIgGgHQgRgUgNgXQgNgWgLgbIAABLIAdAAQAEAAACACQACADAAAEQAAAFgCACQgCADgEAAIgcAAIAAAoQgBAEgCADQgDACgEAAQgFAAgDgCgAhMBuQgCgCAAgEIAAh8QgKAPgGAGQgFAGgEAAQgEAAgDgDQgDgDAAgDIABgEIADgGQAKgNAJgPQAJgPAHgRQAIgQAGgQQABgHAIAAQAEAAADACQADADAAAEIgCAJIgGAQIgJAUIAAChQAAAEgDACQgDACgEAAQgFAAgDgCg");
	this.shape_28.setTransform(14,394.8);

	this.shape_29 = new cjs.Shape();
	this.shape_29.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_29.setTransform(834.8,554.8);

	this.shape_30 = new cjs.Shape();
	this.shape_30.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_30.setTransform(818.7,554.8);

	this.shape_31 = new cjs.Shape();
	this.shape_31.graphics.f("#006600").s().p("AAwBrIgEgEIgFgGIgDgFIgGgEIgRgPIgWgTIgkgdIgDgDIgEgDIgGgGQgFAAgDgCQgEgEAAgFIACgGIAFgFIABgBIADgDIAHgEQASgMAYgSQAWgSAdgZIAFgFIACgGQABgDADgCQACgBAEAAQAGAAADADQAEADAAAGQAAAFgDAEQgCAFgHAFIgUAQIgbAVIgbAWIgZARIANALIAsAjIAcAXIAOANQAEAEABAEIABAFQAAAFgDAEQgEAEgFAAIgFgBg");
	this.shape_31.setTransform(799,555.2);

	this.shape_32 = new cjs.Shape();
	this.shape_32.graphics.f("#006600").s().p("AhkBpQgEgDAAgDIAAi8QAAgJAFgEQAFgFAJAAIA6AAQAJAAAEAFQAFADAAAJIAAAqQAAAJgFAEQgEAFgJAAIg4AAIAACBQgBADgCADQgDADgFAAQgEAAgCgDgAhTgtIAxAAQABAAABAAQAAAAABAAQAAgBABAAQAAAAABAAIABgEIAAgMIg3AAgAhShaIgBADIAAALIA3AAIAAgLIgBgDQgBgBAAAAQgBAAAAgBQgBAAAAAAQgBAAgBAAIgsAAQgBAAAAAAQgBAAgBAAQAAABAAAAQgBAAAAABgAA5BqQgHgBgDgDQgCgDAAgEQAAgFADgCQADgDAEgBIACAAIADABIAHABIAIAAQAFABACgDQACgBAAgFIAAhsIg5AAQgJAAgFgFQgEgEAAgJIAAgqQAAgJAEgEQAEgEAKAAIA8AAQAIAAAFAFQAFAEAAAJIAACtQAAAIgCAEQgBAFgEACQgDACgFABIgQABIgRgBgAAcgyIABAEQAAAAABAAQAAAAABABQAAAAABAAQAAAAABAAIAzAAIAAgRIg4AAgAAdhaIgBADIAAALIA4AAIAAgLQAAgBAAAAQAAgBAAAAQAAgBAAAAQgBAAAAAAQAAgBgBAAQAAAAAAgBQgBAAAAAAQgBAAAAAAIgvAAQgBAAAAAAQgBAAAAAAQgBABAAAAQgBAAAAABgAg+BkQgDgDAAgEIABgEIAFgFQAKgHAFgJQAGgKACgMIgdAAQgDABgCgDQgCgDAAgDQAAgEACgCQACgCADgBIAeAAIAAgdIgYAAQgCAAgCgCQgCgDAAgEQAAgCACgDQACgCACAAIB1AAQAEAAABACQACACAAAEQAAAEgCACQgBACgEAAIgVAAIAAAdIAbAAQADABACACQACADAAADQAAADgCADQgCADgDgBIgbAAIAAAwQgBADgCADQgDACgEAAQgEAAgDgCQgCgDAAgDIAAgwIgjAAQgCALgCAHQgCAIgEAHIgJAMQgFAFgFADQgGAEgDAAQgEAAgDgDgAgRAdIAjAAIAAgdIgjAAg");
	this.shape_32.setTransform(775.3,555.4);

	this.shape_33 = new cjs.Shape();
	this.shape_33.graphics.f("#006600").s().p("AgcBqQgJgFgJgJIgGgGIgBgGQAAgFADgDQADgEAFAAIAEABIAFAFIALAKQAGAEAEAAQACAAADgCQACgDABgEQACgGABgLIABgYIABgbIAAgLIgBgNIAAgJIgBgCIgBgBIgCAAIgCABIgHAAIgMABIgLAAIgFAeQgCANgEAKQgDALgFAIQgHANgJAMQgJANgMALIgFAFIgFABQgFAAgEgDQgDgEAAgFQAAgDACgDIAHgIQAJgHAIgLQAIgKAGgLQAHgLACgJIAFgSIADgXIgGAAIgRABIgJAAIgEAAIgBAAQgGAAgDgDQgDgCAAgFQAAgGADgDQADgDAGAAIAYABIAHAAIAIgBIABgUIABgWQAAgHADgDQADgDAFAAQAFAAADADQADACAAAFIgBAJIgBAQIgBAUIAMgBIAJAAIALgBIADgBIADAAQAGAAAEADQAEACABAFIACAMIABASIABAWQAAAWgCATQgCASgDAMQgEALgHAGQgFAGgKAAQgJAAgJgEgABPAjIgKgLQgJgLgIgNIgQgXIgKgUQgEgJAAgEQAAgEACgDQADgDAFAAIAFABIAEAEIABABIACAGIANAYIARAZIASAWIADAEIABAFQAAAFgDADQgDADgFAAIgBAAQgDAAgCgCgABOghIgGgGIgLgOIgPgVQgFgHAAgCQABgDACgDQACgCAEAAIAEABIAEAFIAFAIIAJALIAJAMIAHAJIACACIAAADQAAADgCADQgDADgDAAIgEgCgABngzIgGgGIgLgOIgQgVQgEgHAAgCQAAgDADgDQACgCAEAAIAEABIADAFIAGAHIAIAMIAJAMIAIAJIACACIAAADQAAADgDADQgCADgDAAIgBAAIgDgCg");
	this.shape_33.setTransform(751.6,554.3);

	this.shape_34 = new cjs.Shape();
	this.shape_34.graphics.f("#006600").s().p("Ag5BqQgDgDAAgEQAAgBAAAAQAAgBAAgBQABAAAAgBQAAAAABgBIACgDIACgBIAFgBQAKgDAIgGQAIgFAFgHIgLACIgMADIgLABIgIABQgEAAgCgCQgCgDAAgEQgBgDACgCQABgCADgBIACgBIADAAIAKgBIANgBIANgCIAJgCIABgFIAAgHIgsAAQgDAAgCgCQgCgCAAgEQAAgDACgCQACgCADAAIAsAAIAAgPIguAAQgDAAgCgDQgCgCAAgEQAAgCACgCQACgCADgBIAuAAIAAgQIg4AAQAAAbgCAYQgDAYgEAQIgGASIgHAPQgBADgDABQgCACgDAAQgEAAgEgDQgDgDgBgEIABgDIABgDQAIgOAEgRQAEgQACgWQACgWABgcIAAgeQgBgJAEgEQAFgFAKAAICZAAQAIAAAEAEQAEAEAAAIIAAAVQAAAQgQAAIggAAIAAAQIAyAAQADABACACQACACAAADQAAADgCADQgCACgDAAIgyAAIAAARIAuAAQAEAAACACIABAGIgBAFQgCACgEABIguAAIAAARIA1AAQADAAACACQACADAAAEQAAADgCADQgCACgDAAIg1AAIAAAYQAAAEgCACQgEACgEAAQgEAAgDgCQgCgCAAgEIAAh7IgZAAIAAA5QAAASgDAMQgEAMgFAIQgIAIgIAGQgKAGgKADIgFABIgDABQgFAAgDgDgAhDg6QAAABgBAAQAAAAAAABQAAAAAAABQAAAAAAABIAAAOICPAAIACgBQAAAAABAAQAAgBAAAAQAAAAAAgBQAAAAAAgBIAAgLQAAAAAAgBQAAAAAAgBQAAAAAAAAQgBgBAAAAIgCgBIiLAAIgDABgAhghaQgEAAgCgCQgDgDABgEQAAgEABgCQADgCAEgBIDHAAQAEAAACADQACACABAEQgBAEgCADQgCACgEAAg");
	this.shape_34.setTransform(727.2,555.4);

	this.shape_35 = new cjs.Shape();
	this.shape_35.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_35.setTransform(703.2,555.1);

	this.shape_36 = new cjs.Shape();
	this.shape_36.graphics.f("#006600").s().p("ABPBXQgGgDgFgFIgRgVIgXgdIgXgfIgWgeIgQgXIgCgEIgBgBIgBABIgBADIgHAQIgIAUIgJATIgIAOQgDAFgFAEQgFAEgFAAQgEAAgEgEQgDgDAAgFIABgFIAEgDIADgEIAEgEIAIgPIAJgTIAKgUIAIgTQACgHAFgEQAEgEAFAAQADAAAEACIAGAGIACADIACAEIAGAJIAVAgIAaAjIAbAiQAMAQAMAMIABABIABABIADADIAFACIADAEQACACgBAEQAAAFgCADQgEADgEAAQgEAAgGgEg");
	this.shape_36.setTransform(679.2,555.6);

	this.shape_37 = new cjs.Shape();
	this.shape_37.graphics.f("#006600").s().p("AhJBsQgEgDAAgGQAAgGAEgDQAEgDAFAAIABAAQAGAAAKgEQALgFAMgIIAYgSQAMgLAKgLIAMgPIANgTQAGgKADgHQABgDADgCQACgCAEAAQAEAAAEADQADADAAAFQAAAEgFAJIgNAVIgRAXIgQASQgKAKgMAIQgKAJgNAIQgMAIgLAFIgJAEIgJAAQgJAAgEgCgAgXADIgSAAIgWgCIgTgBIgPgCQgEgBgCgDQgCgDAAgEQAAgEADgEQADgDAEAAIACAAIAFABIATADIAYACIAXABQAGAAADACQAEADAAAGIgCAFIgEADIgDABIgFAAgAA+goIgGgGIgOgQIgKgOIgFgGIgBgEQAAgEACgBQADgDADAAQAAAAABAAQABAAAAAAQABAAAAAAQAAABABAAIAEAFIAIAJIALAOIALANIACACIABACQgBAEgCACQgDADgDAAIgEgBgAgdg2IgVgDIgVgEIgSgEIgDgBIgCgBQgDgBgBgCQgCgDAAgEQAAgEADgEQAEgDAEAAIACAAIAFACIAUAFIAZAEIAYACQAGABADADQADACAAAGQAAAEgDADQgEACgFABIgQgBgABeg2IgDgEIgNgOIgLgOIgHgJIgDgDQAAgBAAAAQAAAAAAgBQAAAAAAAAQAAgBAAAAQAAgDACgDQADgCADAAIAEABIAEAEIAPASIAPARQADADAAADQAAADgDADQgCADgEAAIgDAAg");
	this.shape_37.setTransform(656.2,554.3);

	this.shape_38 = new cjs.Shape();
	this.shape_38.graphics.f("#006600").s().p("AgZAMIgVAAIgWAAIgQAAIgJgBQgEgBgCgDQgCgDAAgEQAAgEADgEQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAAEgCACQgDADgEABIgJAAIgWABIgdABIgfAAIgbAAg");
	this.shape_38.setTransform(631.1,554.2);

	this.shape_39 = new cjs.Shape();
	this.shape_39.graphics.f("#006600").s().p("Ag1BhQgDgDAAgFQgBgEACgDQACgCAGgDQAPgJAKgIQAJgIAEgJQAEgIAAgLIAAgdIgOABIghAAIgOABIgNAAIgGAAIgGAAQAAAAAAgBQgBAAAAAAQgBAAAAgBQgBAAAAgBIgCgDIgBgEIACgGIADgEIADgBIAHAAIAGAAIARAAIANAAIAPAAIALAAIALAAIAQgBIAZgBIAmgCIADAAIAEAAIANABQAEABACADIABADIABADQAAAEgCADQgCADgDABIgBAAIgDAAIgHAAIgQAAIglABIgMAAIAAAdQAAAKgBAIQgBAIgDAGQgDAGgGAFQgFAIgKAIQgKAIgIAFQgJAFgFAAQgEAAgDgEgAg9hPQgDgDAAgFQAAgDABgCQACgDADgBIACgBIADAAIAqgBIAlgBIAcgBIABAAQADAAADADQADADAAAEQAAAEgCADQgDADgEABIgSABIgcABIgfAAIggABQgEAAgDgDg");
	this.shape_39.setTransform(607.3,555.4);

	this.shape_40 = new cjs.Shape();
	this.shape_40.graphics.f("#006600").s().p("AhcBgQgDgEAAgFIABgEIACgDIABgBIAGgEQASgLARgMQARgNANgOQAOgNAJgNQAKgMAHgNIANgZQAGgMADgLIgXACIgaAAIgcABIgYAAQgFAAgDgCQgDgDABgFQgBgEACgDQACgDADgBIACAAIAEAAIAKAAIAkAAIAhgBIAagBIAFgDIAFgBQAFAAAEADQADAEAAAGIgCAHIgDAKIgJASQgKAVgKARQgLARgMAPIAeAUIAZARIAXARQAFAFAAAGQAAAFgDAEQgEADgFABIgEgBIgEgDIgSgPIgbgUIgggXIgZAYIgYAUIgVAOQgJAFgEAAQgFAAgDgDg");
	this.shape_40.setTransform(583.3,555.3);

	this.shape_41 = new cjs.Shape();
	this.shape_41.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_41.setTransform(559.2,555.1);

	this.shape_42 = new cjs.Shape();
	this.shape_42.graphics.f("#006600").s().p("Ag5BtQgDgDAAgFIABgEIADgEIABgBIAFgCQAigZAQgfQAQghAAgsIAAgLIgWAAIgHAUIgHAQIgIANIgFAGQgDACgEgBQgEAAgDgCQgDgDAAgEIABgDIADgGQALgTAJgUQAIgWAFgXQABgGACgCQADgDAEAAQAEAAADADQADACAAAFIgBAGIgDALIgDALIBbAAQAHgBAEAEQAEADABAHQgBAFgDALQgEAMgGAOIgIAQQgDAEgDACQgDADgDAAQgFAAgDgEQgDgCAAgDIAAgEIADgFIAIgPIAHgQIADgKQAAAAAAAAQAAgBAAAAQAAAAgBAAQAAgBAAAAIgDAAIgrAAIAAAKQAAAsARAhQARAhAiAYQAEACABACQACADAAADQgBAEgDAEQgDADgFAAIgFgBIgGgEQgXgQgQgYQgPgYgHgfQgFAZgMATQgKAUgSARQgKAKgIAFQgIAFgFAAQgFAAgDgDgAhiBsQgFAAgDgDQgDgEAAgEIAAgFIAEgGQAIgNAJgSIAQgmQACgFACgCQADgCADAAQAFAAAEACQADADAAAFIgDAKIgGARIgJAVIgIARQgIAOgEAGQgFAFgEAAIgBAAgAhHglQgDgCgDgFIgHgKIgJgOIgIgLIgCgEIgBgEQAAgEAEgEQADgDAEABIAFAAQACACAEAEIALAOIANAVQAEAGAAAEQAAAEgEAEQgDADgFAAQgDAAgCgCg");
	this.shape_42.setTransform(535.5,554.8);

	this.shape_43 = new cjs.Shape();
	this.shape_43.graphics.f("#006600").s().p("AgQBjQgQAAgKgCQgJgBgFgCQgJgEgFgGQgFgHAAgJQAAgGAEgHQADgIAHgHIAcgYIAegYIgfgWIgbgWIgTgRIgHgJQgCgFAAgDQAAgGADgDQADgEAFAAQAEAAACACIAEAEQAEAIAKAKQAKAKAQANIAoAeIANgKIALgIIALgIIADgDIAEgDIAHgGIAFgHIADgCIAFgBQAFAAADADQAEADAAAGQAAAFgFAFQgFAHgMAIIgcAUIgfAXIgbAXIgUATIgHAIQgCADAAADQAAAEADACQADACAHACIAVABIAiABIAZAAIAQgBIAJgBIAFgDIAEgCIADAAQAFAAADADQADADAAAFQAAADgCADQgCAEgDACQgFACgHABIgSACIgeABIgngBg");
	this.shape_43.setTransform(510.6,554.9);

	this.shape_44 = new cjs.Shape();
	this.shape_44.graphics.f("#006600").s().p("AguBcQgNgIAAgPQAAgQARgNQARgNAfgHIgPgKIgTgMIgGgFQgBgDAAgDQAAgEACgEQADgEAEgEIAYgUIAngdIgBAAIgXABIgZAAIgZABIgUABQgJAAgDgCQgEgDABgFQgBgGADgDQADgCAGAAIACAAIAFAAIAGABIAIAAIAvgBIArgDIADAAIABAAQAHAAAFAEQAFACAAAGIgBAEIgDAFIgCABIgGAEIgRAPIgVAQIgTAQIgNALIAPALQAIAFAOAGQARAKALAHQAKAIAFAGQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAFgIAIQgIAHAAAGQAAAGAGADQAGACAPAAQAQAAANgDQANgEAIgGQAIgHAAgIQAAgEgFgEQgEgEgKgHQgVAFgOAFg");
	this.shape_44.setTransform(486.9,555.4);

	this.shape_45 = new cjs.Shape();
	this.shape_45.graphics.f("#006600").s().p("AAGBkQgDgDgBgFIABgEIAEgEIACgBIAEgCQAOgFANgIQANgJAKgJQAJgLAEgLQAEgLABgOQAAgPgJgMQgIgLgRgJQgNAdgPAWQgPAYgOARQgPARgPAJQgOAKgNAAQgIAAgFgEQgGgDgFgHQgEgHgDgKQgDgKAAgKQAAgXAMgUQAOgVAZgRIgFgRIgFgPIgBgJQAAgEADgDQADgDAFAAQAEAAADACQACACABAGIACAIIADAMIADAMQANgGAMgCQALgCANAAIAHAAIAKABIAGgQIAFgMQABgFACgCQACgCAEAAQAFAAADADQADADAAAFIgCALIgIAVQAWAKANAQQAMARAAATQAAAVgIARQgHAQgPAOIgPAMIgRALIgPAIQgIADgEAAQgEAAgDgEgAhHgBQgJAPAAASQAAANAFAIQAFAIAGABQAFAAAHgEIAQgNQAIgHAJgKIgNgbIgMgfQgSANgJAQgAgEgvQgKACgMAFIAJAbIALAXIAQgaQAIgOAJgSIgGgBIgDAAQgMAAgKACg");
	this.shape_45.setTransform(463,555);

	this.shape_46 = new cjs.Shape();
	this.shape_46.graphics.f("#006600").s().p("AgGBxQgDgCAAgFIAAgyQgNAOgRAMQgRALgTAJIgPAFQgFACgDAAQgEAAgDgDQgDgDAAgFQAAgBAAAAQAAgBAAAAQABgBAAAAQAAgBABAAIADgEIABgBIACAAIAHgCQALgEAMgFQAMgGAMgIQAMgIAKgIIhOAAQgDgBgCgCQgCgDgBgEQAAgDACgDQADgCADAAIBdAAIAAgQIg6AAQgKAAgFgFQgFgEABgJIAAgtIgLALQgEADgDAAQgEAAgDgDQgCgDAAgEIABgEIAEgFIAPgQIAOgTIAMgTQACgDACgBQADgBADAAQADAAADACQADADAAAEIgBAFIgIAMIA0AAIAFgIIAGgMIAEgEIAFgCQAFAAADACQADADAAAEQAAACgDAEIgIALIBPAAQADAAACACQACACAAADQAAAEgCACQgCACgDABIhTAAIAAANIBLAAQADAAACABQACADAAAEQAAADgCACQgCACgDAAIhLAAIAAANIBLAAQADAAACABQACACAAAEQAAADgCACQgCADgDAAIhLAAIAAANIBWAAQADABACABQABACAAAEQAAADgBADQgCACgDAAIhWAAIAAAQIBeAAQADAAADACQACADAAAEQAAAEgCACQgDACgDABIhQAAQALAHANAIQANAHAPAHQAOAFAOAEQAFACACACQADADgBADQAAAFgCADQgDADgFAAIgEgBIgIgCQgYgIgTgLQgUgMgSgTIAAA0QAAAFgDACQgDABgEAAQgFAAgCgBgAhCgGIABADIAEABIA0AAIAAgNIg5AAgAhCgeIA5AAIAAgNIg5AAgAhBhGIgBAEIAAAIIA5AAIAAgNIg0AAIgEABg");
	this.shape_46.setTransform(439.2,554.8);

	this.shape_47 = new cjs.Shape();
	this.shape_47.graphics.f("#006600").s().p("AgfBVQgDgDAAgFIABgFIADgEIACgBIAEgCQAygRAZgYQAYgYAAgiQAAgJgDgHQgDgGgFgEIgJgEIgLgDIgQAAIgYAAIgcACIgfABIgdADIgCAAIgBAAQgEAAgDgDQgCgDAAgEIABgHQABgCADgBIADgBIAIAAIAFgBIAKAAIAigDIAigBIAdgBQAhAAAQAOQAQANAAAbQAAAcgMAVQgNAWgZASIgSALIgVALIgTAIQgJAEgDAAQgFgBgDgDg");
	this.shape_47.setTransform(415,555.7);

	this.shape_48 = new cjs.Shape();
	this.shape_48.graphics.f("#006600").s().p("AAHBmQgDgCgBgEIgBAAIAAgBIABgsIgQAAIgKAAIgHAAIgGABIgYAAIgOABQgHAAgFgEQgEgDAAgGQAAAAAAgBQAAgBAAAAQAAgBAAAAQABgBAAAAIADgGIAIgMQAQgVASgdQASgeAUgkIAEgEIAEgBQAFAAADADQADADAAAFIAAACIgBADIgEAGIgJARIgfA0IgdAsIANgBIALAAIASAAIALAAIALAAIABg6QABgEADgDQADgDAFAAQAEAAACACQADACABAEIAAABIAAABIgBA6IASAAIAUAAIAJgBIAGAAIAFAAIADABQACABACADIABAFQAAAEgCACQgBADgDACIgCAAIgEAAIgIAAIgQAAIgPABIgPAAIgBArQAAAEgDACQgEADgEAAQgDAAgDgCg");
	this.shape_48.setTransform(393.7,554.9);

	this.shape_49 = new cjs.Shape();
	this.shape_49.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_49.setTransform(371.5,554.5);

	this.shape_50 = new cjs.Shape();
	this.shape_50.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_50.setTransform(264.9,466);

	this.shape_51 = new cjs.Shape();
	this.shape_51.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_51.setTransform(248.8,466);

	this.shape_52 = new cjs.Shape();
	this.shape_52.graphics.f("#006600").s().p("AgXBlQgEgDAAgFQAAgEACgCQABgDAFgCQAOgFAJgGQAJgGAHgHQAKgLAFgNQAGgNgBgOQABgQgKgKQgLgKgRAAQgJAAgIAEQgJADgGAGQgEAGgBAGQAAAGgDAEQgDADgGAAQgFAAgDgDQgDgEAAgGQABgMAIgKQAIgKAPgHQAOgGAPgBQARABANAHQAOAHAIANQAHANAAAQQAAAbgOAXQgPAWgdARIgLAGQgHADgCAAQgFAAgDgEgAgyhMIgTgCQgGAAgBgDQgDgCAAgEQAAgGADgDQADgDAFAAIABAAIACAAIAHABIASACIAYAAQAXAAAVgBQAUgCASgEIACAAIABgBQAFAAADADQADADAAAFQAAAFgDACQgCADgFABIgRADIgYACIgbABIgbABIgZgBg");
	this.shape_52.setTransform(229.1,466.5);

	this.shape_53 = new cjs.Shape();
	this.shape_53.graphics.f("#006600").s().p("AhMBgQgLgIgBgOQABgNAIgMQAJgKAOgHQAOgGARAAIAHAAIAHABIAAgMIgBgqIgBgiIgBgWIABgMIABgEQABgBAAAAQAAAAABgBQAAAAABAAQAAgBABAAQACgBADgBQADABACABQADACABACIAAADIABAJIAAAJIAAAUIAAAHIAWgDIAXgEIAVgFIACgBIADAAQAEAAACADQADAEAAAEQAAAEgCADQgBACgEABIgVAGIgbAEIgZADIABAPIABAbIABAUIAEACIABABIADACIAGADIAiAWIAXANQAEABACAEQACACAAADQAAAGgDADQgDAEgEAAQgFgBgPgIIgrgdQgCANgFAJQgFAIgJAFQgIAFgLABQgKACgMAAQgTABgLgJgAgtAyQgJAEgGAFQgFAGAAAHQAAAFAFAEQAFACAKAAQAWABAJgIQAKgIAAgRIAAgBIAAgBIAAgBIgJgBIgMAAQgLAAgJADg");
	this.shape_53.setTransform(205.3,466);

	this.shape_54 = new cjs.Shape();
	this.shape_54.graphics.f("#006600").s().p("AAGBlQgEgEAAgFIACgFIADgDIABgBIAFgCQAPgFANgJQAMgIAJgKQAKgKAEgLQAEgLAAgOQAAgPgIgMQgIgMgRgHQgNAcgPAWQgOAYgPARQgQARgOAKQgPAJgMAAQgHAAgHgEQgFgDgFgHQgFgHgDgKQgCgKAAgKQAAgYAMgTQANgVAagRIgFgSIgFgOIgBgIQAAgFADgDQADgDAFAAQAFAAACADQADACABAFIABAIIADAMIAEAMQANgFALgDQALgCANAAIAHAAIAKABIAGgQIAEgMQACgFACgCQACgCAEAAQAFAAADADQADADAAAEIgDAMIgHAVQAWAKAMAQQANARAAAUQAAAUgHARQgIARgQANIgOAMIgRALIgPAIQgIADgDAAQgFAAgDgDgAhHgBQgJAPAAASQABAMAEAJQAFAJAGAAQAFAAAHgEIAQgMQAIgIAJgKIgNgaIgMghQgSAOgJAQgAgDgvQgLACgMAFIAJAbIALAYIAQgbQAJgPAHgSIgEAAIgFAAQgLAAgJACg");
	this.shape_54.setTransform(181.1,466.2);

	this.shape_55 = new cjs.Shape();
	this.shape_55.graphics.f("#006600").s().p("AgGBwQgCgCAAgDIAAgzQgOAOgRAMQgQALgUAJIgOAGQgGABgDAAQgEAAgDgDQgDgDAAgFQAAgBAAAAQAAgBAAAAQABgBAAAAQAAgBABgBIACgCIACgBIADgBIAFgCQAMgDAMgHQAMgFAMgIQAMgIAKgJIhOAAQgDAAgCgCQgDgDAAgEQABgEACgCQACgCADgBIBeAAIAAgPIg8AAQgJAAgFgFQgEgFgBgIIAAguIgKAMQgEADgDAAQgEgBgDgCQgCgDAAgEIAAgEIAFgFIAOgQIAPgTIAMgSQACgEADgBQACgBACAAQAFAAACACQADADAAADIgCAGIgHAMIAzAAIAGgJIAGgKIAEgGIAFgBQAFAAADACQADAEAAADQAAACgDAFIgIAKIBPAAQADgBACADQABACABAEQgBADgBACQgCADgDAAIhTAAIAAAMIBLAAQADAAACACQACADAAADQAAADgCADQgCACgDAAIhLAAIAAAMIBLAAQADAAACACQACADAAADQAAAEgCACQgCACgDAAIhLAAIAAANIBWAAQACABACABQACACAAAEQAAADgCADQgCACgCAAIhWAAIAAAPIBeAAQADABADACQACADAAADQAAAEgCADQgDACgDAAIhQAAQALAJANAHQANAIAOAFQAPAHAOADQAFABACADQACACAAAEQAAAFgDADQgCADgFAAIgEgBIgIgDQgYgGgUgNQgTgMgSgRIAAA0QgBADgCACQgDACgEAAQgEAAgDgCgAhCgGIABADIAEABIA1AAIAAgNIg6AAgAhCgfIA6AAIAAgMIg6AAgAhBhGIgBADIAAAIIA6AAIAAgMIg1AAIgEABg");
	this.shape_55.setTransform(157.3,466);

	this.shape_56 = new cjs.Shape();
	this.shape_56.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_56.setTransform(133.2,465.7);

	this.shape_57 = new cjs.Shape();
	this.shape_57.graphics.f("#006600").s().p("AAiBdIgRgFIgRgHQgJgEgGgEQgRgJgJgMQgJgMAAgOQAAgMAKgPQALgQATgSQASgSAZgSIgmABIgsAAIgrABQgEAAgDgDQgDgDAAgFQAAgDACgCIAEgEIADgBIAFAAIAZAAIAlAAIAlgBIAkgBIAcgBIARgBIACAAQADABADADQADADAAADQAAAFgDADQgCADgEAAIgGAAIgJABIgHAAQgUAMgSANQgSAOgOANQgNAOgIALQgIAMAAAIQgBAPARALQAPALAlAJIADABIACAAIACAAIADgBIACAAIACAAQAEAAADADQADADAAAFQAAAGgFADQgEAEgJAAIgNgCg");
	this.shape_57.setTransform(300.5,395.4);

	this.shape_58 = new cjs.Shape();
	this.shape_58.graphics.f("#006600").s().p("AgxBjQgNgGgHgMIgEgJIgBgMIgBgVIABgbIABgeIABgdIABgXIABgEIAAgEIAAgGIgCgGIAAgCIAAgBQAAgGADgCQADgDAGgBQAGABAEAGQAEAFAAAMIAAACIgBAEIAAAKIgDAgIgBAiIgBAgIABAUIABALIADAIQAEAFAHAEQAIACALAAQAOAAAKgDQALgFAJgJIAJgLIAJgPIAIgQQACgEACgCQADgBADAAQAFAAAEADQADAEABAFIgEAMIgJAQQgFAKgGAHQgMAQgRAIQgSAHgWABQgTgBgNgGg");
	this.shape_58.setTransform(277.9,394.7);

	this.shape_59 = new cjs.Shape();
	this.shape_59.graphics.f("#006600").s().p("AhPBvQgCgDgBgDIAAh6IgLARQgEAFgDAAQgEAAgDgDQgDgCAAgEIABgDIADgFQAHgLAHgPQAIgQAGgRIALgiIADgFQADgCADAAQAEAAADADQADACAAAEIgCAJIgGARIgHATIAACjQAAADgDADQgCACgEAAQgFAAgCgCgABCBuQgHgBgDgDQgDgCAAgFQABgEACgDQADgDAEAAIADABIAGAAIAHABIAEAAQAFAAABgCQACgCAAgFIAAi2QAAgEADgCQACgDAFAAQAEAAADADQACACAAAEIAAC/QABALgFAEQgGAFgMAAIgWgBgAgzBoQgCgDAAgFQAAgDABgCQACgCADgBIACAAIAFgBIAMgCIANgCIADgBIAAgsIgeAAQgEAAgCgCQgDgCAAgFQAAgEACgCQADgDAEAAIAeAAIAAgWQAAgDADgDQACgCAFAAQADAAACACQADADAAADIAAAWIAcAAQADAAACADQADACAAAEQAAAEgDADQgCACgDAAIgcAAIAAApIAMgCIAIgCIAIgCIADgBIACAAQAEAAACADQADACAAAEQAAADgCACQgBACgDABIgOAEIgUAFIgVAEIgTADIgLACQgFAAgDgDgAA3A8QgCgCAAgDIAAiIQAAgDACgDQADgCAEAAQAEAAADACQACADABADIAACIQgBADgCACQgDADgEAAQgEAAgDgDgAAhgJIgDgCIgBgCIgBgDIgBgDIgBgCIgUADIgUAEIgTACIgLACQgEgBgDgCQgCgDAAgFQAAgDABgCQACgDADAAIADgBIAEAAIABAAQAFgLAFgOIAIgbIgUAAQgEAAgCgCQgCgDAAgEQAAgEACgDQACgCAEAAIBOAAQAEAAACACQADADAAAEQAAAEgDADQgCACgEAAIgnAAIgIAbIgJAXIAUgCIATgCIgEgJIgFgKIgBgFQAAgEACgCQADgCAEAAIAEABIAEAEIAFAJIAGAOIAFAMIADAHIABADIAAACQAAAEgDACQgDACgEAAIgEgBg");
	this.shape_59.setTransform(252.1,394.8);

	this.shape_60 = new cjs.Shape();
	this.shape_60.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_60.setTransform(228.5,394.3);

	this.shape_61 = new cjs.Shape();
	this.shape_61.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_61.setTransform(326.8,330.7);

	this.shape_62 = new cjs.Shape();
	this.shape_62.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_62.setTransform(310.7,330.7);

	this.shape_63 = new cjs.Shape();
	this.shape_63.graphics.f("#006600").s().p("AhDBpQgDgDAAgFIAAgFIAAgHIABg/IABhXIAAgUIABgKIAAgEIAAgCQACgDACgBQADgCADAAIAFABIAEADIACAEIABAGIAAAFIAAAjIgBALIAAAMIAZAPIAcANQAPAGAOAEQAFACACADQACACAAAFQAAAFgEAEQgDADgFAAIgEAAIgHgDIgjgRQgRgJgQgJIAAAcIAAARIAAAKIgBAKIAAAXIAAAMIgBAEIAAADQgBADgDACQgDACgEAAQgFAAgDgDgAAcgWIgDgEIgYgaIgJgOIgCgGQAAgDACgCQADgDADAAIADABIAEAEIAKAOIAMANIAKAMIADADIAAADQAAADgCADQgDACgEAAIgBAAIgCAAgAA6gqIgKgJIgQgUIgIgLIgEgEIAAgDQAAgEACgCQADgCADAAIAEABIAEAEIAGAHIAKALIAJAMIAIAIIACADIAAACQAAAEgCADQgDADgDAAQgCAAgDgDg");
	this.shape_63.setTransform(294.2,330.8);

	this.shape_64 = new cjs.Shape();
	this.shape_64.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEAAgCgDQgCgEAAgEQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAAEgCADQgDACgEABIgJAAIgWABIgdAAIgfABIgbAAg");
	this.shape_64.setTransform(267.1,330.2);

	this.shape_65 = new cjs.Shape();
	this.shape_65.graphics.f("#006600").s().p("AgKBgQgLAAgGgDQgFgCgBgFQgDgFABgJIAAhCIgFAAIgEAAIgRABIgIAAIgOABIgJAAQgGAAgCgDQgDgDAAgEQAAgEABgDQADgDADgBIACAAIACAAIAGAAIAIAAIAMAAIAUAAIALgBIAAg6IgSAAIgSAAQgGAAgEgCQgDgDAAgFQAAgEACgCQACgDADgBIADgBIAKAAIBEgBIAsgBIALAAIAHgBQAGAAAEADQACADAAAFQAAAEgBADQgDADgEAAIgBAAIgGABIgPAAIgeABIgPABIgQAAIAAA6IARAAIAmgBIAUgBIAMgBIAKAAIAEAAQAIAAAFACQADADAAAGQAAAFgCACQgEACgEABIgLAAIgSAAIgXAAIgjABIgUAAIAABAIABAEIABACIAGAAIAIABIALAAIAUgBIASgBIAFgBIADgFIAEgDIAEgBQAFAAAEAEQADADAAAFQAAAEgDAFQgDAEgFADQgDACgGABQgGABgKAAIgYABIgegBg");
	this.shape_65.setTransform(243.4,331);

	this.shape_66 = new cjs.Shape();
	this.shape_66.graphics.f("#006600").s().p("AhpBwQgCgCAAgDIAAiFQAAgIAEgEQAEgDAHAAIAKAAIgDgLIgDgLIgDgJIgQAAQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAxAAIAAgPQAAgDADgDQACgCAFAAQAEAAADACQADADAAADIAAAPIAvAAQADAAACADQACACAAAEQAAAEgCADQgCACgDAAIgRAAIgEAOIgFARIALAAQAHAAAEADQAEAEAAAIIAAB3QAAALgGAEQgEAEgPAAQgNAAgFgCQgFgCAAgGQAAgEACgDQACgCAEAAIADAAIAGAAIACABIACAAQAGAAACgCQACgBAAgFIAAhqQAAgBAAAAQAAgBgBAAQAAgBAAAAQAAAAgBgBQAAAAAAAAQgBgBAAAAQgBAAAAAAQgBAAAAAAIgcAAIAAAQIAVAAQAEAAABACQACACAAAEQAAADgCACQgBACgEAAIgVAAIAAARIAIAAQAHAAADADQADADAAAHIAAAjQAAANgNAAIggAAQgNAAAAgNIAAgjQAAgHAEgDQADgDAGAAIAIAAIAAgRIgUAAQgDAAgCgCQgCgCAAgDIACgGQACgCADAAIAUAAIAAgQIgbAAQgBAAAAAAQgBAAAAAAQgBAAAAABQgBAAAAAAQAAABAAAAQgBAAAAABQAAAAAAABQAAAAAAABIAAB/QAAADgDACQgCACgEAAQgEAAgDgCgAg9AnIgBADIAAAWIABAEIAEABIARAAIADgBIABgEIAAgWIgBgDIgDgBIgRAAIgEABgAhFg+IADAMIACAJIAdAAIADgMIADgJIACgKIgtAAIADAKgABkBwIgGgGQgJgJgHgJQgHgKgHgMIgPAWQgIALgIAHIgGAGIgFABQgFAAgDgDQgDgDAAgEIABgFIAGgGQALgMAJgLQAIgLAHgOIgKgZIgJgcQgEAJgDAEQgDAEgEAAQgEAAgDgDQgDgCAAgDIAAgDIACgGQAJgWAGgYQAGgYACgYQABgFACgCQADgDAEAAQAFAAACADQADACAAAEIgBALIgDARIA2AAQAEAAACACQACADAAAEQAAAFgCACQgCADgEAAIgHAAQgBATgEATIgIAiQgFARgGANQAGALAKANQAKANALALIAEAFIABAFQgBAEgCADQgDADgFAAIgFgBgAAug0IAAACIgBADIgBADIgBAEQADARAFAQIALAdQAHgTAEgUQAFgUACgUIggAAg");
	this.shape_66.setTransform(219.5,330.8);

	this.shape_67 = new cjs.Shape();
	this.shape_67.graphics.f("#006600").s().p("AhhBxQgEAAgEgDQgDgDAAgFIABgEIAEgGIALgOIAKgSQABgDADgBIAFgCQAFAAADADQADADAAAFIgCAIIgHAMIgJAOQgGAIgEAEQgDACgDAAIgBAAgAgdBwQAAgBgBAAQAAAAgBgBQAAAAgBgBQAAAAAAgBIgBgCIgBgEIgCgRIgEgSIAAgCIAAgBQAAgEADgDQADgDAFAAQAEAAADADQACACACAGIADAOIADAPIABAKQAAAEgDADQgDACgGAAQgDAAgDgBgABbBvQgCgCgDgFIgLgUIgLgQIgCgEIAAgDQAAgEADgDQAEgDAEAAQADAAADACQADACAFAGIALARIAJAPQACAGAAADQAAAEgDADQgEADgFAAQgDAAgDgBgAAdBuQgDgCgBgFIgGgQIgEgKIgDgIIgBgDIAAgDQAAgEADgDQADgCAFgBQAEAAACADQADACADAIIAHAPIAEANIACAIQAAAEgDADQgEADgFAAQgEAAgCgCgAhjAtQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAXAAIAAgoIgcAAQgDAAgDgCQgCgDAAgEQAAgEACgCQACgDAEAAIAcAAIAAgfQgIALgFAEQgFAEgDAAQgFAAgCgDQgDgDAAgEQAAAAAAgBQAAgBAAAAQAAgBAAAAQAAgBABAAIAFgHQAKgKAIgLQAIgKAGgLQABgDADgCQACgBADAAQAEAAADACQADADAAAEQAAACgBADIgGAKICaAAQAEAAACADQACACABAEQAAAFgDACQgCACgEAAIgQAAIAAAnIAYAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAIgYAAIAAAoIATAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAgAAiAbIAcAAIAAgoIgcAAgAgLAbIAbAAIAAgoIgbAAgAg5AbIAcAAIAAgoIgcAAgAAigfIAcAAIAAgnIgcAAgAgLgfIAbAAIAAgnIgbAAgAg5gfIAcAAIAAgnIgcAAg");
	this.shape_67.setTransform(195.3,330.7);

	this.shape_68 = new cjs.Shape();
	this.shape_68.graphics.f("#006600").s().p("AhkBpQgDgDAAgEIAAi7QAAgJAEgEQAFgFAJAAIA6AAQAJAAAEAFQAFAEAAAJIAAAsQAAAJgFAEQgEAEgJAAIg4AAIAAB+QAAAEgDADQgDADgEAAQgFAAgCgDgAhTgrIAxAAIAEgBQAAAAABgBQAAAAAAgBQAAAAAAgBQAAAAAAgBIAAgMIg2AAgAhShaIgBADIAAAMIA2AAIAAgMIgBgDQAAAAAAgBQgBAAAAAAQgBAAAAAAQgBAAgBAAIgsAAQAAAAgBAAQAAAAgBAAQAAAAgBAAQAAABgBAAgAA3BqQgIgCgDgCQgDgCAAgFQAAgFADgDQACgCAFAAIACAAIACAAIAKABIAJAAQAGAAACgBQACgDAAgEIAAhqIg6AAQgJAAgEgEQgEgEAAgJIAAgtQAAgJAEgDQAEgFAJAAIA7AAQAKAAAEAFQAFAFAAAIIAACtQAAANgGAEQgFAGgOgBIgYAAgAAcgwQAAABAAAAQAAABAAAAQABABAAAAQAAABAAAAIAEABIAzAAIAAgRIg4AAgAAdhaQAAAAAAABQAAAAgBAAQAAABAAAAQAAABAAAAIAAAMIA4AAIAAgMQAAAAAAgBQAAAAAAgBQgBAAAAAAQAAgBgBAAQAAAAAAgBQAAAAgBAAQAAAAgBAAQAAAAgBAAIguAAQgBAAAAAAQgBAAAAAAQgBAAAAAAQAAABgBAAgAgjBTQgJAAgFgEQgEgFAAgJIAAg9QAAgIAEgFQAFgEAJAAIBHAAQAIAAAFAEQAEAFAAAIIAAA9QAAAJgEAFQgFAEgIAAgAgiA9QAAABABAAQAAABAAAAQAAABAAAAQABABAAAAIADABIA6AAIAEgBIABgEIAAgTIhEAAgAggAEQAAAAgBABQAAAAAAABQAAAAAAABQgBAAAAABIAAARIBEAAIAAgRQAAgFgFgBIg6AAQAAAAAAABQgBAAAAAAQgBAAAAAAQgBABAAAAg");
	this.shape_68.setTransform(171.3,331.4);

	this.shape_69 = new cjs.Shape();
	this.shape_69.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_69.setTransform(147.2,331.1);

	this.shape_70 = new cjs.Shape();
	this.shape_70.graphics.f("#006600").s().p("AgxBjQgNgGgHgMIgEgKIgBgLIgBgVIABgbIABgeIABgdIABgXIABgEIAAgEIAAgGIgCgGIAAgCIAAgBQAAgGADgCQADgDAGgBQAGABAEAGQAEAFAAAMIAAACIgBAEIAAAKIgDAgIgBAiIgBAgIABAUIABALQABAFACACQAEAGAHAEQAIACALAAQAOAAAKgDQALgFAJgJIAJgLIAJgPIAIgQQACgEACgCQADgBADAAQAFAAAEADQADAEABAFIgEAMIgJAQQgFAKgGAHQgMAQgRAIQgSAHgWABQgTgBgNgGg");
	this.shape_70.setTransform(124.5,330.8);

	this.shape_71 = new cjs.Shape();
	this.shape_71.graphics.f("#006600").s().p("AhiBtQgEgDAAgGQAAgEACgCQACgDAEgBIACAAIAGgBQAxgGAigUQAhgUAVgiIAFgGQADgCADAAQAFABADADQADADABAEQgBAEgFAIQgFAJgKALQgNAPgRAMQgSANgSAJIgTAHIgVAGIgUAEIgRACQgFAAgDgDgAgeArIgLgBIgHgBQgFgBgDgDQgCgCAAgFQAAgFADgDQADgDAEAAIADAAIADABIAKABIAJABQAGAAADgCQACgCAAgFIAAhyQAAgEADgDQADgDAFAAQAEAAADADQADADAAAEIAAB4QAAAOgHAFQgFAFgRAAIgKAAgAhpAVQgDgDAAgGQAAAAAAgBQAAAAAAgBQAAAAAAgBQABAAAAgBIADgFQAMgQAIgSQAJgSAGgUQACgGADgCQACgDAEAAQAFAAADADQADADAAAFIgCAMIgHATIgKAWIgKATQgFAJgGAHIgFAEIgFABQgFAAgDgDgABbASIgFgEIgBgCIgCgFIgLgTIgIgRIgJgQIgMgUIgCgEIgBgDQAAgFADgDQAEgCAEgBQADAAADACIAGAHIALAQIALASIALAVIALAUIABAEIABAEQAAAEgEAEQgDADgFAAIgGgCg");
	this.shape_71.setTransform(99.5,330.8);

	this.shape_72 = new cjs.Shape();
	this.shape_72.graphics.f("#006600").s().p("AgQBjQgQAAgKgCQgJgBgFgCQgJgEgFgGQgFgHAAgJQAAgGAEgHQADgIAHgGIAcgZIAegYIgfgXIgbgVIgTgRIgHgJQgCgFAAgDQAAgGADgDQADgEAFAAQAEAAACACIAEAEQAEAIAKAJQAKALAQANIAoAeIANgKIALgIIALgIIADgDIAEgDIAHgGIAFgHIADgCIAFgBQAFAAADADQAEADAAAGQAAAFgFAFQgFAHgMAIIgcAUIgfAXIgbAXIgUATIgHAIQgCADAAADQAAAEADACQADACAHACIAVABIAiABIAZAAIAQgBIAJgBIAFgDIAEgCIADAAQAFAAADADQADADAAAFQAAADgCADQgCAEgDACQgFACgHABIgSACIgeABIgngBg");
	this.shape_72.setTransform(203.1,288.5);

	this.shape_73 = new cjs.Shape();
	this.shape_73.graphics.f("#006600").s().p("AguBcQgNgIAAgPQAAgQARgNQARgNAfgHIgPgKIgTgMIgGgFQgBgDAAgEQAAgDACgEQADgEAEgEIAYgUIAngdIgBAAIgXABIgZAAIgZABIgUABQgJAAgDgCQgEgDABgFQgBgGADgDQADgCAGAAIACAAIAFAAIAGABIAIAAIAvgBIArgDIADAAIABAAQAHAAAFAEQAFACAAAGIgBAEIgDAFIgCABIgGAEIgRAOIgVARIgTAQIgNALIAPALQAIAFAOAGQARAKALAHQAKAIAFAGQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAFgIAIQgIAHAAAGQAAAGAGADQAGACAPAAQAQAAANgEQANgDAIgGQAIgHAAgIQAAgEgFgEQgEgEgKgHQgVAFgOAFg");
	this.shape_73.setTransform(179.4,289);

	this.shape_74 = new cjs.Shape();
	this.shape_74.graphics.f("#006600").s().p("AghBqQgDgDAAgGQgBgDACgDIAIgFQAMgFAJgHQAIgHAGgIIgYgDQgLgCgIgDQgLgFgIgJQgHgJAAgLQAAgLAHgIQAHgJAMgGQAIgEANgDIAcgFIAAgDIgBgMIAAgGIgcABIgcAAIgXABIgRAAIgKgBIgFgBIgCgDIgBgFQAAgEACgCQACgDADgBIACAAIAFgBIAOAAIARAAIAUAAIAeAAIASgBIAAgMIAAgJQAAgKACgEQACgDAGAAQAGAAADADQACACAAAGIAAAGIAAAIIAAANIAigBIAXgBIABgBIABAAQAEAAADADQADADAAAEQAAAEgCACQgBADgDABIgCABIgFAAIgGAAIgKAAIgPABIgMAAIgMAAIAAANIAAAEIAAAGIABAKIABAUIAAAPQAAAQgBAKQgBAKgEAHQgDAIgGAIQgHAHgJAIQgIAIgJAFQgJAFgFAAQgEAAgDgDgAgIgHQgKACgGADQgHACgEAFQgDAFAAAFQAAAHADAFQAEAFAHACIASAEIAUACIABgMIABgNIAAgFIgBgHIAAgNQgOABgJACg");
	this.shape_74.setTransform(155.4,288.5);

	this.shape_75 = new cjs.Shape();
	this.shape_75.graphics.f("#006600").s().p("Ag2BpQgDgDAAgFIAAgGIABgHIABg/IAAhVIAAgVIABgKIAAgEIAAgBQACgEADgBQACgCADAAIAGABIADADIADAEIABAGIgBAFIAAAjIAAAKIAAANIAZAOIAcAOQAPAGAOAEQAEABACADQACADAAAFQAAAFgEAEQgDAEgFAAIgEgBIgHgDQgUgIgQgKIgfgRIAAAbIgBARIAAALIgBALIAAAWIAAALIgBAGIAAACQgBADgDACQgDACgEAAQgFAAgDgDg");
	this.shape_75.setTransform(133.9,288.4);

	this.shape_76 = new cjs.Shape();
	this.shape_76.graphics.f("#006600").s().p("AgfBQQgDgEAAgFIABgEIADgDIABgBIAEgCQARgLAMgMQANgNAJgPQAKgOAHgUQAIgUAGgbQABgEACgCQADgCAEAAQAEAAADADQADADAAAEIgCAHIgDANIgFAPIgEANQgGARgHANQgHANgIALQgJAMgMALQgMAMgKAIQgKAHgFAAQgFAAgDgDgAgzAGQgCgBgBgDIgEgIIgFgRIgGgRIgEgOIgCgIIgBgCQAAgEADgDQADgDAFAAIAFABIADADIAAACIACAFIADALIADAKIAFAOIAIAVIABADIABACQgBAEgDACQgCADgGAAIgFgBgAgCgHQgDgBgBgDIgEgJIgGgQIgFgQIgFgOIgBgHQAAgDADgDQADgDAEAAQABAAAAAAQABAAABAAQAAAAABABQAAAAABAAQAAABABAAQAAAAABAAQAAABABAAQAAABAAAAIABADIABAEIAEALIAEAPIAGAPIAEAKIABADIAAACQAAAEgDADQgCACgFAAIgEgBg");
	this.shape_76.setTransform(107.7,291.1);

	this.shape_77 = new cjs.Shape();
	this.shape_77.graphics.f("#006600").s().p("Ag5BmQgEgDAAgGIABgFQABgDADgBIABgBIAEgCQAPgIAJgHQAKgIAFgGQAFgIACgJQACgKAAgNIAAgqIgWABIgTAAIgHAAIgJAAQgFAJgHAKQgHAIgJAHIgGAEQAAAAgBABQAAAAgBAAQAAAAgBAAQgBAAAAAAQgGAAgCgDQgDgDAAgFIAAgEIAEgEQAJgHAGgIQAHgIADgIIAEgNIACgPIABgRIgBgLQAAgFADgCQADgCAFgBQAEAAADACQADADABADIAAAMIgBASIgCARIAOAAIAJAAIAqAAIAogCIgIgPIgCgHQAAgEACgCQADgCADAAQABgBABAAQAAAAABABQAAAAABAAQAAAAABABIADAFIAJAPIAJARIAIALIABADIAAADQAAADgCACQgDACgDABQgDAAgDgDQgDgDgDgHIgMABIgMAAIgNABIgJABIAAAqQAAASgCAMQgDAMgGAJQgEAGgHAJQgJAHgLAIIgQAKQgGADgDABQgEgBgDgEgABhgqIgGgHIgKgRIgJgQIgFgJIgBgEQAAgEADgCQACgDAEAAIAEACIAEAFIAGAMIAKAQIAJAPIACADIAAADQAAADgCACQgDADgDAAQgBAAAAAAQgBAAgBAAQAAgBgBAAQAAAAgBgBg");
	this.shape_77.setTransform(84.6,288.5);

	this.shape_78 = new cjs.Shape();
	this.shape_78.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_78.setTransform(59.7,288.1);

	this.shape_79 = new cjs.Shape();
	this.shape_79.graphics.f("#006600").s().p("AAABrIgDgDIgCgDIgDgHIgGgOIgJgVIgKgXIgLgYIgFgLIgFACIgHADIgPAIIgJAEIgHABQgFgBgDgCQgDgDAAgEQAAgFACgCQACgCAEAAIAHgCIAJgEIAGgDIALgFIAEgCIgHgPIgMgYIgKgUIgFgKIgCgEIAAgDQAAgEAEgCQADgDAFgBIAEACQACABAEAGIAJATIASAlIAGAMIAOgHIAVgKIAGgDIgBgNIgBgSIAAgLIAAgJIAAgCQAAgDACgDQADgDAEABQAEAAADABQADACAAADIABAIIABARIABAVQAPgGALgDQALgEAIAAQASAAAJALQAKALAAATQAAAOgHANQgIANgOAMIgNAJIgNAGQgGADgDAAQgFAAgDgDQgCgDgBgFIABgEIADgDIABgBIADgCIAGgCQAMgEAJgIQAJgHAFgJQAFgJAAgKQAAgMgEgEQgEgFgJgBIgKABIgOAFIgTAIIABARIAAAHIAAAFIgBAIIAAADIgEAFQgCACgDgBQgFAAgDgCQgCgDAAgGIgBgMIAAgOIgMAHIgPAGIgHAFIAJARIAVAuIAKAZIAFAMIABAFQAAADgEADQgDAEgEAAIgEgBg");
	this.shape_79.setTransform(477.7,204.5);

	this.shape_80 = new cjs.Shape();
	this.shape_80.graphics.f("#006600").s().p("AAVBuQgDgDAAgEIAAgoIgZAAQgEAAgCgDQgCgDgBgEQABgEACgCQACgDAEAAIAaAAIAAhIQgGARgIAQQgHARgIAPQgJAPgKALQgFAHgDACQgDACgDAAQgEAAgEgEQgCgDAAgEIAAgEIACgEQAMgMAMgRQALgQAKgSQAKgTAHgUIg0AAQgEAAgCgDQgCgDgBgEQABgEACgDQACgCAEgBIA7AAIAAgjQAAgEADgDQADgCAEAAQAFAAADACQADADgBAEIAAAjIBAAAQAEAAADADQABADAAAEQAAAEgBADQgDADgEAAIg4AAIABADQAGAOALARQAKAQAMAQQAMARAMAOIADAEIABAEQAAAFgDADQgEAEgEAAQgDAAgCgCIgGgHQgQgUgOgXQgOgWgKgbIAABLIAdAAQADAAADACQACADAAAEQAAAFgCACQgDADgDAAIgdAAIAAAoQABAEgDADQgDACgFAAQgEAAgDgCgAhMBuQgDgCAAgEIAAh8QgJAPgGAGQgFAGgEAAQgEAAgDgDQgDgDAAgDIAAgEIAEgGQAKgNAJgPQAJgPAIgRQAHgQAFgQQACgHAHAAQAFAAADACQADADAAAEIgCAJIgHAQIgJAUIAAChQAAAEgCACQgDACgFAAQgEAAgDgCg");
	this.shape_80.setTransform(453.5,204.3);

	this.shape_81 = new cjs.Shape();
	this.shape_81.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_81.setTransform(429.4,204.5);

	this.shape_82 = new cjs.Shape();
	this.shape_82.graphics.f("#006600").s().p("AhhBrQgEgEABgEIABgFIADgEIABgBIAFgCQAUgJANgNQANgNAGgQQAHgRACgVIgiAAQgEgBgCgCQgCgDAAgEIAAgBIgBABIgBABIgOALQgFAEgEAAQgFAAgDgEQgDgCgBgFQABgDABgCIAGgGQASgRAPgVQAPgUAIgWQACgGADgCQACgCAEAAQAFAAADADQADADABAEQAAAEgEAIIgIATIgNAWQgHALgKALIB0AAQAFAAAEACQADABAEACQAEADABAFIABAMIgBAaIgCAaIgCAXQgBAJgDAFQgDAKgHAEQgHAEgPAAIgXgBIgQgCQgFgBgCgCQgEgDAAgFQABgFADgDQADgDAGAAIACAAIABAAIAKABIAKABIAKAAQAIAAAEgCQADgCABgGIADgNIACgTIABgUIABgUQgBgEgBgBQgCgCgEABIg1AAQgCAWgFARQgFARgJAOQgKANgOALQgNAKgOAGIgGACIgDABQgFgBgDgDgABbgBIgHgGQgPgPgNgQQgMgQgLgTIgJgRQgDgGAAgDQAAgFAEgDQADgDAEAAQAEAAADACIAFAIQAJARAJANQAHANALALIAYAYIADAFQACADgBADQAAAEgDAEQgDADgEAAQgEAAgDgBg");
	this.shape_82.setTransform(405.5,204.4);

	this.shape_83 = new cjs.Shape();
	this.shape_83.graphics.f("#006600").s().p("AhCBsQgKAAgFgEQgGgGAAgKIAAiNQAAgKAGgFQAFgFAKAAIAsAAIABgCIAFgLIAFgNQACgEACgCQADgDAEAAQAEAAAEAEQADADAAAEQAAACgDAGIgIAQIBDAAQAKAAAGAFQAFAFAAAKIAACNQAAAKgGAGQgFAEgKAAgAhBBTQAAAGAGAAIB3AAQAAAAABAAQABAAAAAAQABgBAAAAQABAAAAgBQACgBAAgDIAAgfIiDAAgAhBAhICDAAIAAghIiDAAgAg/g1QgBABAAAAQAAABAAAAQgBABAAABQAAAAAAABIAAAcICDAAIAAgcQAAgBAAAAQAAgBgBgBQAAAAAAgBQAAAAgBgBQAAAAgBAAQAAAAgBgBQAAAAgBAAQgBAAAAAAIh3AAQgBAAAAAAQgBAAAAAAQgBABAAAAQgBAAAAAAg");
	this.shape_83.setTransform(381.5,203.8);

	this.shape_84 = new cjs.Shape();
	this.shape_84.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_84.setTransform(920.1,204.2);

	this.shape_85 = new cjs.Shape();
	this.shape_85.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_85.setTransform(904,204.2);

	this.shape_86 = new cjs.Shape();
	this.shape_86.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEgBgCgCQgCgDAAgFQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAADgCADQgDAEgEAAIgJABIgWAAIgdAAIgfABIgbAAg");
	this.shape_86.setTransform(884.4,203.6);

	this.shape_87 = new cjs.Shape();
	this.shape_87.graphics.f("#006600").s().p("AhqBmQgEgDAAgGIABgFIAEgEQAIgHAIgKQAIgMAHgNQAHgNAFgOQAEgKADgNIAEgfIABggIAAgGIAAgDIgCgEIgBgBIAAgCQAAgGADgCQAEgEAFAAIAFACIAEADQACADABAFQACAEAAAHQAAASgCASQgCATgDAPQgDAQgEALQgEAOgIAOQgHAOgJANQgIANgIAIIgHAGIgFABQgGAAgDgDgABFBlQgEgDgHgIQgJgLgIgMQgIgNgGgNQgGgNgEgMIgGgcQgDgRgCgRQgCgRAAgOQAAgMAEgGQAEgGAHgBQAEAAADAEQADADAAAEIAAAEIgCADIgBAEIAAADIAAAGQAAAPACARQACARADAQQAEAOAEAMIAMAWIAPAXQAIAKAIAHIAEAEIABAFQAAAFgEAFQgDADgFAAIgBAAQgDAAgEgDgABGggIgGgHIgKgQIgLgUQgEgGAAgCQAAgDADgCQACgCAEgBQABAAAAAAQABAAABAAQAAABABAAQAAAAABABIADAEIAIAPIAJAOIAIAMIABADIABACQAAADgDADQgCACgDAAQgBAAAAAAQgBAAgBAAQAAAAgBAAQAAgBgBAAgABggxIgLgQIgNgVQgFgIAAgCQAAgEADgDQACgBAEAAIAEAAIAEAGIAEAHIAGALIAIAMIAGAJIACADIABAEQAAADgDACQgCACgEAAIAAAAQgDAAgDgEg");
	this.shape_87.setTransform(861,204.4);

	this.shape_88 = new cjs.Shape();
	this.shape_88.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEgBgCgCQgCgDAAgFQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAADgCADQgDAEgEAAIgJABIgWAAIgdAAIgfABIgbAAg");
	this.shape_88.setTransform(836.4,203.6);

	this.shape_89 = new cjs.Shape();
	this.shape_89.graphics.f("#006600").s().p("AAMBnQgCgBgBgFIgBgTIgBgdIAAgkQgTAWgTASQgTASgRANIgOAJQgEADgDgBQgEAAgDgDQgEgDAAgEQAAgDABgDIAEgEIABAAIAHgGQAQgKARgOQAQgOAQgQQAQgQAMgQIAAgRIgFAAIg4AAIgcABQgFAAgDgDQgDgDAAgFIACgGQACgDACgBIACgBIAEAAIAKAAIAHAAIAJAAIAQAAIAYAAIAWAAIAAgnQAAgGACgDQADgCAGAAQAFAAACADQADADABAFIAAAcIAAADIAAADIAAAEIAWAAIAPAAIAIgBIAKAAIAGgBQAEAAADADQADADAAAFQgBAEgCADQgCADgDAAIgOAAIgRABIgSAAIgOABIAAAbIAAASIAAASIABARIAAAYIABAYQgBAGgCAEQgCADgGAAQgFAAgDgDg");
	this.shape_89.setTransform(812.6,204.3);

	this.shape_90 = new cjs.Shape();
	this.shape_90.graphics.f("#006600").s().p("ABUBjIgIgJIgPgTQgKAIgLAFQgMAFgPACQgKACgOABIggACIglABQgLAAgGgDQgFgDAAgGQAAgFADgDQACgDAFgBQAWgiAUgoQATgpARgxQABgEADgDQACgCAFAAQAEAAADADQADADAAAFIgEANIgHAXIgMAeIgNAcIgTAlQgIARgLAQIAHAAIAEAAIAEAAIAagBIAYgCIASgDQAKgCAIgEQAIgEAHgFIgQgXIgHgMIgCgGQAAgGADgDQADgDAFgBQAEAAACACQADACADAHIAMASIAOAUIAPASIALAOIADADIABAEQAAAFgEAEQgDAEgFAAQgDAAgEgCg");
	this.shape_90.setTransform(788.8,204.4);

	this.shape_91 = new cjs.Shape();
	this.shape_91.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEgBgCgCQgCgDAAgFQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAADgCADQgDAEgEAAIgJABIgWAAIgdAAIgfABIgbAAg");
	this.shape_91.setTransform(764.4,203.6);

	this.shape_92 = new cjs.Shape();
	this.shape_92.graphics.f("#006600").s().p("Ag5BnQgEgEAAgFIABgGQABgDADgBIABAAIAEgCQAPgJAJgHQAKgHAFgIQAFgHACgKQACgIAAgNIAAgrIgWAAIgTABIgHAAIgJgBQgFALgHAIQgHAKgJAGIgGAEQAAAAgBABQAAAAgBAAQAAAAgBAAQgBABAAAAQgGgBgCgDQgDgDAAgFIAAgEIAEgEQAJgHAGgIQAHgIADgIIAEgMIACgQIABgRIgBgKQAAgFADgDQADgCAFAAQAEAAADACQADACABADIAAANIgBARIgCASIAOAAIAJAAIAqgBIAogCIgIgPIgCgHQAAgEACgCQADgCADgBQABAAABAAQAAAAABAAQAAABABAAQAAAAABAAIADAGIAJAQIAJAPIAIANIABACIAAACQAAADgCADQgDADgDAAQgDAAgDgDQgDgDgDgGIgMAAIgMABIgNAAIgJAAIAAAsQAAAQgCANQgDAMgGAJQgEAHgHAHQgJAJgLAHIgQAKQgGAEgDgBQgEAAgDgDgABhgpIgGgIIgKgRIgJgQIgFgJIgBgEQAAgDADgDQACgDAEABIAEAAIAEAHIAGALIAKAQIAJAPIACADIAAACQAAAEgCADQgDACgDAAQgBAAAAAAQgBAAgBAAQAAgBgBAAQAAAAgBAAg");
	this.shape_92.setTransform(741.3,204.3);

	this.shape_93 = new cjs.Shape();
	this.shape_93.graphics.f("#006600").s().p("AgQBjQgQgBgKgBQgJgBgFgCQgJgEgFgHQgFgGAAgIQAAgHAEgIQADgHAHgHIAcgYIAegYIgfgXIgbgWIgTgRIgHgJQgCgEAAgEQAAgFADgDQADgDAFAAQAEgBACACIAEAEQAEAIAKAJQAKAKAQANIAoAfIANgKIALgIIALgIIADgDIAEgDIAHgGIAFgHIADgCIAFgBQAFAAADADQAEADAAAFQAAAGgFAGQgFAGgMAHIgcAVIgfAXIgbAXIgUAUIgHAHQgCADAAADQAAAEADACQADADAHABIAVACIAiAAIAZAAIAQgBIAJgCIAFgCIAEgBIADgBQAFAAADADQADADAAAFQAAAEgCADQgCACgDACQgFADgHABIgSACIgeAAIgnAAg");
	this.shape_93.setTransform(715.9,204.3);

	this.shape_94 = new cjs.Shape();
	this.shape_94.graphics.f("#006600").s().p("AguBcQgNgIAAgOQAAgQARgNQARgNAfgJIgPgJIgTgMIgGgGQgBgCAAgEQAAgDACgEQADgEAEgEIAYgTIAngeIgBgBIgXABIgZABIgZACIgUAAQgJAAgDgDQgEgCABgGQgBgFADgCQADgDAGAAIACAAIAFAAIAGAAIAIAAIAvgBIArgCIADAAIABAAQAHAAAFADQAFAEAAAEIgBAGIgDAEIgCABIgGAFIgRANIgVARIgTAQIgNALIAPAMQAIAEAOAHQARAJALAIQAKAGAFAHQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAGgIAGQgIAIAAAHQAAAFAGADQAGACAPABQAQAAANgFQANgDAIgHQAIgGAAgHQAAgFgFgEQgEgFgKgFQgVAEgOAFg");
	this.shape_94.setTransform(692.1,204.8);

	this.shape_95 = new cjs.Shape();
	this.shape_95.graphics.f("#006600").s().p("AgSBkQgJgEgJgJQgEgEgCgDIgBgGQAAgEADgEQAEgDAEAAIAEABIAFAEIALAKQAGAEAEAAQACAAACgCQACgDABgFIADgPIACgWIABgaIAAgTIgCgRIgBgDIgCAAIgBAAIgCAAIgGABIgMAAIgLABIgFAeQgDANgDAKQgDAKgFAJQgGAMgKANQgJAMgLAMIgGAFIgFABQgFgBgEgDQgDgDAAgFQAAgEACgCIAHgIQAJgIAIgKQAIgLAHgLQAGgLACgJIAFgRIADgYIgCAAIgaABIgJAAQgGAAgDgCQgDgDAAgFQAAgFACgDQADgDAFAAIACAAIAEAAIAIAAIAQAAIALAAIABgVIABgWQABgGACgDQADgEAFAAQAFABADACQADADAAAEIAAACIAAADIgBAEIAAAGIgBAKIAAALIgBAJIAMAAIAJgBIAKgBIAEAAIADAAQAGAAAEACQAEACABAGIACALIABATIABAVQAAAXgCASQgCATgDALQgEAMgGAGQgHAGgJAAQgJAAgJgFgABaALIgFgEIgHgHIgRgYIgQgYIgLgUQgEgJAAgEQAAgEADgDQADgDAFAAIAFABIAEADIABACIACAFIANAZIARAZQAJANAJAJIADAFIABADQAAAFgDADQgDAEgFAAIgEgBg");
	this.shape_95.setTransform(668.6,204.3);

	this.shape_96 = new cjs.Shape();
	this.shape_96.graphics.f("#006600").s().p("AgfBVQgDgDAAgFIABgGIADgDIACgBIAEgBQAygSAZgZQAYgXAAghQAAgKgDgGQgDgHgFgEIgJgFIgLgBIgQgBIgYABIgcAAIgfACIgdACIgCABIgBAAQgEAAgDgDQgCgDAAgFIABgFQABgEADgBIADAAIAIgBIAFAAIAKgBIAigBIAigCIAdAAQAhAAAQANQAQANAAAcQAAAcgMAUQgNAWgZATIgSAKIgVALIgTAJQgJACgDAAQgFABgDgEg");
	this.shape_96.setTransform(644.2,205.1);

	this.shape_97 = new cjs.Shape();
	this.shape_97.graphics.f("#006600").s().p("AgsBjQgPgKgNgVQgIATgIAKQgIAKgGAAQgFAAgDgDQgDgDAAgFIABgDIAEgHQAMgPAHgRQAHgSACgRQABgFADgCQACgEAGAAQADABADADQAEADAAAEIgBAGIgDAJIgCAKIALARIANAPQAHAHAHADQAIAEAHAAQAKAAAFgIQAFgIABgMQAAgMgIgOQgHgOgPgQIgFgGQgCgDAAgEIABgFIADgGIAGgLIAOgUIAHgNIAEgIIAAgBIgOACIgOAAIgRAAIgLAAIgGAAIgDgBIgDgDQgCgDAAgDQAAgFADgDQACgDAHAAIAbAAIAVAAIAOgBIACAAIACAAQAJAAAFAEQAEADAAAGQAAADgCAEIgFALIgRAXIgLAUIgFAJIABADIAEAFQAPARAJAQQAJAQAAANQAAAWgMANQgMANgSABQgRAAgRgMgABOBZQgGgFgHgMIgIgOIgHgQIgGgPIgCgKQAAgEADgDQADgCAEgBIAFABIAEADIABADIADAGIAIAVQAFAKAHAKQAFAJAGAGIADADIABAGQAAAEgDADQgEADgEABQgFAAgGgHgABNggIgGgHIgLgOIgQgVQgEgHABgCQgBgEADgCQADgCADgBIAEABIAEAGIAJAMIALAQIAKALQACADAAADQAAAEgCACQgDACgDABIgEgBgABmgzIgGgGIgLgPIgQgVQgEgGAAgCQAAgEADgCQACgCAEgBIADABIAEAGIAGAHIAJAMIAIALIAIAJIACADIAAADQAAAEgCACQgDACgDABIgBAAIgDgCg");
	this.shape_97.setTransform(620.9,203.8);

	this.shape_98 = new cjs.Shape();
	this.shape_98.graphics.f("#006600").s().p("AhXBmQgDgCgBgEIAAgLIgBgWIAAgZIAAgXIAAghIABgiIAAgcIABgPQABgEADgCQADgDAEAAQAFAAADADQACADAAAFIAAAFIAAAHIgCAgIAAAvIAAAmIABAhIABAXIAAACIAAABQAAAEgDADQgDADgFAAQgEAAgDgDgAAKBcQgKgFgJgKQgGgGgDgGQgEgHAAgFQAAgFADgDQADgDAFAAIAFABIADADIABABIACAEQADALAJAHQAJAGALAAQAOAAAKgHQALgHADgNQABgDADgCQADgCADAAQAFAAADADQADADAAAEIgBAJIgFAJQgIANgOAHQgNAHgRABQgMAAgLgFgAA4gHQgEgDAAgFQAAAAAAgBQAAgBABAAQAAgBAAAAQAAgBABAAIAEgFQAHgGADgHQAEgHAAgHQAAgLgLgGQgKgFgSgBQgLAAgJADQgKACgKAEIgEACIgDAAQgEAAgDgDQgDgDAAgFQAAgEADgDQAEgDAIgDQAHgDAKgCQALgBAOAAQASAAAOAFQANAFAIAKQAHAKAAANQAAAMgFALQgGALgJAIIgFADIgFABQgEAAgDgDg");
	this.shape_98.setTransform(596.5,204.2);

	this.shape_99 = new cjs.Shape();
	this.shape_99.graphics.f("#006600").s().p("AhXBmQgDgCgBgEIAAgLIgBgWIAAgZIAAgXIAAghIABgiIAAgcIABgPQABgEADgCQADgDAEAAQAFAAADADQACADAAAFIAAAFIAAAHIgCAgIAAAvIAAAmIABAhIABAXIAAACIAAABQAAAEgDADQgDADgFAAQgEAAgDgDgAAKBcQgKgFgJgKQgGgGgDgGQgEgHAAgFQAAgFADgDQADgDAFAAIAFABIADADIABABIACAEQADALAJAHQAJAGALAAQAOAAAKgHQALgHADgNQABgDADgCQADgCADAAQAFAAADADQADADAAAEIgBAJIgFAJQgIANgOAHQgNAHgRABQgMAAgLgFgAA4gHQgEgDAAgFQAAAAAAgBQAAgBABAAQAAgBAAAAQAAgBABAAIAEgFQAHgGADgHQAEgHAAgHQAAgLgLgGQgKgFgSgBQgLAAgJADQgKACgKAEIgEACIgDAAQgEAAgDgDQgDgDAAgFQAAgEADgDQAEgDAIgDQAHgDAKgCQALgBAOAAQASAAAOAFQANAFAIAKQAHAKAAANQAAAMgFALQgGALgJAIIgFADIgFABQgEAAgDgDg");
	this.shape_99.setTransform(784.6,41.8);

	this.shape_100 = new cjs.Shape();
	this.shape_100.graphics.f("#006600").s().p("AhdBwQgCgDgBgDIAAh+QABgJAEgFQAEgEAJAAIA5AAQAJAAAFAEQAFAFgBAJIAABwQABAMgFAEQgGAFgNgBIgTgBQgGAAgDgDQgDgDAAgFQAAgDADgDQACgCAEgBIACAAIACABIAIAAIAHABQADAAACgCQACgBgBgEIAAgdIg1AAIAAAxQABADgDADQgDACgFAAQgEAAgDgCgAhMAnIA1AAIAAgVIg1AAgAhKgTQAAAAgBABQAAAAAAAAQAAABAAAAQgBABAAAAIAAAQIA1AAIAAgQQAAAAAAgBQAAAAAAgBQAAAAAAAAQgBgBAAAAIgDgBIgrAAIgEABgABEBwIgWgBQgJAAgCgDQgEgDAAgFQAAgFAEgDQACgCAFAAIACAAIACAAIAKABIAKAAQAFAAADgBQABgCAAgGIAAhzQAAgEADgCQADgCAFgBQAEAAADAEQADACAAADIAAB6QAAANgFAFQgGAFgOAAIgDAAgAAZBIQgCgCgBgEIAAhcQAAgDAEgDQACgDAEAAQAFAAADADQADADAAADIAABcQAAAEgDACQgDACgFAAQgEAAgDgCgAhmg4QgDAAgCgDQgCgCgBgEQABgEACgDQACgCADAAIA/AAIgCgDIgCgDIgFgJIgCgCIgBgDIgCgEIAAgDQAAgEACgDQAEgDAEgBIAFACIAFAEIAIAOQADAGAAADQAAADgCACIgEAEIAwAAIAJgQIAGgPQABgEADgCQADgCAEAAQAEAAAEADQADADAAAEQAAAEgDAHIgKASIA6AAQAEAAACACQACADAAAEQAAAEgCACQgCADgEAAg");
	this.shape_100.setTransform(760.7,41.8);

	this.shape_101 = new cjs.Shape();
	this.shape_101.graphics.f("#006600").s().p("AguBcQgNgIAAgPQAAgQARgNQARgNAfgHIgPgKIgTgMIgGgFQgBgDAAgDQAAgEACgEQADgEAEgEIAYgUIAngdIgBAAIgXABIgZAAIgZABIgUABQgJAAgDgCQgEgDABgFQgBgGADgDQADgCAGAAIACAAIAFAAIAGABIAIAAIAvgBIArgDIADAAIABAAQAHAAAFAEQAFACAAAGIgBAEIgDAFIgCABIgGAEIgRAPIgVAQIgTAQIgNALIAPALQAIAFAOAGQARAKALAHQAKAIAFAGQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAFgIAIQgIAHAAAGQAAAGAGADQAGACAPAAQAQAAANgDQANgEAIgGQAIgHAAgIQAAgEgFgEQgEgEgKgHQgVAFgOAFg");
	this.shape_101.setTransform(736.2,42.4);

	this.shape_102 = new cjs.Shape();
	this.shape_102.graphics.f("#006600").s().p("AggBhQgJgLAAgRQAAgOAHgNQAIgLALgJQAMgHAMgBIAJABIAJAEIgCgRIgEgUIAAgCIAAgBQAAgFADgCQADgDAFAAQADAAACACQADACACADIAAABIABAHIADASIACANIACASIAIAHIAGAHIAFADIADADIAAABIABABIAGADIAJAGIAEAEQACADAAADQgBAFgCADQgDADgFAAQgCAAgEgCIgLgIIgEgDIgFgFIgKgJQgGAXgOANQgPAOgTAAQgPAAgKgLgAgFAnQgGAEgFAIQgDAHAAAJQAAAJADAFQAEAFAHAAQANAAAJgMQAKgMABgUIgKgGQgEgBgFAAQgIgBgGAFgAhfAjQgDgEAAgFIAAgEIACgCIAFgFQALgMAKgPQALgQAIgRIgKABIgMAAIgNABIgFAAQgHgBgCgCQgDgDgBgFQAAgDADgDQACgEAEgBIACAAIAEAAIAKAAIAZAAIAKAAIgBgRIgCgMIAAgCIAAAAQAAgFACgDQADgDAGAAQAGAAADAIQADAIAAAQIAAAFIAAAEIAIAAIAKAAIATgBIAOgBIAMgBIgDgKIgBgKQAAgEACgDQADgDAFAAQAEAAACABQACABABADIABACIAAAGQACAPAMAOQAMAOASAKIAEADQACACAAADQgBAEgDAEQgDADgDAAQgFAAgPgKQgIgGgFgFQgHgHgFgIIgHABIgHAAIgGAAIgIABIgUABIgOAAIgQABQgJATgLAUQgLARgOATIgEADIgBACIgDADIgFABQgGAAgDgDg");
	this.shape_102.setTransform(712.9,42.1);

	this.shape_103 = new cjs.Shape();
	this.shape_103.graphics.f("#006600").s().p("AAwBrIgEgEIgFgGIgDgFIgGgEIgRgPIgWgTIgkgdIgDgDIgEgDIgGgGQgFAAgDgCQgEgEAAgFIACgGIAFgFIABgBIADgDIAHgEQASgMAYgSQAWgSAdgZIAFgFIACgGQABgDADgCQACgBAEAAQAGAAADADQAEADAAAGQAAAFgDAEQgCAFgHAFIgUAQIgbAVIgbAWIgZARIANALIAsAjIAcAXIAOANQAEAFABADIABAFQAAAFgDAEQgEAEgFAAIgFgBg");
	this.shape_103.setTransform(688.3,42.2);

	this.shape_104 = new cjs.Shape();
	this.shape_104.graphics.f("#006600").s().p("AggBhQgJgLAAgRQAAgOAIgNQAHgLALgJQAMgHANgBIAIABIAKAEIgDgRIgEgUIAAgCIAAgBQAAgFADgCQADgDAEAAQADAAAEACQACACABADIAAABIACAHIAEASIABANIABASIAJAHIAHAHIAEADIADADIABABIABABIAEADIAKAGIAEAEQACADAAADQAAAFgDADQgDADgEAAQgDAAgFgCIgKgIIgDgDIgGgFIgKgJQgHAXgNANQgPAOgSAAQgQAAgKgLgAgFAnQgGAEgEAIQgEAHgBAJQABAJAEAFQADAFAHAAQANAAAKgMQAIgMADgUIgKgGQgFgBgFAAQgIgBgGAFgAhfAjQgDgEAAgFIABgEIABgCIAEgFQAMgMALgPQALgQAHgRIgKABIgNAAIgMABIgGAAQgFgBgEgCQgDgDAAgFQABgDACgDQACgEAEgBIABAAIAGAAIAKAAIAZAAIAJAAIgBgRIgCgMIgBgCIAAAAQAAgFAEgDQACgDAGAAQAGAAAEAIQACAIAAAQIAAAFIAAAEIAIAAIAKAAIATgBIAOgBIAMgBIgDgKIgBgKQAAgEADgDQADgDAEAAQADAAADABQADABABADIAAACIABAGQABAPAMAOQALAOAUAKIADADQABACAAADQAAAEgCAEQgEADgEAAQgEAAgPgKQgIgGgFgFQgHgHgFgIIgIABIgFAAIgHAAIgIABIgUABIgOAAIgRABQgIATgLAUQgLARgPATIgDADIAAACIgEADIgFABQgGAAgDgDg");
	this.shape_104.setTransform(664.9,42.1);

	this.shape_105 = new cjs.Shape();
	this.shape_105.graphics.f("#006600").s().p("AgcBqQgJgFgJgJIgGgGIgBgGQAAgFADgDQADgEAFAAIAEABIAFAFIALAKQAGAEAEAAQACAAADgCQACgDABgEQACgGABgLIABgYIABgbIAAgLIgBgNIAAgJIgBgCIgBgBIgCAAIgCABIgHAAIgMABIgLAAIgFAeQgCANgEAKQgDALgFAIQgHANgJAMQgJANgMALIgFAFIgFABQgFAAgEgDQgDgEAAgFQAAgDACgDIAHgIQAJgHAIgLQAIgKAGgLQAHgLACgJIAFgSIADgXIgGAAIgRABIgJAAIgEAAIgBAAQgGAAgDgDQgDgCAAgFQAAgGADgDQADgDAGAAIAYABIAHAAIAIgBIABgUIABgWQAAgHADgDQADgDAFAAQAFAAADADQADACAAAFIgBAJIgBAQIgBAUIAMgBIAJAAIALgBIADgBIADAAQAGAAAEADQAEACABAFIACAMIABASIABAWQAAAWgCATQgCASgDAMQgEALgHAGQgFAGgKAAQgJAAgJgEgABPAjIgKgLQgJgLgIgNIgQgXIgKgUQgEgJAAgEQAAgEACgDQADgDAFAAIAFABIAEAEIABABIACAGIANAYIARAZIASAWIADAEIABAFQAAAFgDADQgDADgFAAIgBAAQgDAAgCgCgABOghIgGgGIgLgOIgPgVQgFgHAAgCQABgDACgDQACgCAEAAIAEABIAEAFIAFAIIAJALIAJAMIAHAJIACACIAAADQAAADgCADQgDADgDAAIgEgCgABngzIgGgGIgLgOIgQgVQgEgHAAgCQAAgDADgDQACgCAEAAIAEABIADAFIAGAHIAIAMIAJAMIAIAJIACACIAAADQAAADgDADQgCADgDAAIgBAAIgDgCg");
	this.shape_105.setTransform(641,41.3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_105},{t:this.shape_104},{t:this.shape_103},{t:this.shape_102},{t:this.shape_101},{t:this.shape_100},{t:this.shape_99},{t:this.shape_98},{t:this.shape_97},{t:this.shape_96},{t:this.shape_95},{t:this.shape_94},{t:this.shape_93},{t:this.shape_92},{t:this.shape_91},{t:this.shape_90},{t:this.shape_89},{t:this.shape_88},{t:this.shape_87},{t:this.shape_86},{t:this.shape_85},{t:this.shape_84},{t:this.shape_83},{t:this.shape_82},{t:this.shape_81},{t:this.shape_80},{t:this.shape_79},{t:this.shape_78},{t:this.shape_77},{t:this.shape_76},{t:this.shape_75},{t:this.shape_74},{t:this.shape_73},{t:this.shape_72},{t:this.shape_71},{t:this.shape_70},{t:this.shape_69},{t:this.shape_68},{t:this.shape_67},{t:this.shape_66},{t:this.shape_65},{t:this.shape_64},{t:this.shape_63},{t:this.shape_62},{t:this.shape_61},{t:this.shape_60},{t:this.shape_59},{t:this.shape_58},{t:this.shape_57},{t:this.shape_56},{t:this.shape_55},{t:this.shape_54},{t:this.shape_53},{t:this.shape_52},{t:this.shape_51},{t:this.shape_50},{t:this.shape_49},{t:this.shape_48},{t:this.shape_47},{t:this.shape_46},{t:this.shape_45},{t:this.shape_44},{t:this.shape_43},{t:this.shape_42},{t:this.shape_41},{t:this.shape_40},{t:this.shape_39},{t:this.shape_38},{t:this.shape_37},{t:this.shape_36},{t:this.shape_35},{t:this.shape_34},{t:this.shape_33},{t:this.shape_32},{t:this.shape_31},{t:this.shape_30},{t:this.shape_29},{t:this.shape_28},{t:this.shape_27},{t:this.shape_26},{t:this.shape_25},{t:this.shape_24},{t:this.shape_23},{t:this.shape_22},{t:this.shape_21},{t:this.shape_20},{t:this.shape_19},{t:this.shape_18},{t:this.shape_17},{t:this.shape_16},{t:this.shape_15},{t:this.shape_14},{t:this.shape_13},{t:this.shape_12},{t:this.shape_11},{t:this.shape_10},{t:this.instance_5},{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape},{t:this.instance_4},{t:this.instance_3},{t:this.instance_2},{t:this.instance_1},{t:this.instance}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,9,1055.4,571.2);


(lib.Exp_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_2
	this.instance = new lib.Apple_spawn("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(714.6,129.6,1,1,0,0,0,19.6,21.5);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({_off:true},27).wait(65));

	// Frog_normal
	this.instance_1 = new lib.Frog_normal("synched",29,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(190.3,-24.9,0.11,0.11,0,0,0,30.2,30.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regX:30,regY:30,scaleX:1,scaleY:1,x:201.3,y:419.2,startPosition:34},9).wait(83));

	// Frog_normal
	this.instance_2 = new lib.Frog_normal("synched",29,false);
	this.instance_2.parent = this;
	this.instance_2.setTransform(480.2,-17.3,0.17,0.17,0,0,0,29.9,29.9);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({regX:30,regY:30,scaleX:1,scaleY:1,x:571.2,y:228.8,startPosition:34},9).wait(83));

	// exp_text_1
	this.instance_3 = new lib.exp_text_1("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(1733,314.9,1,1,0,0,0,507.7,288.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({x:541},9,cjs.Ease.quadOut).wait(83));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(173.7,-32.7,2107,639.8);


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

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:2},15,cjs.Ease.quadInOut).wait(1).to({x:1.9},0).wait(1).to({x:1.8},0).wait(1).to({x:1.5},0).wait(1).to({x:1.2},0).wait(1).to({x:0.8},0).wait(1).to({x:0.4},0).wait(1).to({x:0.2},0).wait(1).to({x:0.1},0).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-9.8,-9.5,19.7,19);


(lib.PowerGauge = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{beat_strong:0,beat_normal:15,beat_weak:28,stop:42});

	// mc
	this.instance = new lib.Heart_beat_strong();
	this.instance.parent = this;
	this.instance.setTransform(23.1,22.3,1,1,0,0,0,23.1,22.3);

	this.instance_1 = new lib.Heart_beat_normal();
	this.instance_1.parent = this;
	this.instance_1.setTransform(23.1,22.3,1,1,0,0,0,23.1,22.3);

	this.instance_2 = new lib.Heart_beat_weak();
	this.instance_2.parent = this;
	this.instance_2.setTransform(23.1,22.3,1,1,0,0,0,23.1,22.3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance,p:{mode:"independent",startPosition:undefined}}]}).to({state:[{t:this.instance_1}]},15).to({state:[{t:this.instance_2}]},13).to({state:[{t:this.instance,p:{mode:"single",startPosition:0}}]},14).wait(16));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-0.5,-0.5,47.3,45.7);


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


(lib.Bubble_red_float = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble_red("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,948.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:48.7},119).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,900,97.4,97.4);


(lib.Bubble_float = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,948.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:48.7},119).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,900,97.4,97.4);


(lib.Bubble_blue_float = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble_blue("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,948.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:48.7},119).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,900,97.4,97.4);


(lib.Spider_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bubble_float
	this.instance = new lib.Bubble_blue_float("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(96,456.2,1,1,0,0,0,96,456.2);
	this.instance.filters = [new cjs.ColorFilter(0, 0, 0, 1, 80, 80, 80, 0)];
	this.instance.cache(-2,898,101,101);

	this.instance_1 = new lib.Bubble_blue_break("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(77,437.7,1,1,0,0,0,96,456.2);
	this.instance_1.filters = [new cjs.ColorFilter(0, 0, 0, 1, 80, 80, 80, 0)];
	this.instance_1.cache(-2,-2,101,101);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},119).to({state:[]},13).wait(3));
	this.timeline.addTween(cjs.Tween.get(this.instance).to({_off:true,x:77,y:437.7},119).wait(16));

	// Frog_base
	this.instance_2 = new lib.Spider_normal("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30.1,0.054,0.054,0,0,0,0,1);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(119).to({_off:false},0).to({regY:0.6,scaleX:1,scaleY:1,x:0,y:-29.4},10,cjs.Ease.cubicOut).to({y:0.6},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,900,97.4,97.4);


(lib.Spider = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":7,fear:16,defeated:22});

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

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},7).to({state:[{t:this.fear}]},9).to({state:[{t:this.defeated}]},6).wait(10));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-4.3,0,68.3,55.4);


(lib.Mouse_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bubble_float
	this.instance = new lib.Bubble_blue_float("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(96,456.2,1,1,0,0,0,96,456.2);
	this.instance.filters = [new cjs.ColorFilter(0, 0, 0, 1, 255, 206, 160, 0)];
	this.instance.cache(-2,898,101,101);

	this.instance_1 = new lib.Bubble_blue_break("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(77,437.7,1,1,0,0,0,96,456.2);
	this.instance_1.filters = [new cjs.ColorFilter(0, 0, 0, 1, 255, 206, 160, 0)];
	this.instance_1.cache(-2,-2,101,101);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},119).to({state:[]},13).wait(3));
	this.timeline.addTween(cjs.Tween.get(this.instance).to({_off:true,x:77,y:437.7},119).wait(16));

	// Frog_base
	this.instance_2 = new lib.Mouse_normal("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30.1,0.054,0.054,0,0,0,0,1);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(119).to({_off:false},0).to({regY:0.6,scaleX:1,scaleY:1,x:0,y:-29.4},10,cjs.Ease.cubicOut).to({y:0.6},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,900,97.4,97.4);


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
p.nominalBounds = new cjs.Rectangle(-3.5,-6.1,70.4,66.1);


(lib.Hedgehog_hand_move = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Hedgehog_hand("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(-2.1,-0.2,0.968,0.967);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:-5.2,y:-2.7},12,cjs.Ease.quadInOut).to({x:0.5,y:-2.8},17,cjs.Ease.quadInOut).to({x:-2.1,y:-0.2},20,cjs.Ease.quadInOut).wait(11));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-9,-7,16.2,14.4);


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
	this.instance_2.setTransform(30.1,30.1,0.133,0.133,0,0,0,30,30);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(119).to({_off:false},0).to({regX:29.9,regY:29.9,scaleX:1.46,scaleY:1.68,x:31.1,y:-35.1,mode:"single"},10,cjs.Ease.cubicOut).to({regX:30,regY:30,scaleX:1,scaleY:1,x:30,y:30},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,900,97.4,97.4);


(lib.Frog = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":7,"fear":16,"defeated":22});

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
p.nominalBounds = new cjs.Rectangle(0,0,60,60);


(lib.Cancer_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bubble_float
	this.instance = new lib.Bubble_red_float("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(96,456.2,1,1,0,0,0,96,456.2);

	this.instance_1 = new lib.Bubble_red_break("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(77,437.7,1,1,0,0,0,96,456.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},119).to({state:[]},13).wait(3));
	this.timeline.addTween(cjs.Tween.get(this.instance).to({_off:true,x:77,y:437.7},119).wait(16));

	// Frog_base
	this.instance_2 = new lib.Cancer_base("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30.2,31.5,0.054,0.054,0,0,0,0,1);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(119).to({_off:false},0).to({regY:0.6,scaleX:1,scaleY:1,y:11.4},10,cjs.Ease.cubicOut).to({y:31.4},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,900,97.4,97.4);


(lib.Cancer_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Cancer_eye
	this.instance = new lib.Cancer_eye("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(42.6,20.6,1,1,0,2.7,-177.3,2.5,-1.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regY:-1.8,skewX:0,skewY:-180,x:42.5,y:20.5},14).to({regX:2.4,skewX:-3,skewY:-183,x:42.6},2).to({regX:2.5,skewX:-6.2,skewY:-186.2,x:42.5},18).to({regY:-1.7,skewX:-4.5,skewY:-184.5,x:42,y:20.6},2).to({skewX:-3.5,skewY:-183.5,x:42.5},43).to({skewX:-4.2,skewY:-184.2},2).to({regY:-1.8,skewX:-6.2,skewY:-186.2,y:20.5},18).to({regY:-1.7,skewX:2.2,skewY:-177.8,y:20.6},2).to({regY:-1.8,skewX:0,skewY:-180,y:20.5},28).to({regY:-1.7,skewX:2.2,skewY:-177.8,x:41,y:20.6},3).to({regY:-1.8,skewX:0,skewY:-180,y:20.5},38).to({regY:-1.7,skewX:-4,skewY:-184,x:42,y:20.6},3).to({regY:-1.8,skewX:0,skewY:-180,x:42.5,y:20.5},16).wait(1));

	// Cancer_eye
	this.instance_1 = new lib.Cancer_eye("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(17.5,20.5,1,1,-5.2,0,0,2.5,-1.8);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({rotation:0},14).to({regX:2.6,regY:-1.7,rotation:12.2,x:17.6,y:20.7},2).to({rotation:12.9},18).to({rotation:5.7,x:18.1,y:20.6},2).to({regY:-1.8,rotation:0.7,x:17.6,y:20.5},43).to({regY:-1.7,rotation:10.7,y:20.7},2).to({rotation:12.9},18).to({regY:-1.8,rotation:-1.5,y:20.6},2).to({regX:2.5,rotation:0,x:17.5,y:20.5},28).to({regX:2.6,rotation:-2.5,x:16.1,y:20.6},3).to({regX:2.5,rotation:0,x:16,y:20.5},38).to({regX:2.6,regY:-1.7,rotation:5.7,x:18.1,y:20.6},3).to({regX:2.5,regY:-1.8,rotation:0,x:17.5,y:20.5},16).wait(1));

	// Cancer_cissor_minor
	this.instance_2 = new lib.Cancer_cissor_minor("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(48.6,29.5,1,1,0,0,180,-1.4,2.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(81).to({startPosition:0},0).to({skewX:25.4,skewY:205.4},6).to({skewX:-13,skewY:167},2).wait(10).to({startPosition:0},0).to({skewX:0,skewY:180},2).wait(28).to({startPosition:0},0).to({x:47.1},3).wait(38).to({startPosition:0},0).to({x:48.6},3).wait(17));

	// Cancer_cissor
	this.instance_3 = new lib.Cancer_cissor("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(52.4,26.6,1.225,1.225,0,-15,165,0.3,0.1);

	this.instance_4 = new lib.Cancer_cissor_move("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(54.2,24.6,1.225,1.225,0,-41,139,0.3,0.1);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(81).to({startPosition:0},0).to({skewX:11.7,skewY:191.7,x:52.5,y:26.5},6).to({_off:true,skewX:-41,skewY:139,x:54.2,y:24.6},2).wait(10).to({_off:false,skewX:-15,skewY:165,x:52.4,y:26.6},2).wait(28).to({startPosition:0},0).to({x:50.9},3).wait(38).to({startPosition:0},0).to({x:52.4},3).wait(17));
	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(87).to({_off:false},2).wait(10).to({startPosition:1},0).to({_off:true,skewX:-15,skewY:165,x:52.4,y:26.6,startPosition:0},2).wait(89));

	// Cancer_cissor_minor
	this.instance_5 = new lib.Cancer_cissor_minor("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(11.8,29.5,1,1,0,0,0,-1.4,2.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(16).to({startPosition:0},0).to({regX:-1.3,regY:2.3,rotation:-22,x:11.9,y:29.6},6).to({regY:2.2,rotation:25.5,y:29.4},2).wait(10).to({startPosition:0},0).to({regX:-1.4,rotation:0,x:11.8,y:29.5},2).wait(93).to({startPosition:0},0).to({x:10.3},3).wait(38).to({startPosition:0},0).to({x:11.8},3).wait(17));

	// Cancer_cissor
	this.instance_6 = new lib.Cancer_cissor("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(8,26.6,1.225,1.225,15,0,0,0.3,0.1);

	this.instance_7 = new lib.Cancer_cissor_move("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(7.4,23.6,1.225,1.225,37.3,0,0,0.4,0.1);
	this.instance_7._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(16).to({startPosition:0},0).to({rotation:2.8,x:6.6,y:28.5},6).to({_off:true,regX:0.4,rotation:37.3,x:7.4,y:23.6},2).wait(10).to({_off:false,regX:0.3,rotation:15,x:8,y:26.6},2).wait(93).to({startPosition:0},0).to({x:6.5},3).wait(38).to({startPosition:0},0).to({x:8},3).wait(17));
	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(22).to({_off:false},2).wait(10).to({startPosition:1},0).to({_off:true,regX:0.3,rotation:15,x:8,y:26.6,startPosition:0},2).wait(154));

	// Cancer_body
	this.instance_8 = new lib.Cancer_body_move("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(30,37);

	this.instance_9 = new lib.Cancer_body_base("synched",0);
	this.instance_9.parent = this;
	this.instance_9.setTransform(30,37);
	this.instance_9._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_8,p:{startPosition:0}}]}).to({state:[{t:this.instance_9}]},13).to({state:[{t:this.instance_8,p:{startPosition:5}}]},24).to({state:[{t:this.instance_9}]},41).to({state:[{t:this.instance_8,p:{startPosition:6}}]},24).to({state:[{t:this.instance_9}]},27).to({state:[{t:this.instance_9}]},3).to({state:[{t:this.instance_9}]},38).to({state:[{t:this.instance_9}]},3).wait(17));
	this.timeline.addTween(cjs.Tween.get(this.instance_9).wait(13).to({_off:false},0).to({_off:true},24).wait(41).to({_off:false},0).to({_off:true},24).wait(27).to({_off:false},0).to({x:28.5},3).wait(38).to({startPosition:0},0).to({x:30},3).wait(17));

	// Cancer_foot
	this.instance_10 = new lib.Cancer_foot_move("synched",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(46.9,45.2,1,1,0,3,-177,6.3,0.6);

	this.instance_11 = new lib.Cancer_foot("synched",0);
	this.instance_11.parent = this;
	this.instance_11.setTransform(48.8,48.1,1,1,0,0,180,0.1,0);
	this.instance_11._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_10}]}).to({state:[{t:this.instance_11}]},128).to({state:[{t:this.instance_11}]},3).to({state:[{t:this.instance_11}]},4).to({state:[{t:this.instance_11}]},3).to({state:[{t:this.instance_11}]},27).to({state:[{t:this.instance_11}]},4).to({state:[{t:this.instance_11}]},3).wait(18));
	this.timeline.addTween(cjs.Tween.get(this.instance_11).wait(128).to({_off:false},0).to({x:47.8},3).wait(4).to({startPosition:0},0).to({x:47.5},3).wait(27).to({x:48.8},0).to({regY:0.1,skewX:-27,skewY:153,y:48.2},4).to({regY:0,skewX:0,skewY:180,y:48.1},3).wait(18));

	// Cancer_foot
	this.instance_12 = new lib.Cancer_foot_move("synched",0);
	this.instance_12.parent = this;
	this.instance_12.setTransform(43.9,49.9,1,1,0,19.4,-160.6,7,0.1);

	this.instance_13 = new lib.Cancer_foot("synched",0);
	this.instance_13.parent = this;
	this.instance_13.setTransform(43.1,53.2,1,1,0,0,180,0.1,-0.8);
	this.instance_13._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_12}]}).to({state:[{t:this.instance_13}]},128).to({state:[{t:this.instance_13}]},3).to({state:[{t:this.instance_13}]},4).to({state:[{t:this.instance_13}]},3).to({state:[{t:this.instance_13}]},27).to({state:[{t:this.instance_13}]},4).to({state:[{t:this.instance_13}]},3).wait(18));
	this.timeline.addTween(cjs.Tween.get(this.instance_13).wait(128).to({_off:false},0).to({x:41.9},3).wait(4).to({startPosition:0},0).to({startPosition:0},3).wait(27).to({x:43.1},0).to({regY:-0.7,skewX:-27.2,skewY:152.8,x:43.2,y:53.3},4).to({regY:-0.8,skewX:0,skewY:180,x:43.1,y:53.2},3).wait(18));

	// Cancer_foot
	this.instance_14 = new lib.Cancer_foot_move("synched",0);
	this.instance_14.parent = this;
	this.instance_14.setTransform(48.2,38.7,1,1,0,-6.5,173.5,6.5,-0.3);

	this.instance_15 = new lib.Cancer_foot("synched",0);
	this.instance_15.parent = this;
	this.instance_15.setTransform(48.2,39.7,1,1,0,-15,165,-0.2,-1.7);
	this.instance_15._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_14}]}).to({state:[{t:this.instance_15}]},128).to({state:[{t:this.instance_15}]},3).to({state:[{t:this.instance_15}]},4).to({state:[{t:this.instance_15}]},3).to({state:[{t:this.instance_15}]},27).to({state:[{t:this.instance_15}]},4).to({state:[{t:this.instance_15}]},3).wait(18));
	this.timeline.addTween(cjs.Tween.get(this.instance_15).wait(128).to({_off:false},0).to({x:47.5},3).wait(4).to({startPosition:0},0).to({x:47},3).wait(27).to({x:48.2},0).to({skewX:-32,skewY:148},4).to({skewX:-15,skewY:165},3).wait(18));

	// Cancer_foot
	this.instance_16 = new lib.Cancer_foot_move("synched",0);
	this.instance_16.parent = this;
	this.instance_16.setTransform(14,45.9,1,1,-8.9,0,0,6.3,0.3);

	this.instance_17 = new lib.Cancer_foot("synched",0);
	this.instance_17.parent = this;
	this.instance_17.setTransform(11.7,48.1,1,1,0,0,0,0.1,0);
	this.instance_17._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_16}]}).to({state:[{t:this.instance_17}]},128).to({state:[{t:this.instance_17}]},3).to({state:[{t:this.instance_17}]},4).to({state:[{t:this.instance_17}]},3).to({state:[{t:this.instance_17}]},31).to({state:[{t:this.instance_17}]},3).wait(18));
	this.timeline.addTween(cjs.Tween.get(this.instance_17).wait(128).to({_off:false},0).to({rotation:21.2},3).wait(4).to({startPosition:0},0).to({rotation:0,x:12.2},3).wait(31).to({startPosition:0},0).to({x:11.7},3).wait(18));

	// Cancer_foot
	this.instance_18 = new lib.Cancer_foot_move("synched",0);
	this.instance_18.parent = this;
	this.instance_18.setTransform(18.1,51.8,1,1,-11.5,0,0,7.2,0.3);

	this.instance_19 = new lib.Cancer_foot("synched",0);
	this.instance_19.parent = this;
	this.instance_19.setTransform(17.3,53.2,1,1,0,0,0,0.1,-0.8);
	this.instance_19._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_18}]}).to({state:[{t:this.instance_19}]},128).to({state:[{t:this.instance_19}]},3).to({state:[{t:this.instance_19}]},4).to({state:[{t:this.instance_19}]},3).to({state:[{t:this.instance_19}]},31).to({state:[{t:this.instance_19}]},3).wait(18));
	this.timeline.addTween(cjs.Tween.get(this.instance_19).wait(128).to({_off:false},0).to({regY:-0.7,rotation:25,y:53.3},3).wait(4).to({startPosition:0},0).to({rotation:2},3).wait(31).to({startPosition:0},0).to({regY:-0.8,rotation:0,y:53.2},3).wait(18));

	// Cancer_foot
	this.instance_20 = new lib.Cancer_foot_move("synched",0);
	this.instance_20.parent = this;
	this.instance_20.setTransform(6.2,39.9);

	this.instance_21 = new lib.Cancer_foot("synched",0);
	this.instance_21.parent = this;
	this.instance_21.setTransform(12.2,39.7,1,1,15,0,0,-0.2,-1.7);
	this.instance_21._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_20}]}).to({state:[{t:this.instance_21}]},128).to({state:[{t:this.instance_21}]},3).to({state:[{t:this.instance_21}]},4).to({state:[{t:this.instance_21}]},3).to({state:[{t:this.instance_21}]},31).to({state:[{t:this.instance_21}]},3).wait(18));
	this.timeline.addTween(cjs.Tween.get(this.instance_21).wait(128).to({_off:false},0).to({regX:-0.1,rotation:44.2,x:12.3,y:39.9},3).wait(4).to({startPosition:0},0).to({rotation:18.5,y:39.8},3).wait(31).to({startPosition:0},0).to({regX:-0.2,rotation:15,x:12.2,y:39.7},3).wait(18));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-16.4,3.8,93.3,54.3);


(lib.Cancer = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":7,"fear":16,"defeated":22});

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

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},7).to({state:[{t:this.fear}]},9).to({state:[{t:this.fear}]},6).wait(10));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-17.6,3.5,95.6,55.1);


(lib.Bear_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bear_mouse
	this.instance = new lib.Bear_mouse("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30,43);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(60).to({regY:0.1,scaleY:0.98,y:43.3},0).to({regY:0.3,scaleY:1.84,y:43.5},10,cjs.Ease.quadInOut).to({regY:0,scaleY:1,y:43},11,cjs.Ease.quadInOut).wait(15));

	// Bear_ear
	this.instance_1 = new lib.Bear_ear_move("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(52.3,8.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(96));

	// Bear_ear
	this.instance_2 = new lib.Bear_ear_move("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(7.3,6.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(96));

	// Bear_eye
	this.instance_3 = new lib.Bear_eye("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(48,26);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(55).to({scaleY:0.18},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.18},0).wait(2).to({scaleY:1},0).wait(35));

	// Bear_eye
	this.instance_4 = new lib.Bear_eye("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(12,26);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(55).to({scaleY:0.18},0).wait(2).to({scaleY:1},0).wait(2).to({scaleY:0.18},0).wait(2).to({scaleY:1},0).wait(35));

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
p.nominalBounds = new cjs.Rectangle(-2.5,-2.9,64.7,60);


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


(lib.Area_2 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{start:0,goButtonReady:12,waitToGo:72,goEnd:93});

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

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},4).to({state:[{t:this.goButton}]},8).to({state:[{t:this.goButton}]},60).to({state:[{t:this.instance_1}]},3).to({state:[{t:this.instance_1}]},5).to({state:[{t:this.instance_1}]},13).wait(21));
	this.timeline.addTween(cjs.Tween.get(this.goButton).wait(12).to({_off:false},0).wait(60).to({_off:true,scaleX:1.4,scaleY:1.4,mode:"synched",startPosition:0,loop:false},3).wait(39));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(72).to({_off:false},3).to({scaleX:1.03,scaleY:1.03,x:600.1},5).to({regX:0.1,regY:0.1,scaleX:9.67,scaleY:9.67,x:599.7,y:400.5,alpha:0},13).wait(21));

	// Exp_1
	this.instance_2 = new lib.Exp_1("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(204.8,28,1,1,0,0,0,204.8,28);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(4).to({_off:false},0).wait(68).to({startPosition:70},0).to({x:1392.9,startPosition:27},8).wait(34));

	// AreaAnim
	this.instance_3 = new lib.AreaAnim_2("synched",0,false);
	this.instance_3.parent = this;
	this.instance_3.setTransform(600,450,1,1,0,0,0,600,450);

	this.instance_4 = new lib.AreaAnim_remove_2("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_3}]}).to({state:[{t:this.instance_4}]},72).wait(42));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


(lib.Area_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"start":0,"goButtonReady":12,"waitToGo":72,"goEnd":93});

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

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},4).to({state:[{t:this.goButton}]},8).to({state:[{t:this.goButton}]},60).to({state:[{t:this.instance_1}]},3).to({state:[{t:this.instance_1}]},5).to({state:[{t:this.instance_1}]},13).wait(21));
	this.timeline.addTween(cjs.Tween.get(this.goButton).wait(12).to({_off:false},0).wait(60).to({_off:true,scaleX:1.4,scaleY:1.4,mode:"synched",startPosition:0,loop:false},3).wait(39));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(72).to({_off:false},3).to({scaleX:1.03,scaleY:1.03,x:600.1},5).to({regX:0.1,regY:0.1,scaleX:9.67,scaleY:9.67,x:599.7,y:400.5,alpha:0},13).wait(21));

	// Exp_1
	this.instance_2 = new lib.Exp_1("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(204.8,28,1,1,0,0,0,204.8,28);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(4).to({_off:false},0).wait(68).to({startPosition:70},0).to({x:1392.9,startPosition:27},8).wait(34));

	// AreaAnim
	this.instance_3 = new lib.AreaAnim_1("synched",0,false);
	this.instance_3.parent = this;
	this.instance_3.setTransform(600,450,1,1,0,0,0,600,450);

	this.instance_4 = new lib.AreaAnim_remove("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_3}]}).to({state:[{t:this.instance_4}]},72).wait(42));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


(lib.StatusBar = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// vmaxGauge
	this.vmaxGauge = new lib.VmaxGauge();
	this.vmaxGauge.name = "vmaxGauge";
	this.vmaxGauge.parent = this;
	this.vmaxGauge.setTransform(600.3,28,1,1,0,0,0,100.3,15);

	this.timeline.addTween(cjs.Tween.get(this.vmaxGauge).wait(1));

	// powerGauge_7
	this.powerGauge_7 = new lib.PowerGauge();
	this.powerGauge_7.name = "powerGauge_7";
	this.powerGauge_7.parent = this;
	this.powerGauge_7.setTransform(393.1,28.3,1,1,0,0,0,23.1,22.3);

	this.timeline.addTween(cjs.Tween.get(this.powerGauge_7).wait(1));

	// powerGauge_6
	this.powerGauge_6 = new lib.PowerGauge();
	this.powerGauge_6.name = "powerGauge_6";
	this.powerGauge_6.parent = this;
	this.powerGauge_6.setTransform(341.1,28.3,1,1,0,0,0,23.1,22.3);

	this.timeline.addTween(cjs.Tween.get(this.powerGauge_6).wait(1));

	// powerGauge_5
	this.powerGauge_5 = new lib.PowerGauge();
	this.powerGauge_5.name = "powerGauge_5";
	this.powerGauge_5.parent = this;
	this.powerGauge_5.setTransform(289.1,28.3,1,1,0,0,0,23.1,22.3);

	this.timeline.addTween(cjs.Tween.get(this.powerGauge_5).wait(1));

	// powerGauge_4
	this.powerGauge_4 = new lib.PowerGauge();
	this.powerGauge_4.name = "powerGauge_4";
	this.powerGauge_4.parent = this;
	this.powerGauge_4.setTransform(237.1,28.3,1,1,0,0,0,23.1,22.3);

	this.timeline.addTween(cjs.Tween.get(this.powerGauge_4).wait(1));

	// powerGauge_3
	this.powerGauge_3 = new lib.PowerGauge();
	this.powerGauge_3.name = "powerGauge_3";
	this.powerGauge_3.parent = this;
	this.powerGauge_3.setTransform(185.1,28.3,1,1,0,0,0,23.1,22.3);

	this.timeline.addTween(cjs.Tween.get(this.powerGauge_3).wait(1));

	// powerGauge_2
	this.powerGauge_2 = new lib.PowerGauge();
	this.powerGauge_2.name = "powerGauge_2";
	this.powerGauge_2.parent = this;
	this.powerGauge_2.setTransform(133.1,28.3,1,1,0,0,0,23.1,22.3);

	this.timeline.addTween(cjs.Tween.get(this.powerGauge_2).wait(1));

	// powerGauge_1
	this.powerGauge_1 = new lib.PowerGauge();
	this.powerGauge_1.name = "powerGauge_1";
	this.powerGauge_1.parent = this;
	this.powerGauge_1.setTransform(81.1,28.3,1,1,0,0,0,23.1,22.3);

	this.timeline.addTween(cjs.Tween.get(this.powerGauge_1).wait(1));

	// powerGauge_0
	this.powerGauge_0 = new lib.PowerGauge();
	this.powerGauge_0.name = "powerGauge_0";
	this.powerGauge_0.parent = this;
	this.powerGauge_0.setTransform(29.1,28.3,1,1,0,0,0,23.1,22.3);

	this.timeline.addTween(cjs.Tween.get(this.powerGauge_0).wait(1));

	// keyText
	this.keyText = new cjs.Text("0", "40px 'MS Gothic'", "#660000");
	this.keyText.name = "keyText";
	this.keyText.lineHeight = 42;
	this.keyText.lineWidth = 55;
	this.keyText.parent = this;
	this.keyText.setTransform(965.7,8.8);

	this.timeline.addTween(cjs.Tween.get(this.keyText).wait(1));

	// KeyBase
	this.instance = new lib.KeyBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(918,29,0.744,0.746,0,0,0,12.1,26.8);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	// coinText
	this.coinText = new cjs.Text("999", "40px 'MS Gothic'", "#660000");
	this.coinText.name = "coinText";
	this.coinText.lineHeight = 42;
	this.coinText.lineWidth = 73;
	this.coinText.parent = this;
	this.coinText.setTransform(1117.7,8.8);

	this.timeline.addTween(cjs.Tween.get(this.coinText).wait(1));

	// CoinBase
	this.instance_1 = new lib.CoinBase("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(1048,28,0.744,0.746,0,0,0,12.1,26.8);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(1));

	// x
	this.instance_2 = new lib.x("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(1098.8,30.7,1,1,0,0,0,7.3,8.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(1));

	// x
	this.instance_3 = new lib.x("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(946.8,30.6,1,1,0,0,0,7.3,8.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(5.5,5.5,1186.8,45.7);


(lib.Hedgehog_normal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Hedgehog_nose
	this.instance = new lib.Hedgehog_nose_move("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30,21.6);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(179));

	// Hedgehog_eye
	this.instance_1 = new lib.Hedgehog_eye_move("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(44.9,19.2,1,1,0,0,180,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(179));

	// Hedgehog_eye
	this.instance_2 = new lib.Hedgehog_eye_move("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(14.5,19.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(179));

	// Hedgehog_mouth
	this.instance_3 = new lib.Hedgehog_mouse_move("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(29.7,31.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(179));

	// Hedgehog_hand
	this.instance_4 = new lib.Hedgehog_hand_move("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(53.5,35.8,0.968,1.046,0,0,180,-0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(179));

	// Hedgehog_hand
	this.instance_5 = new lib.Hedgehog_hand_move("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(9.7,37.5);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(179));

	// Hedgehog_Face
	this.instance_6 = new lib.Hedgehog_face_move("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(29.4,28.5);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(179));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-5,-10,68.8,77);


(lib.Hedgehog_fear_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Hedgehog_nose
	this.instance_1 = new lib.Hedgehog_nose_move("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(30,21.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({regX:0.1,regY:0.1,scaleX:23.14,scaleY:10.3,x:27.4,y:-3.1,alpha:0,startPosition:23},23,cjs.Ease.quadOut).wait(1));

	// Hedgehog_eye
	this.instance_2 = new lib.Hedgehog_eye_fear("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(44.9,19.2,1,1,0,0,180,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({scaleX:7.57,scaleY:2.82,skewX:90.6,skewY:270.6,x:166.7,y:-37.5,alpha:0,startPosition:3},23,cjs.Ease.quadOut).wait(1));

	// Hedgehog_eye
	this.instance_3 = new lib.Hedgehog_eye_fear("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(14.5,19.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({regX:-0.1,regY:-0.1,scaleX:5.49,scaleY:7.46,rotation:-35.5,x:-80,y:-2.6,alpha:0,startPosition:3},23,cjs.Ease.quadOut).wait(1));

	// Hedgehog_mouth
	this.instance_4 = new lib.Hedgehog_mouse_fear("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(29.7,31.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({regX:0.1,regY:0.4,scaleX:2.82,scaleY:23.12,x:25.7,y:155.4,alpha:0,startPosition:3},23,cjs.Ease.quadOut).wait(1));

	// Hedgehog_hand
	this.instance_5 = new lib.Hedgehog_hand_move("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(53.5,35.8,0.968,1.046,0,0,180,-0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({scaleX:2.73,scaleY:2.95,skewX:62.5,skewY:242.5,x:211.2,y:88.9,alpha:0,startPosition:23},23,cjs.Ease.quadOut).wait(1));

	// Hedgehog_hand
	this.instance_6 = new lib.Hedgehog_hand_move("synched",0);
	this.instance_6.parent = this;
	this.instance_6.setTransform(9.7,37.5);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({scaleX:2.82,scaleY:2.82,rotation:-85.5,x:-96.6,y:114.4,alpha:0,startPosition:23},23,cjs.Ease.quadOut).wait(1));

	// Hedgehog_Face
	this.instance_7 = new lib.Hedgehog_fear("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(29.4,28.5);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).to({scaleX:2.82,scaleY:7.18,x:27.9,alpha:0,startPosition:3},23,cjs.Ease.quadOut).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-5.6,-10,68.8,77);


(lib.Bear_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bubble_float
	this.instance = new lib.Bubble_blue_float("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(96,456.2,1,1,0,0,0,96,456.2);
	this.instance.filters = [new cjs.ColorFilter(0, 0, 0, 1, 161, 117, 80, 0)];
	this.instance.cache(-2,898,101,101);

	this.instance_1 = new lib.Bubble_blue_break("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(77,437.7,1,1,0,0,0,96,456.2);
	this.instance_1.filters = [new cjs.ColorFilter(0, 0, 0, 1, 161, 117, 80, 0)];
	this.instance_1.cache(-2,-2,101,101);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},119).to({state:[]},13).wait(3));
	this.timeline.addTween(cjs.Tween.get(this.instance).to({_off:true,x:77,y:437.7},119).wait(16));

	// Frog_base
	this.instance_2 = new lib.Bear_normal("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30.1,0.054,0.054,0,0,0,0,1);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(119).to({_off:false},0).to({regY:0.6,scaleX:1,scaleY:1,x:0,y:-29.4},10,cjs.Ease.cubicOut).to({y:0.6},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,900,97.4,97.4);


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
p.nominalBounds = new cjs.Rectangle(-2.5,-2.9,64.7,60);


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
	this.timeline.addTween(cjs.Tween.get(this.instance).wait(129).to({_off:false},0).to({scaleX:1.4,scaleY:1.4},3).to({scaleX:1.03,scaleY:1.03,x:600.1,y:780.1},5).to({_off:true},1).wait(49));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(138).to({_off:false},0).to({regX:0.1,scaleX:9.06,scaleY:9.06,x:600.9,y:-2424.9,mode:"single",startPosition:7},8).to({_off:true},1).wait(40));

	// T
	this.instance_2 = new lib.T_1("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(36.6,165.9,6.512,6.512,-149.8,0,0,-0.1,0);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(34).to({_off:false},0).to({regX:0,scaleX:1,scaleY:1,rotation:0,x:236.4,y:638},10).wait(88).to({startPosition:0},0).to({x:-185.5,y:940.4},5).to({_off:true},1).wait(49));

	// Eye
	this.instance_3 = new lib.Eye("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(668.8,573.3,2.754,2.754,21.7);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(10).to({_off:false},0).to({scaleX:17.63,scaleY:17.63,x:669.1,y:572.5},3).wait(15).to({startPosition:0},0).to({_off:true},1).wait(158));

	// Eye
	this.instance_4 = new lib.Eye("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(742.5,376,2.843,2.843,21.7);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(9).to({_off:false},0).to({scaleX:17.63,scaleY:17.63},3).wait(16).to({startPosition:0},0).to({_off:true},1).wait(158));

	// BodyPart
	this.instance_5 = new lib.BodyPart("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(599.5,461.4,0.44,0.44,21.7);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({scaleX:17.63,scaleY:17.63,x:599.8,y:460.6},4,cjs.Ease.quadOut).wait(24).to({startPosition:0},0).to({_off:true},1).wait(158));

	// TitleAnim_scurve
	this.instance_6 = new lib.TitleAnim_s_no_guide("synched",1,false);
	this.instance_6.parent = this;
	this.instance_6.setTransform(157.7,1187.5,17.625,17.625,21.7,0,0,-2.5,44.8);
	this.instance_6._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(29).to({_off:false},0).wait(1).to({regX:-38.1,regY:91.6,scaleX:16.04,scaleY:16.04,rotation:21.6,x:-441.9,y:1621.5,startPosition:2},0).wait(1).to({scaleX:14.49,scaleY:14.49,x:-158.6,y:1522.4,startPosition:3},0).wait(1).to({scaleX:12.98,scaleY:12.98,x:115.2,y:1426.5,startPosition:4},0).wait(1).to({scaleX:11.56,scaleY:11.56,x:375,y:1335.3,startPosition:5},0).wait(1).to({scaleX:10.22,scaleY:10.22,x:617.6,y:1250.3,startPosition:6},0).wait(1).to({scaleX:9,scaleY:9,x:840.7,y:1172,startPosition:7},0).wait(1).to({regX:-2.5,regY:44.8,scaleX:7.88,scaleY:7.88,x:1440,y:861,startPosition:8},0).wait(1).to({regX:-38.1,regY:91.6,scaleX:7.17,scaleY:7.17,x:989,y:1002.4,startPosition:9},0).wait(1).to({scaleX:6.54,scaleY:6.54,x:940.4,y:914.1,startPosition:10},0).wait(1).to({scaleX:5.97,scaleY:5.97,x:897,y:835.6,startPosition:11},0).wait(1).to({scaleX:5.46,scaleY:5.46,x:858.6,y:765.8,startPosition:12},0).wait(1).to({scaleX:5.02,scaleY:5.02,x:824.4,y:703.7,startPosition:13},0).wait(1).to({scaleX:4.62,scaleY:4.62,x:794.1,y:648.8,startPosition:14},0).wait(1).to({scaleX:4.27,scaleY:4.27,x:767.2,y:600.2,startPosition:15},0).wait(1).to({scaleX:3.96,scaleY:3.96,x:743.5,y:557.1,startPosition:16},0).wait(1).to({regX:-2.5,regY:44.8,scaleX:3.68,scaleY:3.68,x:907.6,y:406.7,startPosition:17},0).wait(1).to({regX:-38.1,regY:91.6,scaleX:3.63,scaleY:3.63,x:728.2,y:512,startPosition:18},0).wait(1).to({scaleX:3.59,scaleY:3.59,x:733.5,y:505.9,startPosition:19},0).wait(1).to({scaleX:3.55,scaleY:3.55,x:738.1,y:500.6,startPosition:20},0).wait(1).to({scaleX:3.51,scaleY:3.51,x:742.3,y:495.9,startPosition:21},0).wait(1).to({scaleX:3.48,scaleY:3.48,x:745.7,y:491.8,startPosition:22},0).wait(1).to({scaleX:3.45,scaleY:3.45,x:748.8,y:488.2,startPosition:23},0).wait(1).to({scaleX:3.43,scaleY:3.43,x:751.5,y:485.2,startPosition:24},0).wait(1).to({scaleX:3.41,scaleY:3.41,x:753.8,y:482.6,startPosition:25},0).wait(1).to({scaleX:3.39,scaleY:3.39,x:755.7,y:480.4,startPosition:26},0).wait(1).to({scaleX:3.38,scaleY:3.38,rotation:21.7,x:757.3,y:478.5,startPosition:27},0).wait(1).to({scaleX:3.37,scaleY:3.37,x:758.6,y:477.1,startPosition:28},0).wait(1).to({scaleX:3.36,scaleY:3.36,x:759.6,y:475.9,startPosition:29},0).wait(1).to({scaleX:3.35,scaleY:3.35,x:760.3,y:475,startPosition:30},0).wait(1).to({scaleX:3.35,scaleY:3.35,x:760.9,y:474.4,startPosition:31},0).wait(1).to({scaleX:3.35,scaleY:3.35,x:761.1,y:474.1,startPosition:32},0).wait(1).to({regX:-2.6,regY:45.1,scaleX:3.35,scaleY:3.35,x:929.9,y:372.5,startPosition:33},0).wait(30).to({startPosition:63},0).to({scaleX:2.1,scaleY:2.1,rotation:21.6,x:722.4,y:381.5,startPosition:67},4).to({regX:-2.5,regY:45.2,scaleX:1.34,scaleY:1.34,rotation:21.7,x:547.8,y:406.7,startPosition:70},8).to({regX:-2.6,regY:45.1,scaleX:1.92,scaleY:1.92,x:632.1,y:376.3},2).wait(26).to({startPosition:70},0).to({y:-387.9},6).to({_off:true},1).wait(49));

	// NAKE
	this.instance_7 = new lib.Nake("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(1477.5,593.8);
	this.instance_7._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(88).to({_off:false},0).to({x:846.8},14,cjs.Ease.quadOut).to({x:930.5},4).wait(1).to({x:918.5},0).wait(23).to({startPosition:0},0).to({x:1518.2},7).to({_off:true},1).wait(49));

	// YFTs
	this.instance_8 = new lib.YFTs("synched",0);
	this.instance_8.parent = this;
	this.instance_8.setTransform(-3.7,-240.2,3.075,3.075,0,0,0,0.1,0.1);
	this.instance_8._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(104).to({_off:false},0).to({regX:0,regY:0,scaleX:0.92,scaleY:0.92,x:239.1,y:204.3},5).wait(1).to({scaleX:1,scaleY:1,x:241.8},0).wait(19).to({startPosition:0},0).to({x:-193.3,y:-238.8},8).to({_off:true},1).wait(49));

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
	this.instance_9.setTransform(597,780.1,1,1,0,0,0,960,540);
	this.instance_9._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_9).wait(111).to({_off:false},0).wait(7).to({mode:"single",startPosition:1},0).wait(20).to({mode:"synched",startPosition:0},0).to({regX:959.9,scaleX:0.83,scaleY:0.83,x:599.8,y:450,startPosition:1},6).to({scaleX:1.01,scaleY:1.01,x:599.9,startPosition:0},32).to({regY:539.9,scaleX:1.02,scaleY:1.02,mode:"single",startPosition:2},2).to({regX:959.8,regY:539.5,scaleX:18.67,scaleY:18.67,x:599.1,y:446.5},8).wait(1));

	// area
	this.instance_10 = new lib.Area_1("single",0);
	this.instance_10.parent = this;
	this.instance_10.setTransform(598.7,783.8,0.038,0.038,0,0,0,612.5,469.4);
	this.instance_10._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_10).wait(111).to({_off:false},0).wait(27).to({startPosition:0},0).to({y:452.7},6).to({regX:613.1,regY:469.6,scaleX:0.11,scaleY:0.11,x:602.7,y:452.8},34).to({regX:602.8,regY:461.9,scaleX:1,scaleY:1,x:602.8,y:461.9},8).wait(1));

	// bg_area
	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape_2.setTransform(600,450);
	this.shape_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.shape_2).wait(111).to({_off:false},0).wait(76));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


(lib.AreaTitle_graphics = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{area_0:0,area_1:14});

	// Area_1
	this.instance = new lib.Area_1("single",0);
	this.instance.parent = this;
	this.instance.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.instance_1 = new lib.Area_2("single",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},14).wait(14));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


(lib.AreaTitle = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"area_0":0,"area_1":14});

	// Area_1
	this.areaTitleAnim_0 = new lib.Area_1();
	this.areaTitleAnim_0.name = "areaTitleAnim_0";
	this.areaTitleAnim_0.parent = this;
	this.areaTitleAnim_0.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.areaTitleAnim_1 = new lib.Area_2();
	this.areaTitleAnim_1.name = "areaTitleAnim_1";
	this.areaTitleAnim_1.parent = this;
	this.areaTitleAnim_1.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.areaTitleAnim_0}]}).to({state:[{t:this.areaTitleAnim_1}]},14).wait(14));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


(lib.Gate_go = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// wave2
	this.instance = new lib.Gate_wave();
	this.instance.parent = this;
	this.instance.setTransform(30,30,0.639,0.639);
	this.instance._off = true;

	this.instance_1 = new lib.Gate_outer();
	this.instance_1.parent = this;
	this.instance_1.setTransform(30.9,30.9,8.494,8.494,0,0,0,0.1,0.1);
	this.instance_1.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},2).to({state:[{t:this.instance_1}]},10).to({state:[]},1).wait(111));
	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2).to({_off:false},0).to({_off:true,regX:0.1,regY:0.1,scaleX:8.49,scaleY:8.49,x:30.9,y:30.9,alpha:0},10,cjs.Ease.quadOut).wait(112));

	// wave
	this.instance_2 = new lib.Gate_wave();
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30,0.738,0.738);

	this.instance_3 = new lib.Gate_outer();
	this.instance_3.parent = this;
	this.instance_3.setTransform(30.9,30.9,8.494,8.494,0,0,0,0.1,0.1);
	this.instance_3.alpha = 0;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_2}]}).to({state:[{t:this.instance_3}]},10).to({state:[]},1).wait(113));
	this.timeline.addTween(cjs.Tween.get(this.instance_2).to({_off:true,regX:0.1,regY:0.1,scaleX:8.49,scaleY:8.49,x:30.9,y:30.9,alpha:0},10,cjs.Ease.quadOut).wait(114));

	// gate
	this.instance_4 = new lib.Gate_base("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({scaleX:39.01,scaleY:39.01,rotation:690.7,x:26.1,y:26,startPosition:23},65).to({regX:29.8,regY:29.8,scaleX:92.15,scaleY:92.15,rotation:720,x:20.4,y:20.4,alpha:0,startPosition:45},32).to({_off:true},1).wait(26));

	// tunnel
	this.instance_5 = new lib.Tunnel("synched",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(0,0,1,1,0,0,0,960,540);
	this.instance_5._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(65).to({_off:false},0).wait(1).to({startPosition:0},0).to({regX:959.9,regY:539.9,scaleX:1.35,scaleY:1.35,x:-0.1,y:-0.1},6).to({regX:960,regY:540,scaleX:2.12,scaleY:2.12,x:0.2,y:0.2},34).to({regX:959.8,regY:539.9,scaleX:18.64,scaleY:18.64,x:-0.1},17).wait(1));

	// area
	this.areaTitle = new lib.AreaTitle_graphics();
	this.areaTitle.name = "areaTitle";
	this.areaTitle.parent = this;
	this.areaTitle.setTransform(0.5,0.7,0.101,0.1,0,0,0,611.3,469.1);
	this.areaTitle._off = true;

	this.timeline.addTween(cjs.Tween.get(this.areaTitle).wait(66).to({_off:false},0).to({regX:611.4,regY:468.9,scaleX:0.14,scaleY:0.14,x:-1.4,y:2.6},6).to({regX:612.8,regY:469.6,scaleX:0.25,scaleY:0.25,x:2.6,y:2.8},34).to({regX:612.7,regY:469.5,scaleX:0.91,scaleY:0.91,x:2.8,y:10.7},7).to({regX:602.7,regY:461.9,scaleX:1,scaleY:1,x:2.7,y:11.9},10).wait(1));

	// bg
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EjRuCLuMAAAkXbMGjdAAAMAAAEXbg");
	this.shape.setTransform(105.9,193.3);
	this.shape._off = true;

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(66).to({_off:false},0).to({_off:true},57).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,60,60);


(lib.Hedgehog_spawn = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Bubble_float
	this.instance = new lib.Bubble_blue_float("synched",0,false);
	this.instance.parent = this;
	this.instance.setTransform(96,456.2,1,1,0,0,0,96,456.2);

	this.instance_1 = new lib.Bubble_blue_break("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(77,437.7,1,1,0,0,0,96,456.2);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},119).to({state:[]},13).wait(3));
	this.timeline.addTween(cjs.Tween.get(this.instance).to({_off:true,x:77,y:437.7},119).wait(16));

	// Frog_base
	this.instance_2 = new lib.Hedgehog_normal("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30.1,0.054,0.054,0,0,0,0,1);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(119).to({_off:false},0).to({regY:0.6,scaleX:1,scaleY:1,x:0,y:-29.4},10,cjs.Ease.cubicOut).to({y:0.6},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,900,97.4,97.4);


(lib.Hedgehog = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{"normal":0,"spawn":7,"fear":16,"defeated":22});

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

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},7).to({state:[{t:this.fear}]},9).to({state:[{t:this.fear}]},6).wait(10));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-5,-10,68.8,77);


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
	this.instance_4.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1));

	// Frog
	this.instance_5 = new lib.Frog();
	this.instance_5.parent = this;
	this.instance_5.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(1));

}).prototype = getMCSymbolPrototype(lib.Enemies, new cjs.Rectangle(-17.6,-10,95.6,77), null);


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
(lib.tsnake_v002 = function(mode,startPosition,loop) {
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
	this.instance_2.setTransform(180.1,263.5,1,1,0,0,0,27.1,27.1);

	this.instance_3 = new lib.SnakeBody();
	this.instance_3.parent = this;
	this.instance_3.setTransform(116.9,264,1,1,0,0,0,27.1,27.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_3},{t:this.instance_2}]}).wait(1));

	// Enemies
	this.instance_4 = new lib.Enemies();
	this.instance_4.parent = this;
	this.instance_4.setTransform(66.6,138.9,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1));

	// Items
	this.instance_5 = new lib.Items();
	this.instance_5.parent = this;
	this.instance_5.setTransform(144.2,104.9);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(1));

	// MainTitle
	this.instance_6 = new lib.MainTitle();
	this.instance_6.parent = this;
	this.instance_6.setTransform(596.1,431.7,1,1,0,0,0,596.1,431.7);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(1));

	// AreaTitle
	this.instance_7 = new lib.AreaTitle("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(596.1,431.7,1,1,0,0,0,596.1,431.7);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(1));

	// Background
	this.instance_8 = new lib.Background();
	this.instance_8.parent = this;
	this.instance_8.setTransform(600,498.7,1,1,0,0,0,600,498.7);

	this.timeline.addTween(cjs.Tween.get(this.instance_8).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(600,450,1200,900);
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
        "MAX_X":20,
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
                "dropItemRate": 0.9,
            },
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
                snake.powerUp(200);
                snake.addBody();
            },
            "Wine": function (game, snake) {
                game.setVmax(Item.VMAX_DURATION);
            },
            "Berry": function (game, snake) {
                snake.removeBody();
            },
        };

        Item = function (map, pos, id) {
            this.init(map, pos, id);
        };

        Item.DROP_LIMITS = {
            "Gate": 1,
            "Key": 1,
            "Coin": 30,
            "Apple": 30,
            "Wine": 1,
            "Berry": 15,
        }

        Item.prototype = new FieldObject();

        Item.LIMIT = 60;
        Item.VMAX_DURATION = 30;

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
        this.power = 1500;
    };

    Snake.prototype = {
        "POWER_MAX": 4000,
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
        "powerUp": function (v) {
            this.power += v;
            if (this.power >= this.POWER_MAX) {
                this.power = this.POWER_MAX;
            }
        },
        "powerDown": function (v, onDead) {
            this.power -= v;
            if (this.power <= 0) {
                onDead();
            }
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
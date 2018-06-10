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
        "spawnItem": function () {

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

        createjs.Ticker.init();
        createjs.Ticker.addEventListener("tick", _.bind(this.mainLoop, this));

        this.area = 0;

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
                }
            }, this);

            mainTitleMc.addEventListener("tick", onMainTitleStopListener);

        },
        "setAreaTitle": function () {

            this.clearTasks();

            var areaTitleMc = cjsUtil.createMc("AreaTitle");
            this.stage.addChild(areaTitleMc);
            areaTitleMc.gotoAndStop(this.area);

            var areaTitleAnim = areaTitleMc.areaTitleAnim;
            var areaTitleEndListener = _.bind(function () {
                if (areaTitleAnim.currentFrame == areaTitleAnim.totalFrames - 1) {
                    this.stage.removeEventListener("tick", areaTitleEndListener);
                    this.stage.removeChild(areaTitleMc);
                    this.createGame();
                }
            }, this);

            var goButtonClickListener = _.bind(function () {
                areaTitleAnim.goButton.removeEventListener("click", goButtonClickListener);
                areaTitleAnim.play();
                this.stage.addEventListener("tick", areaTitleEndListener);
            }, this);


            var onAreaTitleStopListener = _.bind(function () {
                if (areaTitleAnim.currentLabel == "waitToGo") {
                    areaTitleAnim.removeEventListener("tick", onAreaTitleStopListener);
                    areaTitleAnim.stop();
                    areaTitleAnim.goButton.addEventListener("click", goButtonClickListener);
                }
            }, this);

            areaTitleAnim.addEventListener("tick", onAreaTitleStopListener);

        },
        "createGame": function () {

            this.clearTasks();

            this.game = new Game(this.stage, this.area, _.bind(function () {
                this.clearTasks();
                this.area++;
                this.setAreaTitle(this.area);
            }, this), _.bind(function () {
                this.clearTasks();
                this.area = 0;
                this.game.kill();
                this.setMainTitle();
            }, this));

            this.addTask(_.bind(this.game.gameLoop, this.game));

        }
    };

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


(lib.Eye = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#333333").s().p("AgKALQgFgFABgGQgBgFAFgFQAFgFAFABQAGgBAFAFQAFAFgBAFQABAGgFAFQgFAFgGgBQgFABgFgFg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1.5,-1.5,3.1,3.1);


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


(lib.Bubble_body = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#E2EFFF").s().p("AlYFYQiOiOAAjKQAAjICOiQQCQiODIAAQDKAACOCOQCPCQAADIQAADKiPCOQiOCPjKAAQjIAAiQiPg");
	this.shape.setTransform(48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,97.4,97.4);


(lib.One = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#00CC00").s().p("EggjA1vIAAm7QC6gMGOglQGIgsCWgsQDBg+BqiJQBjiPAAkYMAAAhEPI4OAAIAAoLIFXAAQKgAAIXj5QIRj5DmkfIIEAAQgTGVgTIeQgSIcAAGuMAAAA5pQAADbBkCtQBdCoC1BSQAxAVBFAUQCcAsD+AnQFwA4C0AGIAAG7g");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-210.9,-343.8,422,687.7);


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


(lib.KeyBase = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFE537").s().p("AAJEMIgGAAIgGAAQgQAAgLgLQgMgMAAgQIAAkOQgXgJgUgTQgigiAAgwQAAgwAigiQAigiAwAAQAvAAAjAiQAhAiAAAwQAAAwghAiQgUATgXAJIAAB9IA1AAQAMAAAJAJQAKAJAAAOQAAANgKAJQgJAKgMAAIg1AAIAAA4IA1AAQAMAAAJAKQAKAJAAANQAAANgKAKQgJAJgMAAgAgdiyQgMALAAAQQAAAQAMALQALALAPAAQAPAAALgLQALgLAAgQQAAgQgLgLQgLgLgPAAQgPAAgLALg");
	this.shape.setTransform(12,26.8);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,24,53.7);


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


(lib.Gaige = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#0000FF").s().p("Aq6EEIAAoHIV0AAIAAIHg");
	this.shape.setTransform(69.9,26);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,139.7,51.9);


(lib.exp_text_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape.setTransform(697.4,22.9);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_1.setTransform(681.3,22.9);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#006600").s().p("AguBvQgDgDAAgEIABgFIAEgDIADgBIAFgBIARgFIASgFIARgIIgNgLIgNgPIgSAOQgIAFgDAAQgEAAgDgDQgDgDAAgEQAAgDACgDQACgBAGgEQALgHAMgJQAMgKAIgKIgKAAQgJAAgFgFQgDgEAAgHIAAgoQgBgJAFgEQAEgFAJABIBVAAQAJgBAFAFQAEAEAAAJIAAAoQAAAHgEAEQgFAFgJAAIg2AAIgEAHIgGAGIA+AAQAHAAAEADQAFADAAAEIgBAFIgFAHQgHAIgIAHIgTAPIAYAIQAOAFAOACQAFAAADADQACADAAADQAAAFgCADQgEADgFAAIgGgBIgJgBIgKgEQgNgDgKgFQgLgDgLgIQgRAJgPAHIgfAJIgHABIgDABQgEAAgDgDgAATA4QAIAGAHAFQAPgIAIgHQAJgHAAgDIgBgBIgEAAIg5AAIAPAPgAgEgHIABADIADABIBIAAIAFgBIAAgDIAAgLIhRAAgAgDgtQAAAAgBABQAAAAAAAAQAAABAAAAQAAABAAABIAAAJIBRAAIAAgJIAAgEQgBAAAAgBQAAAAgBAAQAAAAgBAAQAAgBgBAAIhJAAQAAAAgBABQAAAAgBAAQAAAAAAAAQgBABAAAAgAhLBwQgDgCAAgFIAAhiIgIAJIgKAIIgEADIgDABQgFgBgDgDQgDgCAAgFIABgEIAEgFIAQgOIASgUQAJgKAEgIQADgDACgCIAEgBQAFAAACACQADADABAEQAAADgEAHIgMAQIAAB4QgBAFgCACQgDACgEAAQgFAAgCgCgAhtguQgCgDAAgEQgBgDACgCQABgCAEgDQANgJALgKQALgKAHgKIAEgDIAEgBQAEAAADADQADADAAAEQAAAEgGAHQgGAHgMAMQgMAMgJAFQgHAGgFABQgEgBgDgDgAgngxQgDgDAAgEIAAgDIACgDIAFgHQAGgJAGgJQAEgKAEgJQABgEACgCQACgBAEAAQAEAAACACQADACAAAFIgBADIgCAIIBoAAQADABACACQACADAAADQAAAEgCADQgCACgDAAIhxAAIgGAMIgIAKIgFAFIgFABQgEAAgCgCg");
	this.shape_2.setTransform(661.9,23);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#006600").s().p("AhQBmQgJgBgFgFQgFgEAAgKIAAijQAAgUATABICgAAQAKgBAFAGQAFAEAAAKIAACjQAAAKgFAEQgFAFgKABgAhMhQQgBABAAAAQAAABgBAAQAAABAAAAQAAABAAABIAACYQAAAAAAABQAAABAAAAQABABAAAAQAAABABAAQACABACAAICQAAQADAAACgBQACgCAAgDIAAiXQAAgBAAAAQAAgBAAgBQgBAAAAgBQgBAAAAgBQgCgBgEAAIiPAAQgBAAgBAAQAAAAgBAAQAAABgBAAQAAAAAAAAgAgjA1QgIABgFgFQgFgFAAgJIAAhGQAAgIAFgFQAFgFAIAAIBFAAQAKAAAEAFQAEAFAAAIIAABGQAAAJgEAFQgEAFgKgBgAgeggQgBAAAAAAQAAABgBAAQAAABAAABQAAAAAAABIAAA4QAAABAAABQAAABAAAAQABABAAAAQAAABABAAQAAAAAAABQABAAAAAAQABAAABAAQAAAAABAAIA0AAQABAAAAAAQABAAABAAQAAAAABAAQAAgBABAAQAAAAAAgBQAAAAABgBQAAAAAAgBQAAgBAAgBIAAg4QAAgBAAAAQAAgBAAgBQgBAAAAgBQAAAAAAAAQgBgBAAAAQgBAAAAgBQgBAAgBAAQAAAAgBAAIg0AAQgBAAAAAAQgBAAgBAAQAAABgBAAQAAAAAAABg");
	this.shape_3.setTransform(637.9,23.2);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_4.setTransform(613.7,22.6);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#006600").s().p("AgZAMIgVAAIgWAAIgQAAIgJgBQgEgBgCgDQgCgDAAgEQAAgEADgEQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAAEgCACQgDADgEABIgJAAIgWABIgdABIgfAAIgbAAg");
	this.shape_5.setTransform(589.7,22.3);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#006600").s().p("AgdBeQgDgDAAgGIABgEIACgDIACgBIAEgDQAXgMATgPQASgQAJgQQAHgLAEgNQAFgOADgQQADgQABgPIgcAAIgsACIgjABIgeAAIACAXIABARIAAAMQAAAGgDADQgDADgGAAQgEAAgCgCQgDgBgBgDIgBgCIAAgGIAAgSIgCgZIgBgYIgBgCIAAgBQABgEADgDQADgDAFAAQAEAAADACQACACABAEIAhAAIAlgBIAkAAIAjgCIAEgEQADgBAEAAQAFAAADAEQADADAAAHIgCASIgDAVIgEAWIgFAUQgGANgGAMQgHAMgIALQgJAKgMAKIgVAQIgSALQgJAFgEAAQgFAAgDgEg");
	this.shape_6.setTransform(565.8,23.6);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#006600").s().p("AhlBkQgDgDAAgGIABgFIADgDQAIgIAIgKQAIgLAIgNQAHgNAFgPQADgJADgOIAEgfIACggIAAgFIgBgEIgBgEIgBgBIAAgCQAAgFADgDQADgDAFAAIAFABIAFAEQACADABAEQABAFAAAGQAAATgCARQgBATgDAQQgDAPgEALQgFAOgHAOQgIAPgIANQgJANgIAIIgGAFIgGACQgFgBgEgDgABLBkQgEgDgHgJQgJgLgIgMQgIgMgHgOQgGgNgDgLIgHgdQgDgQgBgSQgCgQAAgPQAAgLAEgHQADgGAHAAQAEAAAEADQADADAAAFIgBADIgBADIgBAEIgBADIAAAHQAAAPACAQQACARAEAQQADAOAFAMIALAXIAQAWQAIAKAHAHIAEAEIABAGQAAAFgDAEQgEAEgFgBIgBABQgDAAgDgDgAA8grQgHgEgEgHQgEgGAAgJQAAgIAEgHQAFgHAGgEQAHgEAIAAQAIAAAHAEQAHAFAEAGQAEAHAAAIQAAAJgEAGQgEAHgHAEQgHAEgIAAQgIAAgHgEgABAhQQgEAFAAAGQAAAGAEAFQAFAEAGABQAHgBAEgEQAFgFAAgGQAAgGgFgFQgEgEgHgBQgGABgFAEg");
	this.shape_7.setTransform(541.7,23.3);

	this.shape_8 = new cjs.Shape();
	this.shape_8.graphics.f("#006600").s().p("AAiBdIgRgFIgRgHQgJgEgGgEQgRgJgJgMQgJgMAAgOQAAgMAKgPQALgQATgSQASgSAZgSIgmABIgsAAIgrABQgEAAgDgDQgDgDAAgFQAAgDACgCIAEgEIADgBIAFAAIAZAAIAlAAIAlgBIAkgBIAcgBIARgBIACAAQADABADADQADADAAADQAAAFgDADQgCADgEAAIgGAAIgJABIgHAAQgUAMgSANQgSAOgOANQgNAOgIALQgIAMAAAIQgBAPARALQAPALAlAJIADABIACAAIACAAIADgBIACAAIACAAQAEAAADADQADADAAAFQAAAGgFADQgEAEgJAAIgNgCg");
	this.shape_8.setTransform(517.7,23.6);

	this.shape_9 = new cjs.Shape();
	this.shape_9.graphics.f("#006600").s().p("AgxBjQgNgGgHgMIgEgKIgBgMIgBgUIABgbIABgeIABgdIABgXIABgFIAAgCIAAgHIgCgHIAAgBIAAgCQAAgEADgDQADgDAGAAQAGAAAEAFQAEAHAAAKIAAADIgBAEIAAAJIgDAiIgBAiIgBAfIABATIABAMIADAHQAEAHAHACQAIAEALAAQAOAAAKgFQALgEAJgIIAJgMIAJgPIAIgQQACgEACgBQADgDADAAQAFAAAEAFQADADABAFIgEAMIgJARQgFAJgGAIQgMAPgRAHQgSAJgWgBQgTAAgNgGg");
	this.shape_9.setTransform(495.1,23);

	this.shape_10 = new cjs.Shape();
	this.shape_10.graphics.f("#006600").s().p("Ag2BpQgDgDAAgFIAAgGIAAgHIABg/IABhVIAAgVIABgKIAAgEIAAgBQACgEADgBQACgCADAAIAGABIADADIADAEIABAGIgBAFIAAAjIAAAKIAAANIAZAOIAcAOQAPAGAOAEQAEABACADQACADAAAFQAAAFgEAEQgDAEgFAAIgEgBIgHgDQgUgIgQgKIgfgRIAAAbIgBARIAAALIAAALIgBAWIAAALIgBAGIAAACQgBADgDACQgDACgEAAQgFAAgDgDg");
	this.shape_10.setTransform(472,22.9);

	this.shape_11 = new cjs.Shape();
	this.shape_11.graphics.f("#006600").s().p("AgfBQQgDgEAAgFIABgEIADgDIABgBIAEgCQARgLAMgMQANgNAJgPQAKgOAHgUQAIgUAGgbQABgEACgCQADgCAEAAQAEAAADADQADADAAAEIgCAHIgDANIgFAPIgEANQgGARgHANQgHANgIALQgJAMgMALQgMAMgKAIQgKAHgFAAQgFAAgDgDgAgzAGQgCgBgBgDIgEgIIgFgRIgGgRIgEgOIgCgIIgBgCQAAgEADgDQADgDAFAAIAFABIADADIAAACIACAFIADALIADAKIAFAOIAIAVIABADIABACQgBAEgDACQgCADgGAAIgFgBgAgCgHQgDgBgBgDIgEgJIgGgQIgFgQIgFgOIgBgHQAAgDADgDQADgDAEAAQABAAAAAAQABAAABAAQAAAAABABQAAAAABAAQAAABABAAQAAAAABAAQAAABABAAQAAABAAAAIABADIABAEIAEALIAEAPIAGAPIAEAKIABADIAAACQAAAEgDADQgCACgFAAIgEgBg");
	this.shape_11.setTransform(445.7,25.6);

	this.shape_12 = new cjs.Shape();
	this.shape_12.graphics.f("#006600").s().p("Ag5BmQgEgDAAgGIABgFQABgDADgBIABgBIAEgCQAPgIAJgHQAKgIAFgGQAFgIACgJQACgKAAgNIAAgqIgWABIgTAAIgHAAIgJAAQgFAJgHAKQgHAIgJAHIgGAEQAAAAgBABQAAAAgBAAQAAAAgBAAQgBAAAAAAQgGAAgCgDQgDgDAAgFIAAgEIAEgEQAJgHAGgIQAHgIADgIIAEgNIACgPIABgRIgBgLQAAgFADgCQADgCAFgBQAEAAADACQADADABADIAAAMIgBASIgCARIAOAAIAJAAIAqAAIAogCIgIgPIgCgHQAAgEACgCQADgCADAAQABgBABAAQAAAAABABQAAAAABAAQAAAAABABIADAFIAJAPIAJARIAIALIABADIAAADQAAADgCACQgDACgDABQgDAAgDgDQgDgDgDgHIgMABIgMAAIgNABIgJABIAAAqQAAASgCAMQgDAMgGAJQgEAGgHAJQgJAHgLAIIgQAKQgGADgDABQgEgBgDgEgABhgqIgGgHIgKgRIgJgQIgFgJIgBgEQAAgEADgCQACgDAEAAIAEACIAEAFIAGAMIAKAQIAJAPIACADIAAADQAAADgCACQgDADgDAAQgBAAAAAAQgBAAgBAAQAAgBgBAAQAAAAgBgBg");
	this.shape_12.setTransform(422.6,23);

	this.shape_13 = new cjs.Shape();
	this.shape_13.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_13.setTransform(397.7,22.6);

	this.shape_14 = new cjs.Shape();
	this.shape_14.graphics.f("#006600").s().p("AAeBcIgUgGIgSgHQgWgKgLgOQgLgNAAgQQAAgMAKgPQALgQATgSQASgSAagSIgnABIgsAAIgrABQgEAAgDgDQgDgDAAgFQAAgDACgCIAEgEIADgBIAFAAIAZAAIAlAAIAlgBIAkgBIAcgBIARgBIACAAQADABADADQADADAAADQAAAEgDADQgCAEgDAAIgGAAIgJABIgIAAQgUALgSAOQgSAOgOANQgNAOgIALQgIAMAAAIQgBAPARALQAQALAkAJIADABIADAAIABAAIADgBIACAAIACAAQAEAAADADQADADAAAFQAAAGgEADQgFAEgJAAIgPgDgAA/AfIgGgGIgLgPQgLgNgEgHQgFgGAAgCQAAgEADgCQACgDAEAAIAEABIAEAFIAGAJIAJAMIAJALIAGAHIACADIABACQgBAEgCACQgDADgDAAIgBAAIgDgBgABdAKIgGgGIgLgNIgQgVQgEgHAAgCQAAgDACgDQADgCADgBQABAAAAAAQABAAAAABQABAAAAAAQABAAAAABIAEAEIAIAMIAMAPIAKAMIACADIABADQAAADgDADQgCACgDAAIgBAAIgDgBg");
	this.shape_14.setTransform(109.7,305.4);

	this.shape_15 = new cjs.Shape();
	this.shape_15.graphics.f("#006600").s().p("AgkBqQgFAAgDgDQgDgDAAgGQgBgFACgBQACgCAGgDQAVgIAOgIQAMgIALgJQAIgIAEgIQAFgHACgLQABgKABgQQgBgXgBgWQgBgVgDgRIAAgBIAAgCQAAgEAEgDQADgDAGAAQAEAAADADQADADABAEIABAPIABAYIABAbIABAXQAAASgDAOQgDAMgHALQgHALgNAMIgNAJIgRALIgWALIgHADIgEABIgDAAgAg1AQIgEgFIgDgRQgCgKAAgMIAAgRIADgRIACgQIAAgEIAAgCIAAgDIAAgDIAAgBIAAgBQAAgEADgDQAEgCAFAAQAGgBACAFQADAFABAIIAAAEIgCAHIgCARIgBARIAAAOIAAAPIACAKIABAEIAAACQAAAGgDADQgDADgGAAIgGgCg");
	this.shape_15.setTransform(85.9,304.8);

	this.shape_16 = new cjs.Shape();
	this.shape_16.graphics.f("#006600").s().p("AhnBnQgDgEAAgEIAAgDIADgEIAHgHIAXgXIAXgaIAUgaQAJgMAFgKIACgEIACgIIACgPIgRAAIggAAIgWAAIgLAAIAAAAQgEAAgDgDQgDgDAAgEQAAgFADgDQADgDAEAAIADAAIACABIAHAAIAMAAIAhAAIAbAAIABgNIAAgKIAAgJQAAgFADgDQADgCADAAQADAAADABIADAEIABADIABAEIgBAKIgBAQIAAAEIAQAAIAYAAIANgBIAIAAIAHAAIALgBIAGAAQAEAAACABQADABABADIABACIAAADQAAAFgEADQgDADgGgBIgMABIgbABIgLAAIgPAAIgUAAIgBAPIgCAJIgCAHIAHgBIAIgBQANAAANAGQAMAFAIAJIAFAFQAAABAAAAQAAABABAAQAAABAAAAQAAABAAAAQgBAFgDAEQgDADgFAAQgBAAAAAAQgBAAAAAAQgBAAAAAAQgBgBAAAAIgEgEQgGgIgIgFQgIgEgJAAQgHAAgJACQgHACgIAEIgmAvQgTAXgQAQIgGAGIgFABQgEAAgEgDgAAZBlQgKgFgHgKIgIgMQgDgGAAgEQAAgEADgDQACgDAFAAIAEABIAEADIABABIABADQAFAKAHAGQAHAGAHABQAGgBAGgEQAIgEAHgIQAGgIAGgKIADgDIAFgBQAFAAADADQAEADgBAFQAAADgCAFIgIALIgLAMQgJAJgKAEQgJAFgJAAQgKAAgIgFg");
	this.shape_16.setTransform(61.6,304.7);

	this.shape_17 = new cjs.Shape();
	this.shape_17.graphics.f("#006600").s().p("AhYBrQgEAAgDgDQgCgDAAgEQAAgEACgDQADgDAEAAICeAAQADAAABgBQABgBAAAAQAAgBABAAQAAgBAAAAQAAgBAAgBIAAgcIifAAQgDgBgDgCQgCgDAAgEQAAgEACgDQADgCADAAICfAAIAAgbQAAgBAAgBQAAAAAAgBQgBAAAAgBQAAAAgBgBQgBgBgDAAIieAAQgDAAgDgCQgCgDAAgEQAAgEACgDQADgDADAAIBRAAIAAhOQAAgFADgCQADgDADAAQAFAAAEADQACACAAAFIAABOIBAAAQALAAAFAFQAFAFAAAKIAABUQAAALgFAFQgFAFgLAAgAAxghQgDgDAAgFQgBgBAAAAQAAgBAAAAQAAgBABAAQAAAAAAgBIAEgGIAMgRIANgWQACgDADgCQACgCADAAQAFABADADQAEADAAAFQAAADgFAKIgOAWIgJANQgDAEgDACQgDABgDAAQgFAAgDgDgAg5gfIgEgDIgBgBIgCgEIgXglIgBgFIgBgEQAAgEADgDQADgDAFAAQAEAAACABIAFAHIAVAgQAGALAAADQAAAFgDADQgEADgFAAIgFgBg");
	this.shape_17.setTransform(37.7,304.4);

	this.shape_18 = new cjs.Shape();
	this.shape_18.graphics.f("#006600").s().p("AAVBuQgDgDAAgEIAAgoIgZAAQgDAAgDgDQgCgDAAgEQAAgEACgCQACgDAEAAIAaAAIAAhIQgGARgIAQQgGARgKAPQgIAPgKALQgGAHgDACQgCACgDAAQgEAAgDgEQgDgDgBgEIABgEIADgEQAMgMALgRQAMgQAKgSQAJgTAIgUIg1AAQgEAAgCgDQgDgDABgEQgBgEADgDQACgCAEgBIA7AAIAAgjQAAgEADgDQADgCAFAAQAEAAADACQACADABAEIAAAjIBAAAQADAAADADQACADAAAEQAAAEgCADQgDADgDAAIg5AAIABADQAHAOAKARQAJAQANAQQAMARAMAOIADAEIABAEQAAAFgDADQgEAEgEAAQgCAAgDgCIgGgHQgRgUgNgXQgNgWgLgbIAABLIAdAAQAEAAACACQACADAAAEQAAAFgCACQgCADgEAAIgcAAIAAAoQgBAEgCADQgDACgEAAQgFAAgDgCgAhMBuQgCgCAAgEIAAh8QgKAPgGAGQgFAGgEAAQgEAAgDgDQgDgDAAgDIABgEIADgGQAKgNAJgPQAJgPAHgRQAIgQAGgQQABgHAIAAQAEAAADACQADADAAAEIgCAJIgGAQIgJAUIAAChQAAAEgDACQgDACgEAAQgFAAgDgCg");
	this.shape_18.setTransform(14,304.8);

	this.shape_19 = new cjs.Shape();
	this.shape_19.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_19.setTransform(834.8,554.8);

	this.shape_20 = new cjs.Shape();
	this.shape_20.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_20.setTransform(818.7,554.8);

	this.shape_21 = new cjs.Shape();
	this.shape_21.graphics.f("#006600").s().p("AAwBrIgEgEIgFgGIgDgFIgGgEIgRgPIgWgTIgkgdIgDgDIgEgDIgGgGQgFAAgDgCQgEgEAAgFIACgGIAFgFIABgBIADgDIAHgEQASgMAYgSQAWgSAdgZIAFgFIACgGQABgDADgCQACgBAEAAQAGAAADADQAEADAAAGQAAAFgDAEQgCAFgHAFIgUAQIgbAVIgbAWIgZARIANALIAsAjIAcAXIAOANQAEAEABAEIABAFQAAAFgDAEQgEAEgFAAIgFgBg");
	this.shape_21.setTransform(799,555.2);

	this.shape_22 = new cjs.Shape();
	this.shape_22.graphics.f("#006600").s().p("AhkBpQgEgDAAgDIAAi8QAAgJAFgEQAFgFAJAAIA6AAQAJAAAEAFQAFADAAAJIAAAqQAAAJgFAEQgEAFgJAAIg4AAIAACBQgBADgCADQgDADgFAAQgEAAgCgDgAhTgtIAxAAQABAAABAAQAAAAABAAQAAgBABAAQAAAAABAAIABgEIAAgMIg3AAgAhShaIgBADIAAALIA3AAIAAgLIgBgDQgBgBAAAAQgBAAAAgBQgBAAAAAAQgBAAgBAAIgsAAQgBAAAAAAQgBAAgBAAQAAABAAAAQgBAAAAABgAA5BqQgHgBgDgDQgCgDAAgEQAAgFADgCQADgDAEgBIACAAIADABIAHABIAIAAQAFABACgDQACgBAAgFIAAhsIg5AAQgJAAgFgFQgEgEAAgJIAAgqQAAgJAEgEQAEgEAKAAIA8AAQAIAAAFAFQAFAEAAAJIAACtQAAAIgCAEQgBAFgEACQgDACgFABIgQABIgRgBgAAcgyIABAEQAAAAABAAQAAAAABABQAAAAABAAQAAAAABAAIAzAAIAAgRIg4AAgAAdhaIgBADIAAALIA4AAIAAgLQAAgBAAAAQAAgBAAAAQAAgBAAAAQgBAAAAAAQAAgBgBAAQAAAAAAgBQgBAAAAAAQgBAAAAAAIgvAAQgBAAAAAAQgBAAAAAAQgBABAAAAQgBAAAAABgAg+BkQgDgDAAgEIABgEIAFgFQAKgHAFgJQAGgKACgMIgdAAQgDABgCgDQgCgDAAgDQAAgEACgCQACgCADgBIAeAAIAAgdIgYAAQgCAAgCgCQgCgDAAgEQAAgCACgDQACgCACAAIB1AAQAEAAABACQACACAAAEQAAAEgCACQgBACgEAAIgVAAIAAAdIAbAAQADABACACQACADAAADQAAADgCADQgCADgDgBIgbAAIAAAwQgBADgCADQgDACgEAAQgEAAgDgCQgCgDAAgDIAAgwIgjAAQgCALgCAHQgCAIgEAHIgJAMQgFAFgFADQgGAEgDAAQgEAAgDgDgAgRAdIAjAAIAAgdIgjAAg");
	this.shape_22.setTransform(775.3,555.4);

	this.shape_23 = new cjs.Shape();
	this.shape_23.graphics.f("#006600").s().p("AgcBqQgJgFgJgJIgGgGIgBgGQAAgFADgDQADgEAFAAIAEABIAFAFIALAKQAGAEAEAAQACAAADgCQACgDABgEQACgGABgLIABgYIABgbIAAgLIgBgNIAAgJIgBgCIgBgBIgCAAIgCABIgHAAIgMABIgLAAIgFAeQgCANgEAKQgDALgFAIQgHANgJAMQgJANgMALIgFAFIgFABQgFAAgEgDQgDgEAAgFQAAgDACgDIAHgIQAJgHAIgLQAIgKAGgLQAHgLACgJIAFgSIADgXIgGAAIgRABIgJAAIgEAAIgBAAQgGAAgDgDQgDgCAAgFQAAgGADgDQADgDAGAAIAYABIAHAAIAIgBIABgUIABgWQAAgHADgDQADgDAFAAQAFAAADADQADACAAAFIgBAJIgBAQIgBAUIAMgBIAJAAIALgBIADgBIADAAQAGAAAEADQAEACABAFIACAMIABASIABAWQAAAWgCATQgCASgDAMQgEALgHAGQgFAGgKAAQgJAAgJgEgABPAjIgKgLQgJgLgIgNIgQgXIgKgUQgEgJAAgEQAAgEACgDQADgDAFAAIAFABIAEAEIABABIACAGIANAYIARAZIASAWIADAEIABAFQAAAFgDADQgDADgFAAIgBAAQgDAAgCgCgABOghIgGgGIgLgOIgPgVQgFgHAAgCQABgDACgDQACgCAEAAIAEABIAEAFIAFAIIAJALIAJAMIAHAJIACACIAAADQAAADgCADQgDADgDAAIgEgCgABngzIgGgGIgLgOIgQgVQgEgHAAgCQAAgDADgDQACgCAEAAIAEABIADAFIAGAHIAIAMIAJAMIAIAJIACACIAAADQAAADgDADQgCADgDAAIgBAAIgDgCg");
	this.shape_23.setTransform(751.6,554.3);

	this.shape_24 = new cjs.Shape();
	this.shape_24.graphics.f("#006600").s().p("Ag5BqQgDgDAAgEQAAgBAAAAQAAgBAAgBQABAAAAgBQAAAAABgBIACgDIACgBIAFgBQAKgDAIgGQAIgFAFgHIgLACIgMADIgLABIgIABQgEAAgCgCQgCgDAAgEQgBgDACgCQABgCADgBIACgBIADAAIAKgBIANgBIANgCIAJgCIABgFIAAgHIgsAAQgDAAgCgCQgCgCAAgEQAAgDACgCQACgCADAAIAsAAIAAgPIguAAQgDAAgCgDQgCgCAAgEQAAgCACgCQACgCADgBIAuAAIAAgQIg4AAQAAAbgCAYQgDAYgEAQIgGASIgHAPQgBADgDABQgCACgDAAQgEAAgEgDQgDgDgBgEIABgDIABgDQAIgOAEgRQAEgQACgWQACgWABgcIAAgeQgBgJAEgEQAFgFAKAAICZAAQAIAAAEAEQAEAEAAAIIAAAVQAAAQgQAAIggAAIAAAQIAyAAQADABACACQACACAAADQAAADgCADQgCACgDAAIgyAAIAAARIAuAAQAEAAACACIABAGIgBAFQgCACgEABIguAAIAAARIA1AAQADAAACACQACADAAAEQAAADgCADQgCACgDAAIg1AAIAAAYQAAAEgCACQgEACgEAAQgEAAgDgCQgCgCAAgEIAAh7IgZAAIAAA5QAAASgDAMQgEAMgFAIQgIAIgIAGQgKAGgKADIgFABIgDABQgFAAgDgDgAhDg6QAAABgBAAQAAAAAAABQAAAAAAABQAAAAAAABIAAAOICPAAIACgBQAAAAABAAQAAgBAAAAQAAAAAAgBQAAAAAAgBIAAgLQAAAAAAgBQAAAAAAgBQAAAAAAAAQgBgBAAAAIgCgBIiLAAIgDABgAhghaQgEAAgCgCQgDgDABgEQAAgEABgCQADgCAEgBIDHAAQAEAAACADQACACABAEQgBAEgCADQgCACgEAAg");
	this.shape_24.setTransform(727.2,555.4);

	this.shape_25 = new cjs.Shape();
	this.shape_25.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_25.setTransform(703.2,555.1);

	this.shape_26 = new cjs.Shape();
	this.shape_26.graphics.f("#006600").s().p("ABPBXQgGgDgFgFIgRgVIgXgdIgXgfIgWgeIgQgXIgCgEIgBgBIgBABIgBADIgHAQIgIAUIgJATIgIAOQgDAFgFAEQgFAEgFAAQgEAAgEgEQgDgDAAgFIABgFIAEgDIADgEIAEgEIAIgPIAJgTIAKgUIAIgTQACgHAFgEQAEgEAFAAQADAAAEACIAGAGIACADIACAEIAGAJIAVAgIAaAjIAbAiQAMAQAMAMIABABIABABIADADIAFACIADAEQACACgBAEQAAAFgCADQgEADgEAAQgEAAgGgEg");
	this.shape_26.setTransform(679.2,555.6);

	this.shape_27 = new cjs.Shape();
	this.shape_27.graphics.f("#006600").s().p("AhJBsQgEgDAAgGQAAgGAEgDQAEgDAFAAIABAAQAGAAAKgEQALgFAMgIIAYgSQAMgLAKgLIAMgPIANgTQAGgKADgHQABgDADgCQACgCAEAAQAEAAAEADQADADAAAFQAAAEgFAJIgNAVIgRAXIgQASQgKAKgMAIQgKAJgNAIQgMAIgLAFIgJAEIgJAAQgJAAgEgCgAgXADIgSAAIgWgCIgTgBIgPgCQgEgBgCgDQgCgDAAgEQAAgEADgEQADgDAEAAIACAAIAFABIATADIAYACIAXABQAGAAADACQAEADAAAGIgCAFIgEADIgDABIgFAAgAA+goIgGgGIgOgQIgKgOIgFgGIgBgEQAAgEACgBQADgDADAAQAAAAABAAQABAAAAAAQABAAAAAAQAAABABAAIAEAFIAIAJIALAOIALANIACACIABACQgBAEgCACQgDADgDAAIgEgBgAgdg2IgVgDIgVgEIgSgEIgDgBIgCgBQgDgBgBgCQgCgDAAgEQAAgEADgEQAEgDAEAAIACAAIAFACIAUAFIAZAEIAYACQAGABADADQADACAAAGQAAAEgDADQgEACgFABIgQgBgABeg2IgDgEIgNgOIgLgOIgHgJIgDgDQAAgBAAAAQAAAAAAgBQAAAAAAAAQAAgBAAAAQAAgDACgDQADgCADAAIAEABIAEAEIAPASIAPARQADADAAADQAAADgDADQgCADgEAAIgDAAg");
	this.shape_27.setTransform(656.2,554.3);

	this.shape_28 = new cjs.Shape();
	this.shape_28.graphics.f("#006600").s().p("AgZAMIgVAAIgWAAIgQAAIgJgBQgEgBgCgDQgCgDAAgEQAAgEADgEQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAAEgCACQgDADgEABIgJAAIgWABIgdABIgfAAIgbAAg");
	this.shape_28.setTransform(631.1,554.2);

	this.shape_29 = new cjs.Shape();
	this.shape_29.graphics.f("#006600").s().p("Ag1BhQgDgDAAgFQgBgEACgDQACgCAGgDQAPgJAKgIQAJgIAEgJQAEgIAAgLIAAgdIgOABIghAAIgOABIgNAAIgGAAIgGAAQAAAAAAgBQgBAAAAAAQgBAAAAgBQgBAAAAgBIgCgDIgBgEIACgGIADgEIADgBIAHAAIAGAAIARAAIANAAIAPAAIALAAIALAAIAQgBIAZgBIAmgCIADAAIAEAAIANABQAEABACADIABADIABADQAAAEgCADQgCADgDABIgBAAIgDAAIgHAAIgQAAIglABIgMAAIAAAdQAAAKgBAIQgBAIgDAGQgDAGgGAFQgFAIgKAIQgKAIgIAFQgJAFgFAAQgEAAgDgEgAg9hPQgDgDAAgFQAAgDABgCQACgDADgBIACgBIADAAIAqgBIAlgBIAcgBIABAAQADAAADADQADADAAAEQAAAEgCADQgDADgEABIgSABIgcABIgfAAIggABQgEAAgDgDg");
	this.shape_29.setTransform(607.3,555.4);

	this.shape_30 = new cjs.Shape();
	this.shape_30.graphics.f("#006600").s().p("AhcBgQgDgEAAgFIABgEIACgDIABgBIAGgEQASgLARgMQARgNANgOQAOgNAJgNQAKgMAHgNIANgZQAGgMADgLIgXACIgaAAIgcABIgYAAQgFAAgDgCQgDgDABgFQgBgEACgDQACgDADgBIACAAIAEAAIAKAAIAkAAIAhgBIAagBIAFgDIAFgBQAFAAAEADQADAEAAAGIgCAHIgDAKIgJASQgKAVgKARQgLARgMAPIAeAUIAZARIAXARQAFAFAAAGQAAAFgDAEQgEADgFABIgEgBIgEgDIgSgPIgbgUIgggXIgZAYIgYAUIgVAOQgJAFgEAAQgFAAgDgDg");
	this.shape_30.setTransform(583.3,555.3);

	this.shape_31 = new cjs.Shape();
	this.shape_31.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_31.setTransform(559.2,555.1);

	this.shape_32 = new cjs.Shape();
	this.shape_32.graphics.f("#006600").s().p("Ag5BtQgDgDAAgFIABgEIADgEIABgBIAFgCQAigZAQgfQAQghAAgsIAAgLIgWAAIgHAUIgHAQIgIANIgFAGQgDACgEgBQgEAAgDgCQgDgDAAgEIABgDIADgGQALgTAJgUQAIgWAFgXQABgGACgCQADgDAEAAQAEAAADADQADACAAAFIgBAGIgDALIgDALIBbAAQAHgBAEAEQAEADABAHQgBAFgDALQgEAMgGAOIgIAQQgDAEgDACQgDADgDAAQgFAAgDgEQgDgCAAgDIAAgEIADgFIAIgPIAHgQIADgKQAAAAAAAAQAAgBAAAAQAAAAgBAAQAAgBAAAAIgDAAIgrAAIAAAKQAAAsARAhQARAhAiAYQAEACABACQACADAAADQgBAEgDAEQgDADgFAAIgFgBIgGgEQgXgQgQgYQgPgYgHgfQgFAZgMATQgKAUgSARQgKAKgIAFQgIAFgFAAQgFAAgDgDgAhiBsQgFAAgDgDQgDgEAAgEIAAgFIAEgGQAIgNAJgSIAQgmQACgFACgCQADgCADAAQAFAAAEACQADADAAAFIgDAKIgGARIgJAVIgIARQgIAOgEAGQgFAFgEAAIgBAAgAhHglQgDgCgDgFIgHgKIgJgOIgIgLIgCgEIgBgEQAAgEAEgEQADgDAEABIAFAAQACACAEAEIALAOIANAVQAEAGAAAEQAAAEgEAEQgDADgFAAQgDAAgCgCg");
	this.shape_32.setTransform(535.5,554.8);

	this.shape_33 = new cjs.Shape();
	this.shape_33.graphics.f("#006600").s().p("AgQBjQgQAAgKgCQgJgBgFgCQgJgEgFgGQgFgHAAgJQAAgGAEgHQADgIAHgHIAcgYIAegYIgfgWIgbgWIgTgRIgHgJQgCgFAAgDQAAgGADgDQADgEAFAAQAEAAACACIAEAEQAEAIAKAKQAKAKAQANIAoAeIANgKIALgIIALgIIADgDIAEgDIAHgGIAFgHIADgCIAFgBQAFAAADADQAEADAAAGQAAAFgFAFQgFAHgMAIIgcAUIgfAXIgbAXIgUATIgHAIQgCADAAADQAAAEADACQADACAHACIAVABIAiABIAZAAIAQgBIAJgBIAFgDIAEgCIADAAQAFAAADADQADADAAAFQAAADgCADQgCAEgDACQgFACgHABIgSACIgeABIgngBg");
	this.shape_33.setTransform(510.6,554.9);

	this.shape_34 = new cjs.Shape();
	this.shape_34.graphics.f("#006600").s().p("AguBcQgNgIAAgPQAAgQARgNQARgNAfgHIgPgKIgTgMIgGgFQgBgDAAgDQAAgEACgEQADgEAEgEIAYgUIAngdIgBAAIgXABIgZAAIgZABIgUABQgJAAgDgCQgEgDABgFQgBgGADgDQADgCAGAAIACAAIAFAAIAGABIAIAAIAvgBIArgDIADAAIABAAQAHAAAFAEQAFACAAAGIgBAEIgDAFIgCABIgGAEIgRAPIgVAQIgTAQIgNALIAPALQAIAFAOAGQARAKALAHQAKAIAFAGQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAFgIAIQgIAHAAAGQAAAGAGADQAGACAPAAQAQAAANgDQANgEAIgGQAIgHAAgIQAAgEgFgEQgEgEgKgHQgVAFgOAFg");
	this.shape_34.setTransform(486.9,555.4);

	this.shape_35 = new cjs.Shape();
	this.shape_35.graphics.f("#006600").s().p("AAGBkQgDgDgBgFIABgEIAEgEIACgBIAEgCQAOgFANgIQANgJAKgJQAJgLAEgLQAEgLABgOQAAgPgJgMQgIgLgRgJQgNAdgPAWQgPAYgOARQgPARgPAJQgOAKgNAAQgIAAgFgEQgGgDgFgHQgEgHgDgKQgDgKAAgKQAAgXAMgUQAOgVAZgRIgFgRIgFgPIgBgJQAAgEADgDQADgDAFAAQAEAAADACQACACABAGIACAIIADAMIADAMQANgGAMgCQALgCANAAIAHAAIAKABIAGgQIAFgMQABgFACgCQACgCAEAAQAFAAADADQADADAAAFIgCALIgIAVQAWAKANAQQAMARAAATQAAAVgIARQgHAQgPAOIgPAMIgRALIgPAIQgIADgEAAQgEAAgDgEgAhHgBQgJAPAAASQAAANAFAIQAFAIAGABQAFAAAHgEIAQgNQAIgHAJgKIgNgbIgMgfQgSANgJAQgAgEgvQgKACgMAFIAJAbIALAXIAQgaQAIgOAJgSIgGgBIgDAAQgMAAgKACg");
	this.shape_35.setTransform(463,555);

	this.shape_36 = new cjs.Shape();
	this.shape_36.graphics.f("#006600").s().p("AgGBxQgDgCAAgFIAAgyQgNAOgRAMQgRALgTAJIgPAFQgFACgDAAQgEAAgDgDQgDgDAAgFQAAgBAAAAQAAgBAAAAQABgBAAAAQAAgBABAAIADgEIABgBIACAAIAHgCQALgEAMgFQAMgGAMgIQAMgIAKgIIhOAAQgDgBgCgCQgCgDgBgEQAAgDACgDQADgCADAAIBdAAIAAgQIg6AAQgKAAgFgFQgFgEABgJIAAgtIgLALQgEADgDAAQgEAAgDgDQgCgDAAgEIABgEIAEgFIAPgQIAOgTIAMgTQACgDACgBQADgBADAAQADAAADACQADADAAAEIgBAFIgIAMIA0AAIAFgIIAGgMIAEgEIAFgCQAFAAADACQADADAAAEQAAACgDAEIgIALIBPAAQADAAACACQACACAAADQAAAEgCACQgCACgDABIhTAAIAAANIBLAAQADAAACABQACADAAAEQAAADgCACQgCACgDAAIhLAAIAAANIBLAAQADAAACABQACACAAAEQAAADgCACQgCADgDAAIhLAAIAAANIBWAAQADABACABQABACAAAEQAAADgBADQgCACgDAAIhWAAIAAAQIBeAAQADAAADACQACADAAAEQAAAEgCACQgDACgDABIhQAAQALAHANAIQANAHAPAHQAOAFAOAEQAFACACACQADADgBADQAAAFgCADQgDADgFAAIgEgBIgIgCQgYgIgTgLQgUgMgSgTIAAA0QAAAFgDACQgDABgEAAQgFAAgCgBgAhCgGIABADIAEABIA0AAIAAgNIg5AAgAhCgeIA5AAIAAgNIg5AAgAhBhGIgBAEIAAAIIA5AAIAAgNIg0AAIgEABg");
	this.shape_36.setTransform(439.2,554.8);

	this.shape_37 = new cjs.Shape();
	this.shape_37.graphics.f("#006600").s().p("AgfBVQgDgDAAgFIABgFIADgEIACgBIAEgCQAygRAZgYQAYgYAAgiQAAgJgDgHQgDgGgFgEIgJgEIgLgDIgQAAIgYAAIgcACIgfABIgdADIgCAAIgBAAQgEAAgDgDQgCgDAAgEIABgHQABgCADgBIADgBIAIAAIAFgBIAKAAIAigDIAigBIAdgBQAhAAAQAOQAQANAAAbQAAAcgMAVQgNAWgZASIgSALIgVALIgTAIQgJAEgDAAQgFgBgDgDg");
	this.shape_37.setTransform(415,555.7);

	this.shape_38 = new cjs.Shape();
	this.shape_38.graphics.f("#006600").s().p("AAHBmQgDgCgBgEIgBAAIAAgBIABgsIgQAAIgKAAIgHAAIgGABIgYAAIgOABQgHAAgFgEQgEgDAAgGQAAAAAAgBQAAgBAAAAQAAgBAAAAQABgBAAAAIADgGIAIgMQAQgVASgdQASgeAUgkIAEgEIAEgBQAFAAADADQADADAAAFIAAACIgBADIgEAGIgJARIgfA0IgdAsIANgBIALAAIASAAIALAAIALAAIABg6QABgEADgDQADgDAFAAQAEAAACACQADACABAEIAAABIAAABIgBA6IASAAIAUAAIAJgBIAGAAIAFAAIADABQACABACADIABAFQAAAEgCACQgBADgDACIgCAAIgEAAIgIAAIgQAAIgPABIgPAAIgBArQAAAEgDACQgEADgEAAQgDAAgDgCg");
	this.shape_38.setTransform(393.7,554.9);

	this.shape_39 = new cjs.Shape();
	this.shape_39.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_39.setTransform(371.5,554.5);

	this.shape_40 = new cjs.Shape();
	this.shape_40.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_40.setTransform(264.9,376);

	this.shape_41 = new cjs.Shape();
	this.shape_41.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_41.setTransform(248.8,376);

	this.shape_42 = new cjs.Shape();
	this.shape_42.graphics.f("#006600").s().p("AgXBlQgEgDAAgFQAAgEACgCQABgDAFgCQAOgFAJgGQAJgGAHgHQAKgLAFgNQAGgNgBgOQABgQgKgKQgLgKgRAAQgJAAgIAEQgJADgGAGQgEAGgBAGQAAAGgDAEQgDADgGAAQgFAAgDgDQgDgEAAgGQABgMAIgKQAIgKAPgHQAOgGAPgBQARABANAHQAOAHAIANQAHANAAAQQAAAbgOAXQgPAWgdARIgLAGQgHADgCAAQgFAAgDgEgAgyhMIgTgCQgGAAgBgDQgDgCAAgEQAAgGADgDQADgDAFAAIABAAIACAAIAHABIASACIAYAAQAXAAAVgBQAUgCASgEIACAAIABgBQAFAAADADQADADAAAFQAAAFgDACQgCADgFABIgRADIgYACIgbABIgbABIgZgBg");
	this.shape_42.setTransform(229.1,376.5);

	this.shape_43 = new cjs.Shape();
	this.shape_43.graphics.f("#006600").s().p("AhMBgQgLgIgBgOQABgNAIgMQAJgKAOgHQAOgGARAAIAHAAIAHABIAAgMIgBgqIgBgiIgBgWIABgMIABgEQABgBAAAAQAAAAABgBQAAAAABAAQAAgBABAAQACgBADgBQADABACABQADACABACIAAADIABAJIAAAJIAAAUIAAAHIAWgDIAXgEIAVgFIACgBIADAAQAEAAACADQADAEAAAEQAAAEgCADQgBACgEABIgVAGIgbAEIgZADIABAPIABAbIABAUIAEACIABABIADACIAGADIAiAWIAXANQAEABACAEQACACAAADQAAAGgDADQgDAEgEAAQgFgBgPgIIgrgdQgCANgFAJQgFAIgJAFQgIAFgLABQgKACgMAAQgTABgLgJgAgtAyQgJAEgGAFQgFAGAAAHQAAAFAFAEQAFACAKAAQAWABAJgIQAKgIAAgRIAAgBIAAgBIAAgBIgJgBIgMAAQgLAAgJADg");
	this.shape_43.setTransform(205.3,376);

	this.shape_44 = new cjs.Shape();
	this.shape_44.graphics.f("#006600").s().p("AAGBlQgEgEAAgFIACgFIADgDIABgBIAFgCQAPgFANgJQAMgIAJgKQAKgKAEgLQAEgLAAgOQAAgPgIgMQgIgMgRgHQgNAcgPAWQgOAYgPARQgQARgOAKQgPAJgMAAQgHAAgHgEQgFgDgFgHQgFgHgDgKQgCgKAAgKQAAgYAMgTQANgVAagRIgFgSIgFgOIgBgIQAAgFADgDQADgDAFAAQAFAAACADQADACABAFIABAIIADAMIAEAMQANgFALgDQALgCANAAIAHAAIAKABIAGgQIAEgMQACgFACgCQACgCAEAAQAFAAADADQADADAAAEIgDAMIgHAVQAWAKAMAQQANARAAAUQAAAUgHARQgIARgQANIgOAMIgRALIgPAIQgIADgDAAQgFAAgDgDgAhHgBQgJAPAAASQABAMAEAJQAFAJAGAAQAFAAAHgEIAQgMQAIgIAJgKIgNgaIgMghQgSAOgJAQgAgDgvQgLACgMAFIAJAbIALAYIAQgbQAJgPAHgSIgEAAIgFAAQgLAAgJACg");
	this.shape_44.setTransform(181.1,376.2);

	this.shape_45 = new cjs.Shape();
	this.shape_45.graphics.f("#006600").s().p("AgGBwQgCgCAAgDIAAgzQgOAOgRAMQgQALgUAJIgOAGQgGABgDAAQgEAAgDgDQgDgDAAgFQAAgBAAAAQAAgBAAAAQABgBAAAAQAAgBABgBIACgCIACgBIADgBIAFgCQAMgDAMgHQAMgFAMgIQAMgIAKgJIhOAAQgDAAgCgCQgDgDAAgEQABgEACgCQACgCADgBIBeAAIAAgPIg8AAQgJAAgFgFQgEgFgBgIIAAguIgKAMQgEADgDAAQgEgBgDgCQgCgDAAgEIAAgEIAFgFIAOgQIAPgTIAMgSQACgEADgBQACgBACAAQAFAAACACQADADAAADIgCAGIgHAMIAzAAIAGgJIAGgKIAEgGIAFgBQAFAAADACQADAEAAADQAAACgDAFIgIAKIBPAAQADgBACADQABACABAEQgBADgBACQgCADgDAAIhTAAIAAAMIBLAAQADAAACACQACADAAADQAAADgCADQgCACgDAAIhLAAIAAAMIBLAAQADAAACACQACADAAADQAAAEgCACQgCACgDAAIhLAAIAAANIBWAAQACABACABQACACAAAEQAAADgCADQgCACgCAAIhWAAIAAAPIBeAAQADABADACQACADAAADQAAAEgCADQgDACgDAAIhQAAQALAJANAHQANAIAOAFQAPAHAOADQAFABACADQACACAAAEQAAAFgDADQgCADgFAAIgEgBIgIgDQgYgGgUgNQgTgMgSgRIAAA0QgBADgCACQgDACgEAAQgEAAgDgCgAhCgGIABADIAEABIA1AAIAAgNIg6AAgAhCgfIA6AAIAAgMIg6AAgAhBhGIgBADIAAAIIA6AAIAAgMIg1AAIgEABg");
	this.shape_45.setTransform(157.3,376);

	this.shape_46 = new cjs.Shape();
	this.shape_46.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_46.setTransform(133.2,375.7);

	this.shape_47 = new cjs.Shape();
	this.shape_47.graphics.f("#006600").s().p("AAiBdIgRgFIgRgHQgJgEgGgEQgRgJgJgMQgJgMAAgOQAAgMAKgPQALgQATgSQASgSAZgSIgmABIgsAAIgrABQgEAAgDgDQgDgDAAgFQAAgDACgCIAEgEIADgBIAFAAIAZAAIAlAAIAlgBIAkgBIAcgBIARgBIACAAQADABADADQADADAAADQAAAFgDADQgCADgEAAIgGAAIgJABIgHAAQgUAMgSANQgSAOgOANQgNAOgIALQgIAMAAAIQgBAPARALQAPALAlAJIADABIACAAIACAAIADgBIACAAIACAAQAEAAADADQADADAAAFQAAAGgFADQgEAEgJAAIgNgCg");
	this.shape_47.setTransform(300.5,305.4);

	this.shape_48 = new cjs.Shape();
	this.shape_48.graphics.f("#006600").s().p("AgxBjQgNgGgHgMIgEgJIgBgMIgBgVIABgbIABgeIABgdIABgXIABgEIAAgEIAAgGIgCgGIAAgCIAAgBQAAgGADgCQADgDAGgBQAGABAEAGQAEAFAAAMIAAACIgBAEIAAAKIgDAgIgBAiIgBAgIABAUIABALIADAIQAEAFAHAEQAIACALAAQAOAAAKgDQALgFAJgJIAJgLIAJgPIAIgQQACgEACgCQADgBADAAQAFAAAEADQADAEABAFIgEAMIgJAQQgFAKgGAHQgMAQgRAIQgSAHgWABQgTgBgNgGg");
	this.shape_48.setTransform(277.9,304.7);

	this.shape_49 = new cjs.Shape();
	this.shape_49.graphics.f("#006600").s().p("AhPBvQgCgDgBgDIAAh6IgLARQgEAFgDAAQgEAAgDgDQgDgCAAgEIABgDIADgFQAHgLAHgPQAIgQAGgRIALgiIADgFQADgCADAAQAEAAADADQADACAAAEIgCAJIgGARIgHATIAACjQAAADgDADQgCACgEAAQgFAAgCgCgABCBuQgHgBgDgDQgDgCAAgFQABgEACgDQADgDAEAAIADABIAGAAIAHABIAEAAQAFAAABgCQACgCAAgFIAAi2QAAgEADgCQACgDAFAAQAEAAADADQACACAAAEIAAC/QABALgFAEQgGAFgMAAIgWgBgAgzBoQgCgDAAgFQAAgDABgCQACgCADgBIACAAIAFgBIAMgCIANgCIADgBIAAgsIgeAAQgEAAgCgCQgDgCAAgFQAAgEACgCQADgDAEAAIAeAAIAAgWQAAgDADgDQACgCAFAAQADAAACACQADADAAADIAAAWIAcAAQADAAACADQADACAAAEQAAAEgDADQgCACgDAAIgcAAIAAApIAMgCIAIgCIAIgCIADgBIACAAQAEAAACADQADACAAAEQAAADgCACQgBACgDABIgOAEIgUAFIgVAEIgTADIgLACQgFAAgDgDgAA3A8QgCgCAAgDIAAiIQAAgDACgDQADgCAEAAQAEAAADACQACADABADIAACIQgBADgCACQgDADgEAAQgEAAgDgDgAAhgJIgDgCIgBgCIgBgDIgBgDIgBgCIgUADIgUAEIgTACIgLACQgEgBgDgCQgCgDAAgFQAAgDABgCQACgDADAAIADgBIAEAAIABAAQAFgLAFgOIAIgbIgUAAQgEAAgCgCQgCgDAAgEQAAgEACgDQACgCAEAAIBOAAQAEAAACACQADADAAAEQAAAEgDADQgCACgEAAIgnAAIgIAbIgJAXIAUgCIATgCIgEgJIgFgKIgBgFQAAgEACgCQADgCAEAAIAEABIAEAEIAFAJIAGAOIAFAMIADAHIABADIAAACQAAAEgDACQgDACgEAAIgEgBg");
	this.shape_49.setTransform(252.1,304.8);

	this.shape_50 = new cjs.Shape();
	this.shape_50.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_50.setTransform(228.5,304.3);

	this.shape_51 = new cjs.Shape();
	this.shape_51.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_51.setTransform(326.8,240.7);

	this.shape_52 = new cjs.Shape();
	this.shape_52.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_52.setTransform(310.7,240.7);

	this.shape_53 = new cjs.Shape();
	this.shape_53.graphics.f("#006600").s().p("AhDBpQgDgDAAgFIAAgFIAAgHIABg/IABhXIAAgUIABgKIAAgEIAAgCQACgDACgBQADgCADAAIAFABIAEADIACAEIABAGIAAAFIAAAjIgBALIAAAMIAZAPIAcANQAPAGAOAEQAFACACADQACACAAAFQAAAFgEAEQgDADgFAAIgEAAIgHgDIgjgRQgRgJgQgJIAAAcIAAARIAAAKIgBAKIAAAXIAAAMIgBAEIAAADQgBADgDACQgDACgEAAQgFAAgDgDgAAcgWIgDgEIgYgaIgJgOIgCgGQAAgDACgCQADgDADAAIADABIAEAEIAKAOIAMANIAKAMIADADIAAACQAAAEgCADQgDACgEAAIgBAAIgCAAgAA6gqIgKgJIgQgUIgIgLIgEgEIAAgDQAAgDACgDQADgCADAAIAEABIAEAEIAGAHIAKALIAJAMIAIAIIACADIAAADQAAADgCADQgDADgDAAQgCAAgDgDg");
	this.shape_53.setTransform(294.2,240.8);

	this.shape_54 = new cjs.Shape();
	this.shape_54.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEAAgCgDQgCgEAAgEQAAgEADgDQADgDAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADADAAAFQAAAEgCADQgDACgEABIgJAAIgWABIgdAAIgfABIgbAAg");
	this.shape_54.setTransform(267.1,240.2);

	this.shape_55 = new cjs.Shape();
	this.shape_55.graphics.f("#006600").s().p("AgKBgQgLAAgGgDQgFgCgBgFQgDgFABgJIAAhCIgFAAIgEAAIgRABIgIAAIgOABIgJAAQgGAAgCgDQgDgDAAgEQAAgEABgDQADgDADgBIACAAIACAAIAGAAIAIAAIAMAAIAUAAIALgBIAAg6IgSAAIgSAAQgGAAgEgCQgDgDAAgFQAAgEACgCQACgDADgBIADgBIAKAAIBEgBIAsgBIALAAIAHgBQAGAAAEADQACADAAAFQAAAEgBADQgDADgEAAIgBAAIgGABIgPAAIgeABIgPABIgQAAIAAA6IARAAIAmgBIAUgBIAMgBIAKAAIAEAAQAIAAAFACQADADAAAGQAAAFgCACQgEACgEABIgLAAIgSAAIgXAAIgjABIgUAAIAABAIABAEIABACIAGAAIAIABIALAAIAUgBIASgBIAFgBIADgFIAEgDIAEgBQAFAAAEAEQADADAAAFQAAAEgDAFQgDAEgFADQgDACgGABQgGABgKAAIgYABIgegBg");
	this.shape_55.setTransform(243.4,241);

	this.shape_56 = new cjs.Shape();
	this.shape_56.graphics.f("#006600").s().p("AhpBwQgCgCAAgDIAAiFQAAgIAEgEQAEgDAHAAIAKAAIgDgLIgDgLIgDgJIgQAAQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAxAAIAAgPQAAgDADgDQACgCAFAAQAEAAADACQADADAAADIAAAPIAvAAQADAAACADQACACAAAEQAAAEgCADQgCACgDAAIgRAAIgEAOIgFARIALAAQAHAAAEADQAEAEAAAIIAAB3QAAALgGAEQgEAEgPAAQgNAAgFgCQgFgCAAgGQAAgEACgDQACgCAEAAIADAAIAGAAIACABIACAAQAGAAACgCQACgBAAgFIAAhqQAAgBAAAAQAAgBgBAAQAAgBAAAAQAAAAgBgBQAAAAAAAAQgBgBAAAAQgBAAAAAAQgBAAAAAAIgcAAIAAAQIAVAAQAEAAABACQACACAAAEQAAADgCACQgBACgEAAIgVAAIAAARIAIAAQAHAAADADQADADAAAHIAAAjQAAANgNAAIggAAQgNAAAAgNIAAgjQAAgHAEgDQADgDAGAAIAIAAIAAgRIgUAAQgDAAgCgCQgCgCAAgDIACgGQACgCADAAIAUAAIAAgQIgbAAQgBAAAAAAQgBAAAAAAQgBAAAAABQgBAAAAAAQAAABAAAAQgBAAAAABQAAAAAAABQAAAAAAABIAAB/QAAADgDACQgCACgEAAQgEAAgDgCgAg9AnIgBADIAAAWIABAEIAEABIARAAIADgBIABgEIAAgWIgBgDIgDgBIgRAAIgEABgAhFg+IADAMIACAJIAdAAIADgMIADgJIACgKIgtAAIADAKgABkBwIgGgGQgJgJgHgJQgHgKgHgMIgPAWQgIALgIAHIgGAGIgFABQgFAAgDgDQgDgDAAgEIABgFIAGgGQALgMAJgLQAIgLAHgOIgKgZIgJgcQgEAJgDAEQgDAEgEAAQgEAAgDgDQgDgCAAgDIAAgDIACgGQAJgWAGgYQAGgYACgYQABgFACgCQADgDAEAAQAFAAACADQADACAAAEIgBALIgDARIA2AAQAEAAACACQACADAAAEQAAAFgCACQgCADgEAAIgHAAQgBATgEATIgIAiQgFARgGANQAGALAKANQAKANALALIAEAFIABAFQgBAEgCADQgDADgFAAIgFgBgAAug0IAAACIgBADIgBADIgBAEQADARAFAQIALAdQAHgTAEgUQAFgUACgUIggAAg");
	this.shape_56.setTransform(219.5,240.8);

	this.shape_57 = new cjs.Shape();
	this.shape_57.graphics.f("#006600").s().p("AhhBxQgEAAgEgDQgDgDAAgFIABgEIAEgGIALgOIAKgSQABgDADgBIAFgCQAFAAADADQADADAAAFIgCAIIgHAMIgJAOQgGAIgEAEQgDACgDAAIgBAAgAgdBwQAAgBgBAAQAAAAgBgBQAAAAgBgBQAAAAAAgBIgBgCIgBgEIgCgRIgEgSIAAgCIAAgBQAAgEADgDQADgDAFAAQAEAAADADQACACACAGIADAOIADAPIABAKQAAAEgDADQgDACgGAAQgDAAgDgBgABbBvQgCgCgDgFIgLgUIgLgQIgCgEIAAgDQAAgEADgDQAEgDAEAAQADAAADACQADACAFAGIALARIAJAPQACAGAAADQAAAEgDADQgEADgFAAQgDAAgDgBgAAdBuQgDgCgBgFIgGgQIgEgKIgDgIIgBgDIAAgDQAAgEADgDQADgCAFgBQAEAAACADQADACADAIIAHAPIAEANIACAIQAAAEgDADQgEADgFAAQgEAAgCgCgAhjAtQgEAAgCgCQgCgDAAgEQAAgEACgCQACgDAEAAIAXAAIAAgoIgcAAQgDAAgDgCQgCgDAAgEQAAgEACgCQACgDAEAAIAcAAIAAgfQgIALgFAEQgFAEgDAAQgFAAgCgDQgDgDAAgEQAAAAAAgBQAAgBAAAAQAAgBAAAAQAAgBABAAIAFgHQAKgKAIgLQAIgKAGgLQABgDADgCQACgBADAAQAEAAADACQADADAAAEQAAACgBADIgGAKICaAAQAEAAACADQACACABAEQAAAFgDACQgCACgEAAIgQAAIAAAnIAYAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAIgYAAIAAAoIATAAQAEAAACADQACACAAAEQAAAEgCADQgCACgEAAgAAiAbIAcAAIAAgoIgcAAgAgLAbIAbAAIAAgoIgbAAgAg5AbIAcAAIAAgoIgcAAgAAigfIAcAAIAAgnIgcAAgAgLgfIAbAAIAAgnIgbAAgAg5gfIAcAAIAAgnIgcAAg");
	this.shape_57.setTransform(195.3,240.7);

	this.shape_58 = new cjs.Shape();
	this.shape_58.graphics.f("#006600").s().p("AhkBpQgDgDAAgEIAAi7QAAgJAEgEQAFgFAJAAIA6AAQAJAAAEAFQAFAEAAAJIAAAsQAAAJgFAEQgEAEgJAAIg4AAIAAB+QAAAEgDADQgDADgEAAQgFAAgCgDgAhTgrIAxAAIAEgBQAAAAABgBQAAAAAAgBQAAAAAAgBQAAAAAAgBIAAgMIg2AAgAhShaIgBADIAAAMIA2AAIAAgMIgBgDQAAAAAAgBQgBAAAAAAQgBAAAAAAQgBAAgBAAIgsAAQAAAAgBAAQAAAAgBAAQAAAAgBAAQAAABgBAAgAA3BqQgIgCgDgCQgDgCAAgFQAAgFADgDQACgCAFAAIACAAIACAAIAKABIAJAAQAGAAACgBQACgDAAgEIAAhqIg6AAQgJAAgEgEQgEgEAAgJIAAgtQAAgJAEgDQAEgFAJAAIA7AAQAKAAAEAFQAFAFAAAIIAACtQAAANgGAEQgFAGgOgBIgYAAgAAcgwQAAABAAAAQAAABAAAAQABABAAAAQAAABAAAAIAEABIAzAAIAAgRIg4AAgAAdhaQAAAAAAABQAAAAgBAAQAAABAAAAQAAABAAAAIAAAMIA4AAIAAgMQAAAAAAgBQAAAAAAgBQgBAAAAAAQAAgBgBAAQAAAAAAgBQAAAAgBAAQAAAAgBAAQAAAAgBAAIguAAQgBAAAAAAQgBAAAAAAQgBAAAAAAQAAABgBAAgAgjBTQgJAAgFgEQgEgFAAgJIAAg9QAAgIAEgFQAFgEAJAAIBHAAQAIAAAFAEQAEAFAAAIIAAA9QAAAJgEAFQgFAEgIAAgAgiA9QAAABABAAQAAABAAAAQAAABAAAAQABABAAAAIADABIA6AAIAEgBIABgEIAAgTIhEAAgAggAEQAAAAgBABQAAAAAAABQAAAAAAABQgBAAAAAAIAAASIBEAAIAAgSQAAgEgFgBIg6AAQAAAAAAABQgBAAAAAAQgBAAAAAAQgBABAAAAg");
	this.shape_58.setTransform(171.3,241.4);

	this.shape_59 = new cjs.Shape();
	this.shape_59.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_59.setTransform(147.2,241.1);

	this.shape_60 = new cjs.Shape();
	this.shape_60.graphics.f("#006600").s().p("AgxBjQgNgGgHgMIgEgKIgBgLIgBgVIABgbIABgeIABgdIABgXIABgEIAAgEIAAgGIgCgGIAAgCIAAgBQAAgGADgCQADgDAGgBQAGABAEAFQAEAGAAAMIAAACIgBAEIAAAKIgDAgIgBAiIgBAgIABAUIABALQABAFACACQAEAGAHADQAIADALAAQAOAAAKgDQALgFAJgJIAJgLIAJgPIAIgQQACgEACgCQADgBADAAQAFAAAEADQADAEABAFIgEAMIgJAQQgFAKgGAHQgMAQgRAIQgSAHgWABQgTgBgNgGg");
	this.shape_60.setTransform(124.5,240.8);

	this.shape_61 = new cjs.Shape();
	this.shape_61.graphics.f("#006600").s().p("AhiBtQgEgDAAgGQAAgEACgCQACgDAEgBIACAAIAGgBQAxgGAigUQAhgUAVgiIAFgGQADgCADAAQAFABADADQADADABAEQgBAEgFAIQgFAJgKALQgNAPgRAMQgSANgSAJIgTAHIgVAGIgUAEIgRACQgFAAgDgDgAgeArIgLgBIgHgBQgFgBgDgDQgCgCAAgFQAAgFADgDQADgDAEAAIADAAIADABIAKABIAJABQAGAAADgCQACgCAAgFIAAhyQAAgEADgDQADgDAFAAQAEAAADADQADADAAAEIAAB4QAAAOgHAFQgFAFgRAAIgKAAgAhpAVQgDgDAAgGQAAAAAAgBQAAAAAAgBQAAAAAAgBQABAAAAgBIADgFQAMgQAIgSQAJgSAGgUQACgGADgCQACgDAEAAQAFAAADADQADADAAAFIgCAMIgHATIgKAWIgKATQgFAJgGAHIgFAEIgFABQgFAAgDgDgABbASIgFgEIgBgCIgCgFIgLgTIgIgRIgJgQIgMgUIgCgEIgBgDQAAgFADgDQAEgCAEgBQADAAADACIAGAHIALAQIALASIALAVIALAUIABAEIABAEQAAAEgEAEQgDADgFAAIgGgCg");
	this.shape_61.setTransform(99.5,240.8);

	this.shape_62 = new cjs.Shape();
	this.shape_62.graphics.f("#006600").s().p("AgQBjQgQAAgKgCQgJgBgFgCQgJgEgFgGQgFgHAAgJQAAgGAEgHQADgIAHgGIAcgZIAegYIgfgWIgbgWIgTgRIgHgJQgCgFAAgDQAAgGADgDQADgEAFAAQAEAAACACIAEAEQAEAIAKAKQAKAKAQANIAoAeIANgKIALgIIALgIIADgDIAEgDIAHgGIAFgHIADgCIAFgBQAFAAADADQAEAEAAAFQAAAFgFAFQgFAHgMAIIgcAUIgfAXIgbAXIgUATIgHAIQgCADAAADQAAAEADACQADACAHACIAVABIAiABIAZAAIAQgBIAJgBIAFgDIAEgCIADAAQAFAAADADQADADAAAFQAAADgCADQgCAEgDACQgFACgHABIgSACIgeABIgngBg");
	this.shape_62.setTransform(203.1,198.5);

	this.shape_63 = new cjs.Shape();
	this.shape_63.graphics.f("#006600").s().p("AguBcQgNgHAAgQQAAgQARgNQARgNAfgHIgPgKIgTgMIgGgFQgBgDAAgDQAAgEACgEQADgEAEgEIAYgUIAngdIgBAAIgXABIgZAAIgZABIgUABQgJAAgDgCQgEgDABgGQgBgFADgDQADgCAGAAIACAAIAFAAIAGABIAIAAIAvgBIArgDIADAAIABAAQAHAAAFAEQAFACAAAGIgBAEIgDAFIgCABIgGAEIgRAPIgVAQIgTAQIgNALIAPALQAIAFAOAGQARAKALAHQAKAIAFAGQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAFgIAIQgIAHAAAGQAAAGAGADQAGACAPAAQAQAAANgDQANgEAIgGQAIgHAAgIQAAgEgFgEQgEgEgKgHQgVAFgOAFg");
	this.shape_63.setTransform(179.4,199);

	this.shape_64 = new cjs.Shape();
	this.shape_64.graphics.f("#006600").s().p("AghBqQgDgDAAgGQgBgDACgDIAIgFQAMgFAJgHQAIgHAGgIIgYgDQgLgCgIgDQgLgFgIgJQgHgJAAgLQAAgLAHgIQAHgJAMgGQAIgEANgDIAcgFIAAgDIgBgMIAAgGIgcABIgcAAIgXABIgRAAIgKgBIgFgBIgCgDIgBgFQAAgEACgCQACgDADgBIACAAIAFgBIAOAAIARAAIAUAAIAeAAIASgBIAAgMIAAgJQAAgKACgEQACgDAGAAQAGAAADADQACACAAAGIAAAGIAAAIIAAANIAigBIAXgBIABgBIABAAQAEAAADADQADADAAAEQAAAEgCACQgBADgDABIgCABIgFAAIgGAAIgKAAIgPABIgMAAIgMAAIAAANIAAAEIAAAGIABAKIABAUIAAAPQAAAQgBAKQgBAKgEAHQgDAIgGAIQgHAHgJAIQgIAIgJAFQgJAFgFAAQgEAAgDgDgAgIgHQgKACgGADQgHACgEAFQgDAFAAAFQAAAHADAFQAEAFAHACIASAEIAUACIABgMIABgNIAAgFIgBgHIAAgNQgOABgJACg");
	this.shape_64.setTransform(155.4,198.5);

	this.shape_65 = new cjs.Shape();
	this.shape_65.graphics.f("#006600").s().p("Ag2BpQgDgDAAgFIAAgGIABgHIABg/IAAhVIAAgVIABgKIAAgEIAAgBQACgEADgBQACgCADAAIAGABIADADIADAEIABAGIgBAFIAAAjIAAAKIAAANIAZAOIAcAOQAPAGAOAEQAEABACADQACADAAAFQAAAFgEAEQgDAEgFAAIgEgBIgHgDQgUgIgQgKIgfgRIAAAbIgBARIAAALIgBALIAAAWIAAALIgBAGIAAACQgBADgDACQgDACgEAAQgFAAgDgDg");
	this.shape_65.setTransform(133.9,198.4);

	this.shape_66 = new cjs.Shape();
	this.shape_66.graphics.f("#006600").s().p("AgfBQQgDgEAAgFIABgEIADgDIABgBIAEgCQARgLAMgMQANgNAJgPQAKgOAHgUQAIgUAGgbQABgEACgCQADgCAEAAQAEAAADADQADADAAAEIgCAHIgDANIgFAPIgEANQgGARgHANQgHANgIALQgJAMgMALQgMAMgKAIQgKAHgFAAQgFAAgDgDgAgzAGQgCgBgBgDIgEgIIgFgRIgGgRIgEgOIgCgIIgBgCQAAgEADgDQADgDAFAAIAFABIADADIAAACIACAFIADALIADAKIAFAOIAIAVIABADIABACQgBAEgDACQgCADgGAAIgFgBgAgCgHQgDgBgBgDIgEgJIgGgQIgFgQIgFgOIgBgHQAAgDADgDQADgDAEAAQABAAAAAAQABAAABAAQAAAAABABQAAAAABAAQAAABABAAQAAAAABAAQAAABABAAQAAABAAAAIABADIABAEIAEALIAEAPIAGAPIAEAKIABADIAAACQAAAEgDADQgCACgFAAIgEgBg");
	this.shape_66.setTransform(107.7,201.1);

	this.shape_67 = new cjs.Shape();
	this.shape_67.graphics.f("#006600").s().p("Ag5BmQgEgDAAgGIABgFQABgDADgBIABgBIAEgCQAPgIAJgHQAKgIAFgGQAFgIACgJQACgKAAgNIAAgqIgWABIgTAAIgHAAIgJAAQgFAJgHAKQgHAIgJAHIgGAEQAAAAgBABQAAAAgBAAQAAAAgBAAQgBAAAAAAQgGAAgCgDQgDgDAAgFIAAgEIAEgEQAJgHAGgIQAHgIADgIIAEgNIACgPIABgRIgBgLQAAgFADgCQADgCAFgBQAEAAADACQADADABADIAAAMIgBASIgCARIAOAAIAJAAIAqAAIAogCIgIgPIgCgHQAAgEACgCQADgCADAAQABgBABAAQAAAAABABQAAAAABAAQAAAAABABIADAFIAJAPIAJARIAIALIABADIAAADQAAADgCACQgDACgDABQgDAAgDgDQgDgDgDgHIgMABIgMAAIgNABIgJABIAAAqQAAASgCAMQgDAMgGAJQgEAGgHAJQgJAHgLAIIgQAKQgGADgDABQgEgBgDgEgABhgqIgGgHIgKgRIgJgQIgFgJIgBgEQAAgEADgCQACgDAEAAIAEACIAEAFIAGAMIAKAQIAJAPIACADIAAADQAAADgCACQgDADgDAAQgBAAAAAAQgBAAgBAAQAAgBgBAAQAAAAgBgBg");
	this.shape_67.setTransform(84.6,198.5);

	this.shape_68 = new cjs.Shape();
	this.shape_68.graphics.f("#006600").s().p("AgdBmQgNgBgGgCQgLgDgGgGQgFgGAAgJQgBgHAFgIQAFgIALgLQAMgLAUgPIgEgDIgDgDIgFgDIgFgEIgEgCIgDABIgEABQgFAAgDgCQgDgDAAgFIABgFIAEgHIAJgOIAIgRIgcAAIgSAAIgLAAQgDgBgCgCQgCgDAAgEQAAgFACgDQADgCAEAAIABAAIACAAIANAAIARABIANAAIATgBIAFgLIACgHIABgEQAAgEADgDQADgCAEAAQAGAAABACQADADAAAEIAAAGIgCAHIgDAJIAiAAIAggCIAagBIACAAQADAAADADQACADAAAEQAAAEgCADQgBADgEAAIgRABIgcABIggAAIgcABIgIARIgKARIAJAGIAOAKIAGADIAMgJIAOgJIAJgHIADgDIADgEIADgEQACgCADAAQAFAAADADQADADAAAEQAAAFgDAFQgEAFgGADIgJAGIgNAHIgMAJIAPANQAFAEACADQACADgBACQAAAFgDADQgDADgEAAIgFgBIgFgEIgJgIIgKgKIgUARIgSASIgDAEIgBAFQgBAFAFADQAGACANABQAMACAWAAIAcgBIAUgCIAFgCIAFgDIADgCIAEgBQAEABADADQAEADAAAEQAAAFgDADQgDAEgFACIgPADIgZABIggABIghgBg");
	this.shape_68.setTransform(59.7,198.1);

	this.shape_69 = new cjs.Shape();
	this.shape_69.graphics.f("#006600").s().p("AAABqIgDgCIgCgDIgDgHIgGgPIgJgUIgKgYIgLgWIgFgNIgFADIgHAEIgPAHIgJAEIgHAAQgFABgDgDQgDgDAAgFQAAgEACgCQACgCAEAAIAHgCIAJgEIAGgDIALgFIAEgCIgHgPIgMgYIgKgTIgFgLIgCgFIAAgBQAAgEAEgEQADgCAFAAIAEABQACABAEAGIAJATIASAlIAGAMIAOgHIAVgKIAGgDIgBgNIgBgRIAAgNIAAgIIAAgCQAAgEACgCQADgCAEgBQAEAAADACQADACAAADIABAJIABAQIABAVQAPgHALgDQALgDAIABQASAAAJAKQAKALAAATQAAAPgHAMQgIANgOALIgNAKIgNAHQgGACgDAAQgFAAgDgDQgCgDgBgEIABgFIADgDIABgBIADgBIAGgCQAMgGAJgHQAJgIAFgIQAFgJAAgKQAAgLgEgGQgEgEgJAAIgKABIgOAEIgTAIIABAQIAAAIIAAAFIgBAIIAAAEIgEAEQgCACgDAAQgFgBgDgDQgCgCAAgGIgBgLIAAgPIgMAGIgPAIIgHADIAJASIAVAtIAKAaIAFALIABAGQAAAEgEADQgDACgEAAIgEgBg");
	this.shape_69.setTransform(503.7,118.5);

	this.shape_70 = new cjs.Shape();
	this.shape_70.graphics.f("#006600").s().p("AAVBuQgDgDAAgEIAAgoIgZAAQgDAAgDgDQgDgDABgEQgBgEADgCQACgDAEAAIAaAAIAAhIQgGARgIAQQgGARgKAPQgIAPgKALQgGAHgDACQgCACgDAAQgEAAgEgEQgCgDAAgEIAAgEIACgEQAMgMAMgRQALgQAKgSQAJgTAJgUIg1AAQgEAAgCgDQgCgDgBgEQABgEACgDQACgCAEgBIA7AAIAAgjQAAgEADgDQADgCAFAAQAEAAADACQACADAAAEIAAAjIBAAAQAEAAADADQACADgBAEQABAEgCADQgDADgEAAIg4AAIABADQAHAOAKARQAKAQAMAQQAMARAMAOIADAEIABAEQAAAFgDADQgEAEgEAAQgDAAgCgCIgGgHQgQgUgOgXQgOgWgKgbIAABLIAdAAQADAAADACQACADAAAEQAAAFgCACQgDADgDAAIgdAAIAAAoQAAAEgCADQgDACgEAAQgFAAgDgCgAhMBuQgCgCAAgEIAAh8QgKAPgGAGQgFAGgEAAQgEAAgDgDQgDgDAAgDIAAgEIAEgGQAKgNAJgPQAJgPAHgRQAIgQAGgQQABgHAIAAQAEAAADACQADADAAAEIgCAJIgHAQIgJAUIAAChQAAAEgCACQgDACgFAAQgEAAgDgCg");
	this.shape_70.setTransform(479.5,118.3);

	this.shape_71 = new cjs.Shape();
	this.shape_71.graphics.f("#006600").s().p("AAGBkQgDgDAAgFIABgFIADgEIABgBIAEgCIASgKQAIgEAGgGIANgMQAMgNAGgNQAFgOAAgOQAAgQgEgNQgFgNgIgKQgKgLgQgGQgPgGgRAAQgRAAgQAHQgQAHgOAPQgLAMgFAPQgGAOAAASQAAANADAJQADAJAGAGQAGAGAFADQAGACAGAAQAIAAAGgEQAFgEAEgKQADgHADgMIAEgZIABgbIAAgNQAAgGADgDQADgDAFAAQAFAAADAEQACADAAAIQAAARgCAQIgEAdQgCAOgDAJQgGASgLAJQgMAJgPAAQgLAAgJgEQgJgEgIgIQgKgLgFgNQgFgOAAgPQAAgWAJgUQAIgTAPgQQAPgPATgJQAUgIAVAAQANAAAMADQANADALAGQAMAFAIAIQAJAIAGALQAHALADAOQAEANAAANQAAAVgKAUQgKAUgSARIgTAQIgSAKQgJAEgFAAQgFAAgDgCg");
	this.shape_71.setTransform(455.4,118.5);

	this.shape_72 = new cjs.Shape();
	this.shape_72.graphics.f("#006600").s().p("AhhBrQgEgEABgEIABgFIADgEIABgBIAGgCQATgJAMgNQAOgNAGgQQAGgRADgVIghAAQgEgBgDgCQgCgDAAgEIAAgBIgBABIgBABIgOALQgFAEgEAAQgFAAgDgEQgDgCAAgFQgBgDACgCIAGgGQASgRAPgVQAPgUAIgWQADgGACgCQACgCAEAAQAFAAADADQADADABAEQAAAEgEAIIgIATIgNAWQgHALgKALIB0AAQAEAAAFACQADABAEACQAEADABAFIABAMIgBAaIgBAaIgDAXQgCAJgCAFQgDAKgHAEQgHAEgPAAIgXgBIgQgCQgFgBgDgCQgDgDAAgFQABgFADgDQADgDAFAAIADAAIABAAIAKABIAKABIAKAAQAIAAAEgCQADgCABgGIADgNIACgTIABgUIABgUQgBgEgBgBQgBgCgFABIg1AAQgCAWgFARQgFARgJAOQgKANgOALQgNAKgOAGIgGACIgDABQgFgBgDgDgABbgBIgHgGQgPgPgNgQQgMgQgLgTIgJgRQgDgGAAgDQAAgFAEgDQADgDAEAAQAEAAADACIAGAIQAIARAJANQAHANALALIAXAYIAEAFQABADABADQgBAEgDAEQgDADgEAAQgEAAgDgBg");
	this.shape_72.setTransform(431.5,118.4);

	this.shape_73 = new cjs.Shape();
	this.shape_73.graphics.f("#006600").s().p("AhCBtQgKAAgFgGQgGgEAAgLIAAiNQAAgKAGgFQAFgFAKAAIAsAAIABgCIAFgMIAFgLQACgFACgDQADgBAEAAQAEAAAEACQADADAAAFQAAADgDAGIgIAPIBDAAQAKAAAGAFQAFAFAAAKIAACNQAAALgGAEQgFAGgKAAgAhBBTQAAAGAGAAIB3AAQABAAAAAAQABAAAAAAQABgBAAAAQABAAAAAAQACgCAAgDIAAgeIiDAAgAhBAiICDAAIAAgiIiDAAgAg/g0QgBAAAAAAQAAABAAAAQgBABAAABQAAAAAAABIAAAdICDAAIAAgdQAAgBAAAAQAAgBgBgBQAAAAAAgBQAAAAgBAAQAAgBgBAAQAAAAgBgBQAAAAgBAAQAAAAgBAAIh3AAQgBAAAAAAQgBAAAAAAQgBABAAAAQgBAAAAABg");
	this.shape_73.setTransform(407.5,117.8);

	this.shape_74 = new cjs.Shape();
	this.shape_74.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_74.setTransform(946.1,118.2);

	this.shape_75 = new cjs.Shape();
	this.shape_75.graphics.f("#006600").s().p("Ag0BdQgGgGAAgIQAAgIAGgGQAGgGAIAAQAIAAAGAGQAGAGAAAIQAAAIgGAGQgGAGgIAAQgIAAgGgGgAgVAkQgDgDAAgEIABgDIABgEIAEgIIAhhCIAUgmQACgEADgCQADgCADAAQAFABAEADQAEAEAAAFIgBAEIgEAIIgGALIgHALIgIAQIgPAaIgVAoQgCAEgDACQgDACgDAAQgEAAgDgDg");
	this.shape_75.setTransform(930,118.2);

	this.shape_76 = new cjs.Shape();
	this.shape_76.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEgBgCgDQgCgCAAgFQAAgFADgDQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAAEgCADQgDADgEAAIgJAAIgWABIgdAAIgfABIgbAAg");
	this.shape_76.setTransform(910.4,117.6);

	this.shape_77 = new cjs.Shape();
	this.shape_77.graphics.f("#006600").s().p("AhqBmQgEgEAAgFIABgFIAEgEQAIgHAIgLQAIgKAHgNQAHgOAFgOQAEgKADgOIAEgeIABggIAAgGIAAgDIgCgEIgBgCIAAgCQAAgEADgEQAEgDAFAAIAFABIAEAFQACACABAEQACAFAAAHQAAASgCASQgCASgDAQQgDAQgEALQgEANgIAPQgHAPgJANQgIAMgIAIIgHAGIgFACQgGgBgDgDgABFBlQgEgDgHgJQgJgKgIgNQgIgMgGgNQgGgNgEgLIgGgdQgDgQgCgSQgCgRAAgPQAAgLAEgGQAEgHAHABQAEAAADACQADAEAAAFIAAACIgCAEIgBAEIAAACIAAAHQAAAPACARQACARADAPQAEAPAEALIAMAYIAPAVQAIALAIAGIAEAFIABAFQAAAFgEAEQgDAEgFAAIgBAAQgDAAgEgDgABGggIgGgHIgKgQIgLgTQgEgHAAgBQAAgEADgDQACgBAEAAQABgBAAAAQABAAABABQAAAAABAAQAAAAABAAIADAGIAIANIAJAPIAIALIABADIABAEQAAADgDACQgCACgDABQgBAAAAgBQgBAAgBAAQAAAAgBAAQAAgBgBAAgABggwIgLgQIgNgWQgFgJAAgCQAAgDADgCQACgDAEAAIAEABIAEAGIAEAHIAGALIAIAMIAGAJIACAEIABACQAAADgDADQgCACgEAAIAAAAQgDAAgDgDg");
	this.shape_77.setTransform(887,118.4);

	this.shape_78 = new cjs.Shape();
	this.shape_78.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEgBgCgDQgCgCAAgFQAAgFADgDQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAAEgCADQgDADgEAAIgJAAIgWABIgdAAIgfABIgbAAg");
	this.shape_78.setTransform(862.4,117.6);

	this.shape_79 = new cjs.Shape();
	this.shape_79.graphics.f("#006600").s().p("AAMBnQgCgCgBgDIgBgTIgBgeIAAglQgTAXgTASQgTASgRANIgOAJQgEADgDAAQgEgBgDgDQgEgDAAgFQAAgDABgCIAEgEIABgBIAHgEQARgLAQgOQAQgOAQgQQAQgPAMgRIAAgSIgFAAIg4ABIgcAAQgFABgDgDQgDgCAAgGIACgHQACgCACgBIACAAIAEAAIAKAAIAHAAIAJAAIAQAAIAYgBIAWAAIAAgnQAAgGACgDQAEgCAFAAQAFAAACADQADACAAAFIAAAdIAAADIAAACIAAAGIAXgBIAPAAIAHAAIALgBIAGgBQAEABADADQADACAAAFQgBAEgCADQgCADgDAAIgNABIgSAAIgSABIgPAAIAAAbIAAASIABARIABASIAAAYIABAXQAAAIgDACQgCAEgHAAQgEAAgDgDg");
	this.shape_79.setTransform(838.6,118.3);

	this.shape_80 = new cjs.Shape();
	this.shape_80.graphics.f("#006600").s().p("ABUBjIgIgJIgPgTQgKAIgLAFQgMAFgPACQgKACgOABIggACIglABQgLAAgGgDQgFgDAAgGQAAgFADgDQACgDAFgBQAWgiAUgoQATgpARgxQABgEADgDQACgCAFAAQAEAAADADQADADAAAFIgEANIgHAXIgMAeIgNAcIgTAlQgIARgLAQIAHAAIAEAAIAEAAIAagBIAYgCIASgDQAKgCAIgEQAIgEAHgFIgQgXIgHgMIgCgGQAAgGADgDQADgDAFgBQAEAAACACQADACADAHIAMASIAOAUIAPASIALAOIADADIABAEQAAAFgEAEQgDAEgFAAQgDAAgEgCg");
	this.shape_80.setTransform(814.8,118.4);

	this.shape_81 = new cjs.Shape();
	this.shape_81.graphics.f("#006600").s().p("AgZAMIgVAAIgWgBIgQAAIgJAAQgEgBgCgDQgCgCAAgFQAAgFADgDQADgCAGAAIADAAIAGAAIATABIAZAAIB+gCQAGAAADADQADACAAAGQAAAEgCADQgDADgEAAIgJAAIgWABIgdAAIgfABIgbAAg");
	this.shape_81.setTransform(790.4,117.6);

	this.shape_82 = new cjs.Shape();
	this.shape_82.graphics.f("#006600").s().p("Ag5BmQgEgDAAgGIABgFQABgCADgCIABgBIAEgCQAPgIAJgHQAKgIAFgGQAFgIACgJQACgKAAgNIAAgqIgWABIgTAAIgHAAIgJAAQgFAJgHAKQgHAIgJAHIgGAEQAAAAgBABQAAAAgBAAQAAAAgBAAQgBAAAAAAQgGAAgCgDQgDgDAAgFIAAgEIAEgEQAJgHAGgIQAHgIADgIIAEgNIACgPIABgRIgBgLQAAgEADgDQADgCAFgBQAEAAADACQADACABAEIAAAMIgBASIgCARIAOAAIAJAAIAqAAIAogCIgIgPIgCgHQAAgEACgCQADgCADAAQABgBABAAQAAAAABABQAAAAABAAQAAAAABABIADAFIAJAPIAJARIAIALIABADIAAADQAAADgCACQgDACgDABQgDAAgDgDQgDgDgDgHIgMABIgMAAIgNABIgJAAIAAArQAAASgCAMQgDAMgGAJQgEAHgHAIQgJAHgLAIIgQAKQgGADgDABQgEgBgDgEgABhgqIgGgHIgKgSIgJgPIgFgJIgBgEQAAgDADgDQACgDAEAAIAEABIAEAGIAGAMIAKAQIAJAPIACADIAAACQAAAEgCACQgDADgDAAQgBAAAAAAQgBAAgBAAQAAgBgBAAQAAAAgBgBg");
	this.shape_82.setTransform(767.3,118.3);

	this.shape_83 = new cjs.Shape();
	this.shape_83.graphics.f("#006600").s().p("AgQBjQgQAAgKgCQgJgBgFgCQgJgEgFgGQgFgHAAgJQAAgHAEgHQADgHAHgGIAcgZIAegYIgfgWIgbgXIgTgQIgHgJQgCgFAAgDQAAgGADgDQADgEAFAAQAEAAACACIAEAEQAEAIAKAKQAKAJAQANIAoAgIANgLIALgIIALgIIADgDIAEgDIAHgGIAFgGIADgDIAFgBQAFAAADADQAEAEAAAFQAAAFgFAGQgFAFgMAJIgcAUIgfAXIgbAXIgUATIgHAIQgCADAAADQAAAEADACQADACAHACIAVACIAiAAIAZAAIAQgBIAJgBIAFgDIAEgCIADAAQAFAAADADQADADAAAFQAAADgCADQgCADgDADQgFACgHABIgSACIgeAAIgnAAg");
	this.shape_83.setTransform(741.9,118.3);

	this.shape_84 = new cjs.Shape();
	this.shape_84.graphics.f("#006600").s().p("AguBcQgNgHAAgQQAAgPARgOQARgNAfgHIgPgKIgTgMIgGgFQgBgDAAgDQAAgEACgEQADgEAEgEIAYgUIAngdIgBAAIgXABIgZABIgZABIgUAAQgJAAgDgCQgEgDABgFQgBgGADgDQADgCAGAAIACAAIAFAAIAGABIAIAAIAvgBIArgDIADAAIABAAQAHAAAFAEQAFACAAAGIgBAEIgDAFIgCACIgGADIgRAPIgVAQIgTAPIgNAMIAPALQAIAFAOAGQARAKALAHQAKAIAFAGQAFAHgBAGQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAFgIAIQgIAHAAAGQAAAGAGADQAGACAPAAQAQAAANgDQANgEAIgGQAIgHAAgIQAAgEgFgEQgEgFgKgGQgVAEgOAGg");
	this.shape_84.setTransform(718.1,118.8);

	this.shape_85 = new cjs.Shape();
	this.shape_85.graphics.f("#006600").s().p("AgSBkQgJgEgJgJQgEgEgCgDIgBgGQAAgEADgEQAEgDAEAAIAEABIAFAEIALAKQAGAEAEAAQACAAACgCQACgDABgFIADgPIACgWIABgaIAAgTIgCgRIgBgDIgCAAIgBAAIgCAAIgGABIgMAAIgLABIgFAeQgDANgDAKQgDAKgFAJQgGAMgKANQgJAMgLAMIgGAFIgFABQgFgBgEgDQgDgDAAgFQAAgEACgCIAHgIQAJgIAIgKQAIgLAHgLQAGgLACgJIAFgRIADgYIgCAAIgaABIgJAAQgGAAgDgCQgDgDAAgFQAAgFACgDQADgDAFAAIACAAIAEAAIAIAAIAQAAIALAAIABgVIABgWQABgGACgDQADgEAFAAQAFABADACQADADAAAEIAAACIAAADIgBAEIAAAGIgBAKIAAALIgBAJIAMAAIAJgBIAKgBIAEAAIADAAQAGAAAEACQAEACABAGIACALIABATIABAVQAAAXgCASQgCATgDALQgEAMgGAGQgHAGgJAAQgJAAgJgFgABaALIgFgEIgHgHIgRgYIgQgYIgLgUQgEgJAAgEQAAgEADgDQADgDAFAAIAFABIAEADIABACIACAFIANAZIARAZQAJANAJAJIADAFIABADQAAAFgDADQgDAEgFAAIgEgBg");
	this.shape_85.setTransform(694.6,118.3);

	this.shape_86 = new cjs.Shape();
	this.shape_86.graphics.f("#006600").s().p("AgfBVQgDgDAAgFIABgFIADgEIACgBIAEgCQAygRAZgZQAYgXAAghQAAgKgDgHQgDgGgFgEIgJgEIgLgDIgQAAIgYAAIgcABIgfACIgdADIgCAAIgBAAQgEAAgDgDQgCgDAAgEIABgHQABgCADgBIADgBIAIAAIAFgBIAKgBIAigCIAigBIAdAAQAhgBAQAOQAQANAAAcQAAAbgMAVQgNAWgZATIgSAKIgVALIgTAIQgJAEgDAAQgFAAgDgEg");
	this.shape_86.setTransform(670.2,119.1);

	this.shape_87 = new cjs.Shape();
	this.shape_87.graphics.f("#006600").s().p("AgsBkQgPgLgNgVQgJAUgHAKQgIAJgGABQgFAAgDgEQgCgDgBgEIABgFIAEgGQAMgOAHgSQAHgSACgRQAAgFAEgDQACgCAGAAQAEAAACACQAEADAAAFIgBAGIgDAJIgCALIALAQIANAPQAHAHAHADQAIAEAIAAQAJgBAFgHQAFgIABgMQAAgMgIgNQgHgOgPgQIgFgHQgBgDgBgEIABgFIADgGIAGgLIAOgUIAHgMIAEgJIAAgBIgOABIgOABIgRAAIgLAAIgGgBIgCAAIgFgDQgBgCAAgEQAAgFADgDQACgDAHABIAbAAIAVgBIAOgBIACAAIACAAQAJAAAFAEQAEADAAAGQAAAEgBAEIgGAJIgRAZIgLATIgFAKIABACIAEAFQAQARAIARQAJAQAAANQAAAVgMAOQgMAMgSAAQgSABgQgLgABOBaQgGgHgIgLIgHgOIgHgQIgGgOIgCgKQAAgFADgDQADgDAEAAIAFABIAEADIABACIACAHIAJAVQAFAKAHAKQAFAJAGAFIADAFIABAEQAAAFgDADQgEADgEAAQgFAAgGgFgABNghIgGgGIgLgOIgQgVQgEgHABgCQgBgDADgDQADgCADAAIAEABIAEAEIAJANIALAPIAKANQADACgBADQAAADgCADQgDADgDgBIgEgBgABmgzIgGgGIgLgOIgQgWQgEgGAAgCQAAgDADgDQACgCAEAAIAEABIADAEIAGAIIAJALIAJANIAHAIIACADIAAADQAAADgCADQgDADgDgBIgBABIgDgCg");
	this.shape_87.setTransform(646.9,117.8);

	this.shape_88 = new cjs.Shape();
	this.shape_88.graphics.f("#006600").s().p("AhXBmQgDgCgBgEIAAgLIgBgWIAAgZIAAgXIAAghIABgiIAAgcIABgPQABgEADgCQADgDAEAAQAFAAADADQACADAAAFIAAAFIAAAHIgCAgIAAAvIAAAmIABAhIABAXIAAACIAAABQAAAEgDADQgDADgFAAQgEAAgDgDgAAKBcQgKgFgJgKQgGgGgDgGQgEgHAAgFQAAgFADgDQADgDAFAAIAFABIADADIABABIACAEQADALAJAHQAJAGALAAQAOAAAKgHQALgHADgNQABgDADgCQADgCADAAQAFAAADADQADADAAAEIgBAJIgFAJQgIANgOAHQgNAHgRABQgMAAgLgFgAA4gHQgEgDAAgFQAAAAAAgBQAAgBABAAQAAgBAAAAQAAgBABAAIAEgFQAHgGADgHQAEgHAAgHQAAgLgLgGQgKgFgSgBQgLAAgJADQgKACgKAEIgEACIgDAAQgEAAgDgDQgDgDAAgFQAAgEADgDQAEgDAIgDQAHgDAKgCQALgBAOAAQASAAAOAFQANAFAIAKQAHAKAAANQAAAMgFALQgGALgJAIIgFADIgFABQgEAAgDgDg");
	this.shape_88.setTransform(622.5,118.2);

	this.shape_89 = new cjs.Shape();
	this.shape_89.graphics.f("#006600").s().p("AhXBmQgDgCgBgEIAAgLIgBgWIAAgZIAAgXIAAghIABgiIAAgcIABgPQABgEADgCQADgDAEAAQAFAAADADQACADAAAFIAAAFIAAAHIgCAgIAAAvIAAAmIABAhIABAXIAAACIAAABQAAAEgDADQgDADgFAAQgEAAgDgDgAAKBcQgKgFgJgKQgGgGgDgGQgEgHAAgFQAAgFADgDQADgDAFAAIAFABIADADIABABIACAEQADALAJAHQAJAGALAAQAOAAAKgHQALgHADgNQABgDADgCQADgCADAAQAFAAADADQADADAAAEIgBAJIgFAJQgIANgOAHQgNAHgRABQgMAAgLgFgAA4gHQgEgDAAgFQAAAAAAgBQAAgBABAAQAAgBAAAAQAAgBABAAIAEgFQAHgGADgHQAEgHAAgHQAAgLgLgGQgKgFgSgBQgLAAgJADQgKACgKAEIgEACIgDAAQgEAAgDgDQgDgDAAgFQAAgEADgDQAEgDAIgDQAHgDAKgCQALgBAOAAQASAAAOAFQANAFAIAKQAHAKAAANQAAAMgFALQgGALgJAIIgFADIgFABQgEAAgDgDg");
	this.shape_89.setTransform(306.4,22.9);

	this.shape_90 = new cjs.Shape();
	this.shape_90.graphics.f("#006600").s().p("AhdBwQgCgDAAgDIAAh+QgBgJAFgFQAEgEAKAAIA4AAQAKAAAEAEQAEAFAAAJIAABwQABAMgGAEQgFAFgOgBIgSgBQgHAAgCgDQgCgDgBgFQABgDACgDQADgCADgBIACAAIABABIAIAAIAIABQAEAAABgCQABgBABgEIAAgdIg1AAIAAAxQgBADgCADQgDACgEAAQgFAAgDgCgAhLAnIA1AAIAAgVIg1AAgAhKgTQAAAAgBABQAAAAAAAAQAAABAAAAQAAABAAAAIAAAQIA1AAIAAgQQAAAAgBgBQAAAAAAgBQAAAAAAAAQgBgBAAAAIgEgBIgrAAIgDABgABFBwIgYgBQgIAAgDgDQgCgDAAgFQAAgFACgDQADgCAFAAIABAAIADABIAKAAIALAAQAEAAADgBQACgCAAgGIAAhzQAAgEACgCQADgCAFgBQAFAAADAEQACACAAADIAAB6QABANgHAFQgFAFgOAAIgCAAgAAZBIQgDgCABgEIAAhbQAAgEACgDQADgDAFAAQAEAAADADQADADAAAEIAABbQAAAEgDACQgDACgEAAQgFAAgDgCgAhmg4QgDAAgDgDQgCgCAAgEQAAgEACgDQACgCAEAAIA/AAIgCgDIgCgDIgFgJIgBgCIgCgDIgDgEIAAgDQAAgEAEgDQADgDAEgBIAFACIAFAEIAIAOQADAGAAADQAAADgBACIgFAEIAxAAIAIgQIAGgPQACgEADgCQACgCADAAQAFAAADADQAEADAAAEQAAAEgEAHIgKASIA7AAQADAAADACQADADAAAEQAAAEgDACQgCADgEAAg");
	this.shape_90.setTransform(282.5,22.9);

	this.shape_91 = new cjs.Shape();
	this.shape_91.graphics.f("#006600").s().p("AguBcQgNgIAAgPQAAgQARgNQARgNAfgHIgPgKIgTgMIgGgFQgBgDAAgEQAAgDACgEQADgEAEgEIAYgUIAngdIgBAAIgXABIgZAAIgZABIgUABQgJAAgDgCQgEgDABgGQgBgFADgDQADgCAGAAIACAAIAFAAIAGABIAIAAIAvgBIArgDIADAAIABAAQAHAAAFAEQAFACAAAGIgBAEIgDAFIgCABIgGAEIgRAOIgVARIgTAQIgNALIAPALQAIAFAOAGQARAKALAHQAKAIAFAGQAFAGgBAHQAAAOgLALQgLALgSAGQgTAHgWAAQgZAAgNgIgAgFAqQgPAFgIAIQgIAHAAAGQAAAGAGADQAGACAPAAQAQAAANgEQANgDAIgGQAIgHAAgIQAAgEgFgEQgEgEgKgHQgVAFgOAFg");
	this.shape_91.setTransform(258,23.5);

	this.shape_92 = new cjs.Shape();
	this.shape_92.graphics.f("#006600").s().p("AggBhQgJgLAAgRQAAgOAIgNQAHgLALgJQAMgHANgBIAIABIAKAEIgDgRIgEgUIAAgCIAAgBQAAgFADgCQADgDAEAAQADAAAEACQACACABADIAAABIACAHIAEASIABANIABASIAJAHIAHAHIAEADIADADIABABIABABIAEADIAKAGIAEAEQACADAAADQAAAFgDADQgDADgEAAQgDAAgFgCIgKgIIgDgDIgGgFIgKgJQgHAXgNANQgPAOgSAAQgQAAgKgLgAgFAnQgGAEgEAIQgEAHgBAJQABAJAEAFQADAFAHAAQANAAAKgMQAIgMADgUIgKgGQgFgBgFAAQgIgBgGAFgAhfAjQgDgEAAgFIABgEIABgCIAEgFQAMgMALgPQALgQAHgRIgKABIgNAAIgMABIgGAAQgFgBgEgCQgDgDAAgFQABgDACgDQACgEAEgBIABAAIAGAAIAKAAIAZAAIAJAAIgBgRIgCgMIgBgCIAAAAQAAgFAEgDQACgDAGAAQAGAAAEAIQACAIAAAQIAAAFIAAAEIAIAAIAKAAIATgBIAOgBIAMgBIgDgKIgBgKQAAgEADgDQADgDAEAAQADAAADABQADABABADIAAACIABAGQABAPAMAOQALAOAUAKIADADQABACAAADQAAAEgCAEQgDADgFAAQgEAAgPgKQgHgGgGgFQgHgHgFgIIgIABIgFAAIgHAAIgIABIgUABIgOAAIgRABQgIATgLAUQgLARgPATIgDADIAAACIgEADIgFABQgGAAgDgDg");
	this.shape_92.setTransform(234.7,23.2);

	this.shape_93 = new cjs.Shape();
	this.shape_93.graphics.f("#006600").s().p("AAwBrIgEgEIgFgGIgDgFIgGgEIgRgPIgWgTIgkgdIgDgDIgEgDIgGgGQgFAAgDgDQgEgDAAgFIACgGIAFgFIABgBIADgDIAHgEQASgMAYgSQAWgSAdgZIAFgFIACgGQABgDADgCQACgBAEAAQAGAAADADQAEADAAAGQAAAFgDAEQgCAFgHAFIgUAQIgbAVIgbAWIgZARIANAKIAsAkIAcAXIAOANQAEAFABADIABAFQAAAFgDAEQgEAEgFAAIgFgBg");
	this.shape_93.setTransform(210.1,23.3);

	this.shape_94 = new cjs.Shape();
	this.shape_94.graphics.f("#006600").s().p("AgfBhQgKgLAAgRQAAgOAIgNQAHgLAMgJQALgHAMgBIAJABIAJAEIgCgRIgDgUIgBgCIAAgBQAAgFADgCQADgDAFAAQACAAAEACQACACACADIAAABIABAHIAEASIABANIACASIAIAHIAHAHIAEADIACADIABABIACABIAEADIAKAGIAFAEQABADAAADQgBAFgCADQgDADgEAAQgDAAgEgCIgLgIIgEgDIgFgFIgJgJQgIAXgOANQgOAOgSAAQgQAAgJgLgAgEAnQgIAEgDAIQgFAHAAAJQAAAJAFAFQADAFAIAAQANAAAIgMQAJgMADgUIgLgGQgEgBgFAAQgIgBgFAFgAheAjQgEgEAAgFIAAgEIACgCIAEgFQAMgMALgPQAKgQAIgRIgKABIgNAAIgLABIgHAAQgFgBgEgCQgCgDAAgFQgBgDADgDQADgEADgBIACAAIAEAAIALAAIAYAAIAKAAIgBgRIgCgMIAAgCIAAAAQAAgFACgDQAEgDAEAAQAIAAACAIQAEAIAAAQIAAAFIgBAEIAIAAIAKAAIATgBIAOgBIANgBIgEgKIgCgKQAAgEAEgDQADgDAEAAQADAAADABQACABABADIABACIABAGQACAPALAOQALAOATAKIAEADQABACAAADQAAAEgCAEQgEADgDAAQgFAAgOgKQgIgGgHgFQgGgHgFgIIgIABIgGAAIgFAAIgJABIgUABIgOAAIgRABQgIATgLAUQgLARgPATIgCADIgBACIgFADIgEABQgFAAgDgDg");
	this.shape_94.setTransform(186.7,23.2);

	this.shape_95 = new cjs.Shape();
	this.shape_95.graphics.f("#006600").s().p("AgcBqQgJgFgJgJIgGgGIgBgGQAAgFADgDQADgEAFAAIAEABIAFAFIALAKQAGAEAEAAQACAAADgCQACgDABgEQACgGABgLIABgYIABgbIAAgLIgBgNIAAgJIgBgCIgBgBIgCAAIgCABIgHAAIgMABIgLAAIgFAeQgCANgEAKQgDALgFAIQgHANgJAMQgJANgMALIgFAFIgFABQgFAAgEgDQgDgEAAgFQAAgDACgDIAHgIQAJgHAIgLQAIgKAGgLQAHgLACgJIAFgSIADgXIgGAAIgRABIgJAAIgEAAIgBAAQgGAAgDgDQgDgCAAgFQAAgGADgDQADgDAGAAIAYABIAHAAIAIgBIABgUIABgWQAAgHADgDQADgDAFAAQAFAAADADQADACAAAFIgBAJIgBAQIgBAUIAMgBIAJAAIALgBIADgBIADAAQAGAAAEADQAEACABAFIACAMIABASIABAWQAAAWgCATQgCASgDAMQgEALgHAGQgFAGgKAAQgJAAgJgEgABPAjIgKgLQgJgLgIgNIgQgXIgKgUQgEgJAAgEQAAgEACgDQADgDAFAAIAFABIAEAEIABABIACAGIANAYIARAZIASAWIADAEIABAFQAAAFgDADQgDADgFAAIgBAAQgDAAgCgCgABOghIgGgGIgLgOIgPgVQgFgHAAgCQABgDACgDQACgCAEAAIAEABIAEAFIAFAIIAJALIAJAMIAHAJIACACIAAADQAAADgCADQgDADgDAAIgEgCgABngzIgGgGIgLgOIgQgVQgEgHAAgCQAAgDADgDQACgCAEAAIAEABIADAFIAGAHIAIAMIAJAMIAIAJIACACIAAADQAAADgDADQgCADgDAAIgBAAIgDgCg");
	this.shape_95.setTransform(162.8,22.4);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_95},{t:this.shape_94},{t:this.shape_93},{t:this.shape_92},{t:this.shape_91},{t:this.shape_90},{t:this.shape_89},{t:this.shape_88},{t:this.shape_87},{t:this.shape_86},{t:this.shape_85},{t:this.shape_84},{t:this.shape_83},{t:this.shape_82},{t:this.shape_81},{t:this.shape_80},{t:this.shape_79},{t:this.shape_78},{t:this.shape_77},{t:this.shape_76},{t:this.shape_75},{t:this.shape_74},{t:this.shape_73},{t:this.shape_72},{t:this.shape_71},{t:this.shape_70},{t:this.shape_69},{t:this.shape_68},{t:this.shape_67},{t:this.shape_66},{t:this.shape_65},{t:this.shape_64},{t:this.shape_63},{t:this.shape_62},{t:this.shape_61},{t:this.shape_60},{t:this.shape_59},{t:this.shape_58},{t:this.shape_57},{t:this.shape_56},{t:this.shape_55},{t:this.shape_54},{t:this.shape_53},{t:this.shape_52},{t:this.shape_51},{t:this.shape_50},{t:this.shape_49},{t:this.shape_48},{t:this.shape_47},{t:this.shape_46},{t:this.shape_45},{t:this.shape_44},{t:this.shape_43},{t:this.shape_42},{t:this.shape_41},{t:this.shape_40},{t:this.shape_39},{t:this.shape_38},{t:this.shape_37},{t:this.shape_36},{t:this.shape_35},{t:this.shape_34},{t:this.shape_33},{t:this.shape_32},{t:this.shape_31},{t:this.shape_30},{t:this.shape_29},{t:this.shape_28},{t:this.shape_27},{t:this.shape_26},{t:this.shape_25},{t:this.shape_24},{t:this.shape_23},{t:this.shape_22},{t:this.shape_21},{t:this.shape_20},{t:this.shape_19},{t:this.shape_18},{t:this.shape_17},{t:this.shape_16},{t:this.shape_15},{t:this.shape_14},{t:this.shape_13},{t:this.shape_12},{t:this.shape_11},{t:this.shape_10},{t:this.shape_9},{t:this.shape_8},{t:this.shape_7},{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1015.5,576.3);


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
	this.shape.graphics.f("#33CCFF").s().p("AEpCSQgnhGhPgrQhRgqhiAAQhhAAhRAqQhPArgnBGQgDgTAAgUQAAhGAfg5QgfggAAgsQAAgvAjghQAjghAyAAQAxAAAkAhIALALQAogKArAAQAvAAApALIAHgGQAjgiAyAAQAxAAAkAiQAjAhAAAvQAAAqgdAgQAdA3AABEQAAA3gUAwQAMgeAFgigAChiVQgQAPAAAUQAAAVAQAPQAPAPAXAAQAWAAAPgPQAMgLADgPIhWgyIgEAFgAj6hqQACAQANAMQAPAPAXAAQAVAAAQgPQAQgPAAgVQAAgUgQgPIgFgFg");
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


(lib.CircleFrame = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#000000").ss(6,1,1).p("APoAAQAAGekkElQklElmfAAQmdAAklklQklklAAmeQAAmeElklQElkkGdAAQGfAAElEkQEkElAAGeg");

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-103,-103,206,206);


(lib.bg_area_01 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#BAD5F7").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


(lib.Bg_area = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


(lib.StatusBar = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.keyText = new cjs.Text("0", "40px 'MS Gothic'", "#660000");
	this.keyText.name = "keyText";
	this.keyText.lineHeight = 42;
	this.keyText.lineWidth = 55;
	this.keyText.parent = this;
	this.keyText.setTransform(1136.7,6.8);

	this.instance = new lib.KeyBase("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(1089,25,0.744,0.746,0,0,0,12.1,26.8);

	this.shape = new cjs.Shape();
	this.shape.graphics.f("#660000").s().p("AA6BUIgFgFIgJgLIgRgVIgIgKIgTgXIgPAUIgMAQIgMAOIgQATIgDACQAAAAgBAAQAAABAAAAQgBAAAAAAQgBAAAAAAQgEgBgDgDQgDgCgBgFIABgDIAFgGIAQgSIATgXIATgZIgRgVIgWgZIgTgYIgCgBIAAgDQAAgEADgDQADgDAEAAQABAAAAAAQABAAAAAAQABAAAAAAQABABAAAAIAGAGIAVAaIAWAaIAJAKIAMgTIAQgWIARgZIADgDIAEgBQAEAAADADQADADAAAEIgBACIgCAEIgNATIgIANIgJALIgMARIgGAJIAlAsIAMAOIALANIACACIAAADQAAAEgDADQgCADgFAAIgFgCg");
	this.shape.setTransform(1117.8,26.6);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape},{t:this.instance},{t:this.keyText}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(1080,4.8,113.3,44.1);


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


(lib.Bubble_break = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble_body("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,48.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regX:48.5,regY:48.5,scaleX:4.86,scaleY:4.86,x:47.8,y:47.8,alpha:0},11,cjs.Ease.quadOut).wait(1));

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
	this.normal.setTransform(30,22.7,1,1,0,0,0,14,18.7);

	this.spawn = new lib.Wine_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(30,22.6,1,1,0,0,0,14,18.7);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},6).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(15,3,30,39.5);


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
	this.normal.setTransform(18,0);

	this.spawn = new lib.Key_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(30,26.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},6).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(18,0,24,53.7);


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
	this.normal.setTransform(30,25.8,1,1,0,0,0,20,21.8);

	this.spawn = new lib.Apple_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(30,25.8,1,1,0,0,0,20,21.8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.normal}]}).to({state:[{t:this.spawn}]},6).wait(9));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(10,1.5,40,48.5);


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


(lib.Background = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// bg
	this.instance = new lib.bg_area_01();
	this.instance.parent = this;
	this.instance.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


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


(lib.SnakeHead = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Head
	this.body = new lib.Head();
	this.body.name = "body";
	this.body.parent = this;
	this.body.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get(this.body).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(12,12,36,36);


(lib.SnakeBody = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Head
	this.body = new lib.Body();
	this.body.name = "body";
	this.body.parent = this;
	this.body.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get(this.body).wait(1));

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
p.nominalBounds = new cjs.Rectangle(0,900,97.4,97.4);


(lib.Items = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// wine
	this.wine = new lib.Wine();
	this.wine.name = "wine";
	this.wine.parent = this;
	this.wine.setTransform(30,29.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get(this.wine).wait(1));

	// apple
	this.apple = new lib.Apple();
	this.apple.name = "apple";
	this.apple.parent = this;
	this.apple.setTransform(30,29.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get(this.apple).wait(1));

	// key
	this.key = new lib.Key();
	this.key.name = "key";
	this.key.parent = this;
	this.key.setTransform(30,29.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get(this.key).wait(1));

}).prototype = getMCSymbolPrototype(lib.Items, new cjs.Rectangle(28,3,40,53.7), null);


(lib.Exp_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Gaige
	this.instance = new lib.Gaige("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(104.3,47,0.074,0.074,0,0,0,69.9,26.2);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({regY:25.9,scaleX:1,scaleY:1,x:104.4,y:46.9},9).wait(83));

	// objs
	this.instance_1 = new lib.Wine_spawn("synched",0,false);
	this.instance_1.parent = this;
	this.instance_1.setTransform(48.5,224.4,1,1,0,0,0,14.8,17.9);

	this.instance_2 = new lib.Apple_spawn("synched",0,false);
	this.instance_2.parent = this;
	this.instance_2.setTransform(383.4,47.7,1,1,0,0,0,19.6,21.5);

	this.instance_3 = new lib.Key_spawn("synched",0,false);
	this.instance_3.parent = this;
	this.instance_3.setTransform(354.6,580.9,1,1,0,0,0,12.9,26.9);

	this.instance_4 = new lib.Key_spawn("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(124.1,402.1,1,1,0,0,0,12.9,26.9);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_4},{t:this.instance_3},{t:this.instance_2},{t:this.instance_1}]}).wait(92));

	// Frog_normal
	this.instance_5 = new lib.Frog_normal("synched",29,false);
	this.instance_5.parent = this;
	this.instance_5.setTransform(201.3,329.2,0.11,0.11,0,0,0,30.2,30.2);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:30,regY:30,scaleX:1,scaleY:1,startPosition:34},9).wait(83));

	// Frog_normal
	this.instance_6 = new lib.Frog_normal("synched",29,false);
	this.instance_6.parent = this;
	this.instance_6.setTransform(593.2,142.7,0.17,0.17,0,0,0,29.9,29.9);

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({regX:30,regY:30,scaleX:1,scaleY:1,startPosition:34},9).wait(83));

	// exp_text_1
	this.instance_7 = new lib.exp_text_1("synched",0);
	this.instance_7.parent = this;
	this.instance_7.setTransform(1733,314.9,1,1,0,0,0,507.7,288.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_7).to({x:541},9,cjs.Ease.quadOut).wait(83));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(46.1,26.8,2194.7,576.3);


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
p.nominalBounds = new cjs.Rectangle(0,0,60,60);


(lib.Enemies = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// flash0.ai
	this.instance = new lib.Frog();
	this.instance.parent = this;
	this.instance.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = getMCSymbolPrototype(lib.Enemies, new cjs.Rectangle(0,0,60,60), null);


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
	this.instance_5 = new lib.One("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(1084.8,541);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(3).to({startPosition:0},0).to({x:1470.2,y:542.3},6).wait(8));

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
p.nominalBounds = new cjs.Rectangle(0,0,1295.8,900);


(lib.AreaAnim = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Stage_e
	this.instance = new lib.Stage_e("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(788.8,1010.1);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(14).to({_off:false},0).to({y:802.1},7,cjs.Ease.quadOut).wait(71));

	// Stage_g
	this.instance_1 = new lib.Stage_g("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(628.1,1007.1);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(13).to({_off:false},0).to({y:799.1},7,cjs.Ease.quadOut).wait(72));

	// Stage_a
	this.instance_2 = new lib.Stage_a("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(458.6,1006.4);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(12).to({_off:false},0).to({y:798.4},7,cjs.Ease.quadOut).wait(73));

	// Stage_t
	this.instance_3 = new lib.Stage_t("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(306.4,1008.6);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(11).to({_off:false},0).to({y:800.6},7,cjs.Ease.quadOut).wait(74));

	// TitleAnim_s_no_guide
	this.instance_4 = new lib.TitleAnim_s_no_guide("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(133.7,733.6,1,1,0,0,0,-40.3,89.2);
	this.instance_4._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1).to({_off:false},0).wait(91));

	// 1
	this.instance_5 = new lib.One("single",0);
	this.instance_5.parent = this;
	this.instance_5.setTransform(596.9,435.5,1.187,1.187,0,0,0,0.1,0.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({regX:0,regY:0,scaleX:0.97,scaleY:0.97,x:1089.6,y:541},6,cjs.Ease.quadOut).wait(1).to({scaleX:1,scaleY:1,x:1084.8},0).wait(85));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#75FF6D").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(92));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


(lib.Area_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{start:0,waitToGo:89,goEnd:110});

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

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},81).to({state:[{t:this.goButton}]},8).to({state:[{t:this.instance_1}]},3).to({state:[{t:this.instance_1}]},5).to({state:[{t:this.instance_1}]},13).wait(21));
	this.timeline.addTween(cjs.Tween.get(this.goButton).wait(89).to({_off:false},0).to({_off:true,scaleX:1.4,scaleY:1.4,mode:"synched",startPosition:0,loop:false},3).wait(39));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(89).to({_off:false},3).to({scaleX:1.03,scaleY:1.03,x:600.1},5).to({regX:0.1,regY:0.1,scaleX:9.67,scaleY:9.67,x:599.7,y:400.5,alpha:0},13).wait(21));

	// Exp_1
	this.instance_2 = new lib.Exp_1("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(204.8,28,1,1,0,0,0,204.8,28);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(19).to({_off:false},0).wait(70).to({startPosition:70},0).to({x:1392.9,startPosition:27},8).wait(34));

	// AreaAnim
	this.instance_3 = new lib.AreaAnim("synched",0,false);
	this.instance_3.parent = this;
	this.instance_3.setTransform(600,450,1,1,0,0,0,600,450);

	this.instance_4 = new lib.AreaAnim_remove("synched",0,false);
	this.instance_4.parent = this;
	this.instance_4.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_3}]}).to({state:[{t:this.instance_4}]},89).wait(42));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


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


(lib.AreaTitle = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Area_1
	this.areaTitleAnim = new lib.Area_1();
	this.areaTitleAnim.name = "areaTitleAnim";
	this.areaTitleAnim.parent = this;
	this.areaTitleAnim.setTransform(647.9,481.2,1,1,0,0,0,647.9,481.2);

	this.timeline.addTween(cjs.Tween.get(this.areaTitleAnim).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


// stage content:
(lib.tsnake_v001 = function(mode,startPosition,loop) {
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
	this.instance_5.setTransform(174.2,133.7,1,1,0,0,0,30,29.8);

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
		{src:"../../images/T.png", id:"T"},
		{src:"../../images/tunnel_0001.jpg", id:"tunnel_0001"},
		{src:"../../images/tunnel_0002.jpg", id:"tunnel_0002"},
		{src:"../../images/tunnel_0003.jpg", id:"tunnel_0003"},
		{src:"../../images/yfts.png", id:"yfts"}
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
var Areas;

(function(){

    Areas= [
        {
            "items":["apple", "coin", "key", "wine"],
            "enemies":["frog"],
        }
    ];

})();
var Cood;

(function () {

    Cood = {
        "UNIT":60,
        "MAX_X":20,
        "MAX_Y":14,
        "localToWorld": function (local) {
            return local * this.UNIT;
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
        "init": function (map, pos, id) {
            this.map = map;
            this.id = id;
            this.position = pos.clone();
            this.mc = cjsUtil.createMc(id);
            this.mc.x = this.position.x;
            this.mc.y = this.position.y;
            this.map.addChild(this.mc);
            this.spawn();
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
    "isCopyOf": function (v) {
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
    "mult": function (s) {
        return new Vector(this.x * s, this.y * s);
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

        Enemy = function (map, pos, id) {
            this.init(map, pos, id);
        };

        Enemy.prototype = new FieldObject();

        Enemy.prototype.attackedTest = function (p) {
            return false;
        };

        Enemy.prototype.defeat = function () {
            this.setState("defeated", _.bind(function(){
                this.remove();
            }, this));
            return false;
        };

        Enemy.prototype.setFear = function () {
            if (this.state == "normal") {
                this.setState( "fear");
            }
            return false;
        };

        Enemy.prototype.endFear = function () {
            if (this.state == "fear") {
                this.setState( "normal");
            }
            return false;
        };

    });

})();

var Item;

(function () {

    StartTasks.push(function () {

        var effects = {
            "Key": function (game, snake) {
                game.addKey(this.position.clone());
            },
            "Apple": function (game, snake) {
                snake.powerUp(300);
                snake.addBody();
            },
            "Wine": function (game, snake) {
                game.setVmax(100);
            },
        };

        Item = function (map, pos, id) {
            this.init(map, pos, id);
        };

        Item.prototype = new FieldObject();

        Item.prototype.effect = function (game, snake) {
            _.bind(effects[this.id], this)(game, snake);
        };

    });


})();

var SnakeBody;

(function () {

    SnakeBody = function (map, position, isHead) {
        this.map = map;
        if (isHead) {
            this.mc = cjsUtil.createMc("SnakeHead");
        } else {
            this.mc = cjsUtil.createMc("SnakeBody");
        }
        this.mc.body.gotoAndPlay(Math.floor(Math.random() * 60));
        this.map.addChildAt(this.mc, this.map.numChildren);
        this.position = position.clone();
        this.direction = DIRECTION.s.clone();
    };

    SnakeBody.prototype = {
        "effect": function () {
        },
        "pos": function (p) {
            this.position.x = p.x;
            this.position.y = p.y;
        },
        "dir": function (d) {

            if (d.x == this.direction.x &&
                d.y == this.direction.y) {
                return;
            }

            this.direction.x = d.x;
            this.direction.y = d.y;
            if (d.x == -1) {
                this.mc.body.rotation = 180;
            } else if (d.x == 1) {
                this.mc.body.rotation = 0;
            } else {
                if (d.y == 1) {
                    this.mc.body.rotation = 90;
                } else {
                    this.mc.body.rotation = 270;
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

    Snake = function (map, position) {
        this.map = map;
        this.bodies = [];
        this.addBody(position);
        this.addBody(position);
        this.addBody(position);
        this.addBody(position);
        this.addBody(position);
        this.addBody(position);
        this.direction = DIRECTION.s.clone();
        this.power = 1000;
    };

    Snake.prototype = {
        "POWER_MAX": 5000,
        "addBody": function (v) {
            if(!v){
                v = this.bodies[this.bodies.length - 1].position.clone();
            }
            var b = new SnakeBody(this.map, v, this.bodies.length == 0);
            this.bodies.push(b);
        },
        "move": function (process) {
            _.forEach(this.bodies, _.bind(function (b) {
                b.update(b.direction.mult(process));
            }, this));
        },
        "powerUp": function (v) {
            this.power += v;
            if(this.power >= this.POWER_MAX){
                this.power = this.POWER_MAX;
            }
        },
        "powerDown": function (v, onDead) {
            this.power -= v;
            if(this.power <= 0){
                onDead();
            }
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
                    prevDir.isCopyOf(nextDir);
                    prevPos.isCopyOf(nextPos);
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

                b.update(new Vector(0, 0));
                i++;
            }, this));

        },
        "hitTest": function () {

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
        "setDirection": function (d) {
            if (this.getHead().direction.clone().add(d).isZero()) {
                return;
            } else {
                this.direction = d;
            }
        },
    };

})();
var KeyManager;

(function () {

    $(window).keypress(function (e) {
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
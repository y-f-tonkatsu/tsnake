var Game

(function () {

    const SPEEDS = [0, 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60];

    var tasks = [];
    var backgroundMc;
    var statusBarMc;

    Game = function (stage) {

        this.area = 0;

        this.stage = stage;

        this.tiles = [];
        this.enemies = [];
        this.items = [];

        this.speed = 3;
        this.process = 0;

        createjs.Ticker.addEventListener("tick", this.loop);

    }

    Game.prototype = {

        "isFree": function (p) {
            var b = true;
            _.each(_.concat(this.enemies, this.items), _.bind(function (obj) {
                if(obj.position.equals(p)){b = false;}
            }, this));
            return b;
        },
        "loop": function () {
            _.each(tasks, _.bind(function (task) {
                task();
            }, this));
            this.stage.update();
        },
        "setMainTitle": function () {

            this.clearTasks();

            var mainTitleMc = cjsUtil.createMc("MainTitle");
            this.stage.addChild(mainTitleMc);
            var g = new createjs.Graphics();
            g.setStrokeStyle(1);
            g.beginStroke("#000000");
            g.beginFill("red");
            g.drawCircle(0, 0, 30);
            var shape = new createjs.Shape(g);
            mainTitleMc.addChild(shape);

            var x = 0;
            var y = 0;
            this.addTask(function () {
                g.mt(x, y);
                x += Math.random();
                y += Math.random();
                g.lt(x, y);
            });

            var titleClickListener = _.bind(function () {
                this.stage.removeChild(mainTitleMc);
                this.stage.removeEventListener(titleClickListener);
                this.setAreaTitle();
            }, this);
            this.stage.addEventListener("click", titleClickListener);

        },
        "setAreaTitle": function () {

            this.clearTasks();

            var areaTitleMc = cjsUtil.createMc("AreaTitle");
            this.stage.addChild(areaTitleMc);
            areaTitleMc.gotoAndStop(this.area);

            var titleClickListener = _.bind(function () {
                this.stage.removeChild(areaTitleMc);
                this.initGame();
                this.startGameLoop();
            }, this);
            this.stage.addEventListener("click", titleClickListener);

        },
        "setBg": function () {
            backgroundMc = cjsUtil.createMc("Background");
            backgroundMc.gotoAndStop(this.area);
            this.stage.addChild(backgroundMc);

            statusBarMc = cjsUtil.createMc("StatusBar");
            this.stage.addChild(statusBarMc);

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

            this.snake.powerDown(1, _.bind(function () {
                this.gameOver();
            }, this));

            statusBarMc.powerGauge.scaleX = this.snake.power * 0.0001;
            statusBarMc.powerGauge.x = 16;

            if (this.process >= Cood.UNIT) {
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
                this.process += SPEEDS[this.speed];
            }

        },
        "initGame": function () {

            this.setBg();
            this.createMap(new Vector(Cood.MAX_X, Cood.MAX_Y));
            this.snake = new Snake(this.stage, new Vector(1, 1));
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
        "addTask": function (task) {
            tasks.push(_.bind(task, this));
        },
        "clearTasks": function () {
            tasks = [];
        },
        "stopGameLoop": function () {
            this.clearTasks();
        },
        "startGameLoop": function () {
            this.clearTasks();
            this.addTask(this.gameLoop);
        },
        "gameOver": function () {
            this.stopGameLoop();
            console.log("GameOver");
        },
        "spawnEnemy": function () {

            if (Math.random() > 0.1) {
                return;
            }

            var x = Math.floor(Math.random() * Cood.MAX_X);
            var y = Math.floor(Math.random() * Cood.MAX_Y);
            var v = new Vector(x, y);

            if(this.isFree(v)){
                var enemy = new Enemy(stage, v, "Frog");
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

            if(this.isFree(v)){
                var item = new Item(stage, v, "Key");
                this.items.push(item);
            }

        },

    };

})();

var cjsUtil;
var stage;
var game;

$(function () {

    cjsUtil = new CjsUtil(AdobeAn, "12203EAFB022374BAF15F927FCA8A97A");

    cjsUtil.loadImages(function(){
        stage = new createjs.Stage($("#canvas--main").get(0));
        game = new Game(stage);
        game.setMainTitle();

        createjs.Ticker.init();
    });


});
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
        "MAX_Y":15,
        "localToWorld": function (local) {
            return local * this.UNIT;
        }
    };

})();



var FieldObject = function(stage, pos, id){
    if(stage){
        this.init(stage, pos, id);
    }
};

FieldObject.prototype = {
    "init": function (stage, pos, id) {
        this.stage = stage;
        this.id = id;
        this.position = pos.clone();
        this.mc = cjsUtil.createMc(id);
        this.mc.x = this.position.x;
        this.mc.y = this.position.y;
        stage.addChild(this.mc);
        this.spawn();
    },
    "update": function (process) {
        this.mc.x = Cood.localToWorld(this.position.x);
        this.mc.y = Cood.localToWorld(this.position.y);
    },
    "spawn":function(){
        this.state = "spawn";
        this.mc.gotoAndStop("spawn");

        this.onSpawnEndListener = _.bind(function (e) {
            if (this.mc[this.state].currentFrame == this.mc[this.state].totalFrames - 1) {
                this.mc.gotoAndStop("normal");
                this.mc.removeEventListener("tick", this.onSpawnEndListener);
                this.state = "normal"
            }
        }, this);

        this.mc[this.state].addEventListener("tick", this.onSpawnEndListener);
    },
    "hitTest":function(p){
        if(this.state == "spawn"){
            return false;
        }
        return this.position.equals(p);
    },
    "remove":function(){
        this.mc.stop();
        this.stage.removeChild(this.mc);
        this.mc = null;
        this.state = "removed";
    }
}
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



(function (cjs, an) {

var p; // shortcut to reference prototypes
var lib={};var ss={};var img={};
lib.ssMetadata = [];


// symbols:



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


(lib.PowerGauge = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#3366FF").s().p("AvnDIIAAmPIfPAAIAAGPg");
	this.shape.setTransform(100,20);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,200,40);


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


(lib.KeyBase = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FFE537").s().p("AAJEMIgGAAIgGAAQgQAAgLgLQgMgMAAgQIAAkOQgXgJgUgTQgigiAAgwQAAgwAigiQAigiAwAAQAvAAAjAiQAhAiAAAwQAAAwghAiQgUATgXAJIAAB9IA1AAQAMAAAJAJQAKAJAAAOQAAANgKAJQgJAKgMAAIg1AAIAAA4IA1AAQAMAAAJAKQAKAJAAANQAAANgKAKQgJAJgMAAgAgdiyQgMALAAAQQAAAQAMALQALALAPAAQAPAAALgLQALgLAAgQQAAgQgLgLQgLgLgPAAQgPAAgLALg");
	this.shape.setTransform(12,26.8);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,24,53.7);


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


(lib.MainTitle = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// T-SNAKE
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF9900").s().p("AqLPpQgdgbgBgtIAA61IgIAAQgjgCgbggQgZgggCgsQACgsAYggQAagfAjgDIVigSQAnABAZAeQAYAdACAvQgCAygXAeQgYAfgmAAIx/ASIAAJxIOngLQAoAAAaAdQAYAdACAyQgCAwgVAeQgWAeglABIuxAMIAAKeIR/gKQAmABAZAdQAZAeABAwQgBAxgYAfQgXAegnAAIyBAHQgDApgeAYQgdAYgwAAQgyAAgegag");
	this.shape.setTransform(1102.5,485.6);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF9900").s().p("ArGPoQgdgcgBgsIAA8+QABgsAegcQAfgcAugBQAwABAeAcQAfAcABAsIAAMoQCyh5CxiSQCwiRCYiWQCYiVBriFQAUgbAVgMQAVgMAbABQAuABAhAhQAhAhABAwQABARgHAQQgHAPgaAgQgbAeg8BAQiICTisCZQisCbjMChIOHOdQANAMAGAUQAHAUAAAXQgBA0ghAlQgiAkgzABQgUAAgUgIQgUgKgPgQIuGvLIgZASQg6ArgcASQgcATgcAQIAAMgQgBAsgfAcQgeAcgwAAQgwAAgegcg");
	this.shape_1.setTransform(932,481.3);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FF9900").s().p("AtvQEQgjgdgBgtQACgPAqhuQAqhvBKi1QBJi2BdjhIDDnRQBljxBljoIAnhbIAfhIIANgiQALgeAUgLQAVgNAjABQAvAAAfAcQAeAbABAoIgBAPIgFAVIAAADIgEAHQgDACgDAGQBFCxBICtQBLCuBcDKQBdDKB/EJQCAEJCxFoQAHALACAKQADAIAAAJQgBAtgkAdQghAfg1ABQgnACgVgTQgVgRgghBQhOiahcjCQhbjBhxkAQhzj9iTlQIhXjMIhNC5Ih5EdIheDjIhTDRICHgCIDAgDIB4gBQA2gBAJgCIA2gEIAogBQAsABAdAdQAdAeABAtQAAAhgNAcQgNAegWAMQgHAHgPACQgPACgnABIh1ACIiyAEQhlAChyAFIgwABIgjABQgkAAgLgCQgNgDgLgIIgZA8IgXA7Ig4COIg6CRIgjBfIgPAlQgEAJgDADQgLAPgVAJQgTAIgcAAQgygBgggfg");
	this.shape_2.setTransform(739.9,481.1);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#FF9900").s().p("ArQP1QgcgQgHgTIgSgoIACgKIAi7hIgXgfQgHgJgFgOQgDgMAAgQQABgxAegcQAggdA1gCQAfgBAUANQAUAOAkAvQDmErESGGQESGFFKHxIAA4PQABgsAfgcQAegcAwgBQAwABAfAcQAeAcABAsIAAb0QgBBHglArQgnArhAABQgiAAgggPQgegOgWgaIgOgVQgNgTgcgsQjUk6iwkAQitj+iUjQQiTjSiBivIgDEsIgLMjQgFEggFBRQgDAsghAcQghAcguAAQgdAAgdgPg");
	this.shape_3.setTransform(546,481.3);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#FF9900").s().p("Ak/PKQiag6hshmQgxgtgZgqQgYgsAAgiQABg2AmgkQAlgkA4gBQAmgCAWAQQAXAPAbAuQBABgB3A6QB3A8CLABQDJgBBrhQQBshRABiWQADiDhuheQhvhdj9hSQjZhHiBhQQiChSg5hrQg4hsABiVQABiXBUh3QBVh2CRhEQCThFC5gBQBsABBlAgQBlAgBVA7QBUA8A3BPQAfAuAPAiQAPAiAAAcQgCAzgjAfQgjAhg3ABQgmAAgZgQQgYgRgOggQgwh5hfg8Qhfg8iSACQi1ABhpBTQhpBTgBCQQgDBgAmBCQAkBCBcAzQBcAzCjAzQFIBqCnCbQCnCbAADLQgBCahYB2QhWB2iZBEQiYBEjGABQingBiag5g");
	this.shape_4.setTransform(366.5,481.3);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#FF9900").s().p("AkjBlQgogBgZgcQgZgbgBgtQABgrAZgbQAZgdAogBIJJAAQAoABAZAdQAXAbABArQgBAtgZAbQgYAcgnABg");
	this.shape_5.setTransform(234.3,481.3);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#FF9900").s().p("AhWPQQgegcgBgsIAA6IIh/ACIhoABIh9AAIjEAAIhoAAIgngBQgJAAgCgCQgegEgVgfQgXgegBgmQABgfARgeQAQgdAZgNQANgHAegCQAfgDBAADICpgEID5gCIEcgEIEVgCIDdgBIB7AAQA4gEAvgBIA7gCQA3ABAeAcQAeAcAAAzQgBArgXAgQgWAeggAGIhdAEIitAEQhmAEh1ABQh1ACh1ABIAAaIQgBAsgfAcQgeAcgvAAQgwAAgfgcg");
	this.shape_6.setTransform(94.1,483.7);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

	// Root
	this.instance = new lib.yfts();
	this.instance.parent = this;
	this.instance.setTransform(419,8);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	// レイヤー_1
	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#FF0000").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape_7.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape_7).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,900);


(lib.AreaTitle = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Text
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF0000").s().p("Ak+PtQghgBgXgeQgZgdgBgoQABgpAVgcQAVgeAfgEIA7gFIBogGIBxgGIAA3DQg8A6hBA0QhBAyg0AgQg1AhgYABQgugDghgjQgggkgCg0QgBgiANgUQAMgSApgYQA6ghA9grQA9grA0gtQA1grAggjQAkgmAngUQAmgSAnAAQA1ABAgAkQAfAkACA+IAAZzIAtADIApAAQAzABAvAEQAuACARADQAdAFATAaQATAbAAAjQgCApgYAiQgZAhgeACIgUAAIgYgCQgbgDgmgDIhzgBQhXAAhfACQhgAChQAEQhPAEgpAEg");
	this.shape.setTransform(1116,736.3);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF0000").s().p("AtvQEQgigdgCgtQACgPAqhuQAqhvBKi1QBIi2BejhIDDnRQBljxBljoIAnhbIAfhIIAOgiQAKgeAUgLQAVgNAjABQAvAAAfAcQAeAbABAoIgBAPIgFAVIAAADIgEAHQgCACgEAGQBFCxBICtQBKCuBdDKQBdDKB/EJQCAEJCxFoQAHALACAKQADAIAAAJQgBAtgkAdQghAfg1ABQgnACgVgTQgVgRgghBQhOiahcjCQhbjBhxkAQhzj9iTlQIhXjMIhNC5Ih5EdIheDjIhTDRICHgCIDAgDIB4gBQA2gBAJgCIA2gEIAogBQAsABAeAdQAcAeABAtQAAAhgNAcQgNAegWAMQgHAHgQACQgOACgoABIh0ACIiyAEQhlAChyAFIgwABIgjABQgkAAgLgCQgNgDgLgIIgZA8IgXA7Ig4COIg6CRIgjBfIgPAlQgDAJgEADQgKAPgWAJQgTAIgcAAQgygBgggfg");
	this.shape_1.setTransform(844,736.9);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FF0000").s().p("AqLPoQgdgbgBgsIAA61IgIAAQgjgBgbghQgZgggCgtQACgrAYgfQAaggAjgDIVigSQAnABAZAdQAYAeACAvQgCAygXAfQgYAegmAAIx/ARIAAJyIOngMQAoABAaAdQAYAdACAxQgCAxgVAeQgWAfglAAIuxAMIAAKdIR/gJQAmACAZAdQAZAdABAwQgBAxgYAeQgXAfgnAAIyBAHQgDApgeAYQgdAYgwAAQgyAAgegbg");
	this.shape_2.setTransform(661.8,741.3);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#FF0000").s().p("ApwPXQgfgUgNggIgCgKIACgHIAi6IIgDAAIgVACIgMAAQgEACgDAAIgFAAQgegBgZghQgXgggBgpQAAggAQgcQAPgbAYgOQAIgHATgBQARgDA2gBIA3gDQA0gDA/gBQBggHBqgFIDAgHQBVgDAsAAQE6ABCkCAQCkB/ABD1QgBD4iTChQiTCgkcA+IJFKgQAPAQAJAWQAIAVAAAXQgCAyglAiQgkAig1ABQgUAAgSgIQgSgIgNgOIqbsxIhUAFIhlACQg6ABhaAAIgKLsQgBAkgiAcQgiAcgsABQgkAAgegVgAhYsVIj5AKIhTAEIgKLQQAzACAmAAIBBAAQEXABCpgrQCogrBLhjQBKhhgBijQABhugohCQgmhAhcgcQhbgbibAAQg4AAhpADg");
	this.shape_3.setTransform(480.9,739.5);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#FF0000").s().p("AtwQEQghgdgCgtQABgPAqhuQArhvBJi1QBKi2BdjhIDCnRQBmjxBmjoIAmhbIAghIIAMgiQALgeAUgLQAVgNAjABQAvAAAeAcQAfAbABAoIgBAPIgGAVIAAADIgDAHQgDACgDAGQBFCxBJCtQBJCuBdDKQBcDKCBEJQB/EJCxFoQAHALADAKQACAIAAAJQgCAtgiAdQgjAfg0ABQgnACgVgTQgVgRgfhBQhPiahbjCQhcjBhykAQhxj9iUlQIhXjMIhNC5Ih5EdIhdDjIhUDRICHgCIDAgDIB4gBQA1gBAKgCIA2gEIAogBQAtABAcAdQAdAeABAtQAAAhgNAcQgNAegWAMQgHAHgPACQgQACgmABIh1ACIixAEQhmAChyAFIgxABIghABQglAAgMgCQgMgDgLgIIgZA8IgXA7Ig4COIg5CRIgjBfIgQAlQgEAJgDADQgLAPgUAJQgVAIgaAAQgzgBghgfg");
	this.shape_4.setTransform(296.8,736.9);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

	// bg
	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#FFFF00").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape_5.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape_5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1216.6,933.2);


(lib.StatusBar = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.powerGauge = new lib.PowerGauge();
	this.powerGauge.name = "powerGauge";
	this.powerGauge.parent = this;
	this.powerGauge.setTransform(114.8,35.8,1,1,0,0,0,98.8,19.8);

	this.timeline.addTween(cjs.Tween.get(this.powerGauge).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(16,16,200,40);


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
	this.initialize(mode,startPosition,loop,{spawn:0,normal:8});

	// Key
	this.spawn = new lib.Key_spawn();
	this.spawn.name = "spawn";
	this.spawn.parent = this;
	this.spawn.setTransform(30,26.8,1,1,0,0,0,12,26.8);

	this.normal = new lib.Key_normal();
	this.normal.name = "normal";
	this.normal.parent = this;
	this.normal.setTransform(18,0);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.spawn}]}).to({state:[{t:this.normal}]},8).wait(6));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(29.8,26.4,0.4,1);


(lib.Items = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// obj
	this.key = new lib.Key();
	this.key.name = "key";
	this.key.parent = this;
	this.key.setTransform(30,29.8,1,1,0,0,0,12,26.8);

	this.timeline.addTween(cjs.Tween.get(this.key).wait(1));

}).prototype = getMCSymbolPrototype(lib.Items, new cjs.Rectangle(47.8,29.4,0.5,1), null);


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


(lib.bg_area_01 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_4
	this.instance = new lib.Bubble_float("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(915.2,0);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(88).to({_off:false},0).to({_off:true},120).wait(33).to({_off:false,x:653.7},0).to({_off:true},120).wait(9).to({_off:false,x:803.9},0).to({_off:true},120).wait(28).to({_off:false,x:973.6},0).to({_off:true},120).wait(23).to({_off:false,x:795.6},0).to({_off:true},120).wait(11));

	// レイヤー_3
	this.instance_1 = new lib.Bubble_float("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(289.3,0);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({_off:true},120).wait(71).to({_off:false,x:281},0).to({_off:true},120).wait(40).to({_off:false,x:130.8},0).to({_off:true},120).wait(13).to({_off:false,x:456.2},0).to({_off:true},120).wait(32).to({_off:false,x:400.6},0).to({_off:true},120).wait(36));

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#BAD5F7").s().p("EhdvBGUMAAAiMnMC7fAAAMAAACMng");
	this.shape.setTransform(600,450);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(792));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,997.4);


(lib.Background = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// bg
	this.instance = new lib.bg_area_01();
	this.instance.parent = this;
	this.instance.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,997.4);


// stage content:
(lib.tsnake = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Tile
	this.instance = new lib.Tile("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	// statusBar
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

	// Goods
	this.instance_5 = new lib.Items();
	this.instance_5.parent = this;
	this.instance_5.setTransform(174.2,133.7,1,1,0,0,0,30,29.8);

	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(1));

	// MainTitle
	this.instance_6 = new lib.MainTitle("synched",0);
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
p.nominalBounds = new cjs.Rectangle(600,450,1216.6,997.4);
// library properties:
lib.properties = {
	id: '12203EAFB022374BAF15F927FCA8A97A',
	width: 1200,
	height: 900,
	fps: 24,
	color: "#CCCCCC",
	opacity: 1.00,
	manifest: [
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

var Enemy = function(stage, pos, id){
    this.init(stage, pos, id);
};

Enemy.prototype = new FieldObject();

Enemy.prototype.attackedTest = function (p) {
    return false;
};


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
var SnakeBody;

(function () {

    SnakeBody = function (stage, position, isHead) {
        this.stage = stage;
        if (isHead) {
            this.mc = cjsUtil.createMc("SnakeHead");
        } else {
            this.mc = cjsUtil.createMc("SnakeBody");
        }
        this.mc.body.gotoAndPlay(Math.floor(Math.random() * 60));
        this.stage.addChildAt(this.mc, this.stage.numChildren);
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

    Snake = function (stage, position) {
        this.stage = stage;
        this.bodies = [];
        this.addBody(position);
        this.addBody(position);
        this.addBody(position);
        this.addBody(position);
        this.addBody(position);
        this.addBody(position);
        this.direction = DIRECTION.s.clone();
        this.power = 10000;
    };

    Snake.prototype = {
        "POWER_MAX": 100000,
        "addBody": function (v) {
            var b = new SnakeBody(this.stage, v, this.bodies.length == 0);
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
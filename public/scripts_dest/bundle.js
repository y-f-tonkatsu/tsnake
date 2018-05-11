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

var cjsUtil;
var stage;
var game;

$(function () {

    cjsUtil = new CjsUtil(AdobeAn, "12203EAFB022374BAF15F927FCA8A97A");

    cjsUtil.loadImages(function(){
        stage = new createjs.Stage($("#canvas--main").get(0));
        game = new Game(stage);
        game.startGameLoop();
    });


});
var Areas;

(function(){

    Areas= [
        {
            "items":[]
        }
    ];

})();
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


(lib.Root = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.yfts();
	this.instance.parent = this;
	this.instance.setTransform(-182,-306);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = getMCSymbolPrototype(lib.Root, new cjs.Rectangle(-182,-306,778,338), null);


(lib.Bubble_body = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#E2EFFF").s().p("AlYFYQiOiOAAjKQAAjICOiQQCQiODIAAQDKAACOCOQCPCQAADIQAADKiPCOQiOCPjKAAQjIAAiQiPg");
	this.shape.setTransform(48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,97.4,97.4);


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


(lib.Bubble = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Bubble_body("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(48.7,48.7,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({x:79.5},23).to({x:54.3},24).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,97.4,97.4);


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
	this.instance.setTransform(80.7,970.8,1,1,0,0,0,48.7,48.7);

	this.timeline.addTween(cjs.Tween.get(this.instance).to({y:-58.4},119).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(32,922.1,97.4,97.4);


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
p.nominalBounds = new cjs.Rectangle(0,0,1200,1019.5);


(lib.Background = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// bg
	this.instance = new lib.bg_area_01();
	this.instance.parent = this;
	this.instance.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,1200,1019.5);


// stage content:
(lib.tsnake = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// T-SNAKE
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FF9900").s().p("AqLPoQgdgbgBgsIAA61IgIAAQgjgBgbghQgZgggCgtQACgrAYgfQAaggAjgCIVigTQAnABAZAdQAYAdACAxQgCAxgXAfQgYAegmAAIx/ARIAAJyIOngMQAoABAaAdQAYAdACAxQgCAxgVAeQgWAfglAAIuxAMIAAKdIR/gJQAmACAZAdQAZAdABAwQgBAxgYAeQgXAfgnAAIyBAHQgDApgeAXQgdAZgwAAQgyAAgegbg");
	this.shape.setTransform(1095.4,717.8);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF9900").s().p("ArGPoQgdgcgBgsIAA8+QABgsAegcQAfgcAugBQAwABAeAcQAfAcABAsIAAMoQCyh5CxiSQCwiRCYiWQCYiVBriFQAUgbAVgMQAVgMAbABQAuABAhAhQAhAhABAwQABARgHAQQgHAPgaAgQgbAeg8BAQiICTisCZQisCbjMChIOHOdQANAMAGAUQAHAUAAAXQgBA0ghAlQgiAkgzABQgUAAgUgIQgUgKgPgQIuGvLIgZASQg6ArgcASQgcATgcAQIAAMgQgBAsgfAcQgeAcgwAAQgwAAgegcg");
	this.shape_1.setTransform(924.9,713.6);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#FF9900").s().p("AtvQEQgigdgCgtQACgPAqhuQAqhvBKi1QBIi2BejhIDDnRQBljxBljoIAnhbIAfhIIAOgiQAKgeAUgLQAVgNAjABQAvAAAfAcQAeAbABAoIgBAPIgFAVIAAADIgEAHQgDACgDAGQBFCxBICtQBKCuBdDKQBdDKB/EJQCAEJCxFoQAHALACAKQADAIAAAJQgBAtgkAdQghAfg1ABQgnACgVgTQgVgRgghBQhOiahcjCQhbjBhxkAQhzj9iTlQIhXjMIhNC5QhFCig0B7IheDjIhTDRICHgCIDAgDIB4gBQA2gBAJgCIA2gEIAogBQAsABAeAdQAcAeABAtQAAAhgNAcQgNAegWAMQgHAHgQACQgOACgnABIh2ACIixAEQhlAChyAFIgwABIgjABQgkAAgLgCQgNgDgLgIIgZA8IgXA7Ig4COIg6CRIgjBfIgPAlQgDAJgEADQgKAPgWAJQgTAIgcAAQgygBgggfg");
	this.shape_2.setTransform(732.8,713.4);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#FF9900").s().p("ArQP1QgcgQgHgTIgSgoIACgKIAi7hIgXgfQgHgJgFgOQgDgMAAgQQABgxAegcQAggdA1gCQAfgBAUANQAUAOAkAvQDmErESGGQESGFFKHxIAA4PQABgsAfgcQAegcAwgBQAwABAfAcQAeAcABAsIAAb0QgBBHglArQgnArhAABQgiAAgggPQgegOgWgaIgOgVQgNgTgcgsQjUk6iwkAQitj+iUjQQiTjSiBivIgDEsIgLMjQgFEggFBRQgDAsghAcQghAcguAAQgdAAgdgPg");
	this.shape_3.setTransform(538.9,713.6);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#FF9900").s().p("Ak/PKQiag6hshmQgxgtgZgqQgYgsAAgiQABg2AmgkQAlgkA4gBQAmgCAWAQQAXAPAbAuQBABgB3A6QB3A8CLABQDJgBBrhQQBshRABiWQADiDhuheQhvhdj9hSQjZhHiBhQQiChSg5hrQg4hsABiVQABiXBUh3QBVh2CRhEQCThFC5gBQBsABBlAgQBlAgBVA7QBUA8A3BPQAfAuAPAiQAPAiAAAcQgCAzgjAfQgjAhg3ABQgmAAgZgQQgYgRgOggQgwh5hfg8Qhfg8iSACQi1ABhpBTQhpBTgBCQQgDBgAmBCQAkBCBcAzQBcAzCjAzQFIBqCnCbQCnCbAADLQgBCahYB2QhWB2iZBEQiYBEjGABQingBiag5g");
	this.shape_4.setTransform(359.4,713.6);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#FF9900").s().p("AkjBlQgogBgZgcQgZgbgBgtQABgrAZgbQAZgdAogBIJJAAQAoABAZAdQAXAbABArQgBAtgZAbQgYAcgnABg");
	this.shape_5.setTransform(227.2,713.5);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#FF9900").s().p("AhWPQQgegcgBgsIAA6IIh/ACIhoABIh9AAIjEAAIhoAAIgngBQgJAAgCgCQgegEgVgfQgXgegBgmQABgfARgeQAQgdAZgNQANgHAegCQAfgDBAADICpgEID5gCIEcgEIEVgCIDdgBIB7AAQA4gEAvgBIA7gCQA3ABAeAcQAeAcAAAzQgBArgXAgQgWAeggAGIhdAEIitAEQhmAEh1ABQh1ACh1ABIAAaIQgBAsgfAcQgeAcgvAAQgwAAgfgcg");
	this.shape_6.setTransform(87,716);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_6},{t:this.shape_5},{t:this.shape_4},{t:this.shape_3},{t:this.shape_2},{t:this.shape_1},{t:this.shape}]}).wait(1));

	// Snake
	this.instance = new lib.SnakeHead();
	this.instance.parent = this;
	this.instance.setTransform(180.1,263.5,1,1,0,0,0,27.1,27.1);

	this.instance_1 = new lib.SnakeBody();
	this.instance_1.parent = this;
	this.instance_1.setTransform(116.9,264,1,1,0,0,0,27.1,27.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_1},{t:this.instance}]}).wait(1));

	// Tile
	this.instance_2 = new lib.Tile("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,30,1,1,0,0,0,30,30);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(1));

	// Root
	this.instance_3 = new lib.Root();
	this.instance_3.parent = this;
	this.instance_3.setTransform(932.4,521.2,1,1,0,0,0,389,169);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(1));

	// Background
	this.instance_4 = new lib.Background("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(600,450,1,1,0,0,0,600,450);

	this.timeline.addTween(cjs.Tween.get(this.instance_4).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(594.9,450,1205.1,1019.5);
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
    };

    Snake.prototype = {
        "addBody": function (v) {
            var b = new SnakeBody(this.stage, v, this.bodies.length == 0);
            this.bodies.push(b);
        },
        "move": function (process) {
            _.forEach(this.bodies, _.bind(function (b) {
                b.update(b.direction.mult(process));
            }, this));
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
                    if(b.position.equals(headPos)){
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
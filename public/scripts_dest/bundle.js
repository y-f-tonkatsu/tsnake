var cjsUtil;
var stage;

$(function () {

    var snake;
    var tiles = [];

    cjsUtil = new CjsUtil(AdobeAn, "12203EAFB022374BAF15F927FCA8A97A");

    var startGameLoop = function () {
        var i = 0;
        stage = new createjs.Stage($("#canvas--main").get(0));
        _.times(10, function (x) {
            _.times(10, function (y) {
                var tile = cjsUtil.createMc("Tile");
                tiles.push(tile);
                tile.x = x * 60;
                tile.y = y * 60;
                stage.addChild(tile);
            });
        });

        var snake = new Snake(new Vector(0, 0));
        snake.addBody(new Vector(0, 0), true);
        snake.addBody(new Vector(0, 0), false);
        snake.addBody(new Vector(0, 0), false);

        createjs.Ticker.addEventListener("tick", function () {
            snake.update();
            stage.update();
        });
        createjs.Ticker.init();
    };

    cjsUtil.loadImages(startGameLoop);


});
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

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#000000").ss(3,1,1).p("AkrkrIJXAAIAAJXIpXAAg");
	this.shape.setTransform(30,30);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#009900").s().p("AkrEsIAApXIJXAAIAAJXg");
	this.shape_1.setTransform(30,30);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1.5,-1.5,63,63);


(lib.Snake = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#000000").ss(1,1,1).p("AEPAAQAABxhPBPQhPBPhxAAQhwAAhPhPQhPhPAAhxQAAhwBPhPQBPhPBwAAQBxAABPBPQBPBPAABwg");
	this.shape.setTransform(27.1,27.1);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF9900").s().p("Ai/DAQhPhQAAhwQAAhvBPhQQBQhPBvAAQBwAABQBPQBPBQAABvQAABwhPBQQhQBPhwAAQhvAAhQhPg");
	this.shape_1.setTransform(27.1,27.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1,-1,56.2,56.2);


(lib.Root = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.yfts();
	this.instance.parent = this;
	this.instance.setTransform(-182,-306);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = getMCSymbolPrototype(lib.Root, new cjs.Rectangle(-182,-306,778,338), null);


// stage content:
(lib.tsnake = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// レイヤー_1
	this.instance = new lib.Snake("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(169.7,318.3,1,1,0,0,0,27.1,27.1);

	this.instance_1 = new lib.Tile("synched",0);
	this.instance_1.parent = this;
	this.instance_1.setTransform(90,90,1,1,0,0,0,30,30);

	this.instance_2 = new lib.Tile("synched",0);
	this.instance_2.parent = this;
	this.instance_2.setTransform(30,90,1,1,0,0,0,30,30);

	this.instance_3 = new lib.Tile("synched",0);
	this.instance_3.parent = this;
	this.instance_3.setTransform(90,30,1,1,0,0,0,30,30);

	this.instance_4 = new lib.Tile("synched",0);
	this.instance_4.parent = this;
	this.instance_4.setTransform(30,30,1,1,0,0,0,30,30);

	this.instance_5 = new lib.Root();
	this.instance_5.parent = this;
	this.instance_5.setTransform(782.2,521.2,1,1,0,0,0,389,169);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_5},{t:this.instance_4},{t:this.instance_3},{t:this.instance_2},{t:this.instance_1},{t:this.instance}]}).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(598.5,448.5,990.7,385.7);
// library properties:
lib.properties = {
	id: '12203EAFB022374BAF15F927FCA8A97A',
	width: 1200,
	height: 900,
	fps: 24,
	color: "#FFFFFF",
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

    var UNIT = 60;

    Cood = {
        "MAX_X":10,
        "MAX_Y":10,
        "localToWorld": function (local) {
            return local * UNIT;
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
    },
    "sub": function (v) {
        this.x -= v.x;
        this.y -= v.y;
    },
    "mult": function (s) {
        this.x *= s;
        this.y *= s;
    },
};

DIRECTION = {
    "n": new Vector(0, -1),
    "e": new Vector(1, 0),
    "s": new Vector(0, 1),
    "w": new Vector(-1, 0)
};



var SnakeBody;

(function () {

    SnakeBody = function (position, isHead) {
        if(!isHead){
            isHead = false;
        }
        this.mc = cjsUtil.createMc("Snake");
        stage.addChild(this.mc);
        this.position = position;
        this.isHead = isHead;
    };

    SnakeBody.prototype = {
        "update":function(){
            this.mc.x = Cood.localToWorld(this.position.x);
            this.mc.y = Cood.localToWorld(this.position.y);
        }
    };

})();
var Snake;

(function () {

    Snake = function (x, y) {
        var head = new SnakeBody(x, y);
        this.bodies = [head];
        this.direction = DIRECTION.s;
    };

    Snake.prototype = {
        "addBody": function (v, isHead) {
            var b = new SnakeBody(v, isHead);
            this.bodies.push(b);
        },
        "update": function () {
            var prev = new Vector(0, 0);
            var next = new Vector(0, 0);
            _.each(this.bodies, function (b) {
                if (b.isHead) {
                    next.isCopyOf(b.position);
                    if (Math.random() > 0.5) {
                        this.direction = DIRECTION.e;
                    } else {
                        this.direction = DIRECTION.s;
                    }
                    b.position.add(this.direction);
                } else {
                    prev.isCopyOf(b.position);
                    b.position.isCopyOf(next);
                    next.isCopyOf(prev);
                }
                while (b.position.x >= Cood.MAX_X) {
                    b.position.x -= Cood.MAX_X
                }
                while (b.position.y >= Cood.MAX_Y) {
                    b.position.y -= Cood.MAX_Y
                }
                b.update();
            });
        }
    };

})();
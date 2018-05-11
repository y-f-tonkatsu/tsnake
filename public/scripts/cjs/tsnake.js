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
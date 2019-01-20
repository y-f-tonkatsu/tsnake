var CjsUtil;

(function () {

    var handleFileLoad = function (e, comp) {
        var gCjsImages = comp.getImages();
        if (e && (e.item.type == "image")) {
            gCjsImages[e.item.id] = e.result;
        }
    }

    CjsUtil = function (AdobeAn, compositionId) {
        this.AdobeAn = AdobeAn;
        this.comp = AdobeAn.getComposition(compositionId);
        this.lib = this.comp.getLibrary();
        createjs.Ticker.setFPS(this.lib.properties.fps);
    };


    CjsUtil.prototype = {
        loadImages: function (completeListener, progressListener,  loadListener, rootPath) {
            var loader = new createjs.LoadQueue(false);
            loader.installPlugin(createjs.Sound);
            var comp = this.comp;
            loader.addEventListener("progress", function (evt) {
                if (typeof progressListener === "function") {
                    progressListener(evt);
                }
            });
            loader.addEventListener("fileload", function (evt) {
                handleFileLoad(evt, comp);
                if (typeof loadListener === "function") {
                    loadListener(evt);
                }
            });
            loader.addEventListener("complete", _.bind(function (evt) {
                this.AdobeAn.compositionLoaded(this.lib.properties.id);
                if (typeof completeListener === "function") {
                    completeListener();
                }
            }, this));

            var gCjsLib = this.comp.getLibrary();

            var staticPath = rootPath || $("body").attr("data-static-img") || "";

            var manifest = _.map(this.lib.properties.manifest, function (item) {
                var newItem = item;
                newItem["src"] = staticPath + item["src"];
                return newItem;
            });

            loader.loadManifest(manifest);

        }, getLib: function () {
            return this.lib;
        }, createMc: function (mcName) {
            return new this.lib[mcName]();
        }, createStage: function (canvas) {
            this.stage = new createjs.Stage(canvas);
            createjs.Ticker.addEventListener("tick", this.stage);
            return this.stage;
        }, start: function (canvas, mcName, options) {

            _.defaults(options, {
                "loop": false,
            });

            var root = this.createMc(mcName);
            root.loop = options.loop;
            this.createStage(canvas);
            this.stage.addChild(root);

            return this.stage;
        }
    };

})();

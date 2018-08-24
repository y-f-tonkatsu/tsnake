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
                } else if (areaTitleAnim.currentLabel == "goButtonReady"){
                    areaTitleAnim.goButton.addEventListener("click", goButtonClickListener);
                    areaTitleAnim.goButton.cursor = "pointer";
                }
            }, this);

            areaTitleAnim.addEventListener("tick", onAreaTitleStopListener);

        },
        "createGame": function () {

            this.clearTasks();

            this.game = new Game(this.stage, this.area, _.bind(function (coins) {
                this.clearTasks();
                this.area++;
                this.numCoins += coins;
                this.setAreaTitle(this.area);
                this.game.kill();
            }, this), _.bind(function () {
                this.clearTasks();
                this.area = 0;
                this.numCoins = 0;
                this.game.kill();
                this.setMainTitle();
            }, this), this.numCoins);

            this.addTask(_.bind(this.game.gameLoop, this.game));

        }
    };

})();
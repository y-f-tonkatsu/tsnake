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

            var areaTitleMc = cjsUtil.createMc("Area_" + (parseInt(this.area) + 1));
            this.stage.addChild(areaTitleMc);
            var areaTitleEndListener = _.bind(function () {
                console.log(areaTitleMc.currentFrame);
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
                    //this.resetGame();
                    //this.setMainTitle();
                }, this), this.numCoins);

            this.addTask(_.bind(this.game.gameLoop, this.game));

        }
    };

})();
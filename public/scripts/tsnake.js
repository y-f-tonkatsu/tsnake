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
                this.stage.removeEventListener("click", titleClickListener);
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
                this.createGame();
                this.stage.removeEventListener("click", titleClickListener);
            }, this);
            this.stage.addEventListener("click", titleClickListener);

        },
        "createGame": function () {

            this.clearTasks();

            this.game = new Game(this.stage, this.area, _.bind(function(){
                this.clearTasks();
                this.area++;
                setAreaTitle(this.area);
            }, this), _.bind(function(){
                this.clearTasks();
                this.area = 0;
                this.game.kill();
                this.setMainTitle();
            }, this));

            this.addTask(_.bind(this.game.gameLoop, this.game));

        }
    };

})();
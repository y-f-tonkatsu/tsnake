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

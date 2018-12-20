var Score;

(function () {

    const UP_MAX = 60;
    const UP_SPEED = 1;

    Score = function (stage, score, pos, removeListener) {
        this.init(stage, score, pos, removeListener);
    };

    Score.prototype = {

        init: function (stage, score, pos, removeListener) {
            this.mc = cjsUtil.createMc("ScorePopUp");
            this.position = new Vector(
                Cood.localToWorld(pos.x) + Cood.UNIT * 0.5,
                Cood.localToWorld(pos.y) + Cood._STATUS_BAR_HEIGHT + Cood.UNIT
            );
            this.mc.x = this.position.x;
            this.mc.y = this.position.y;
            stage.addChild(this.mc);
            this.up = 0;
            this.score = score;
            this.mc.tf.text = "+" + score;

            this.mc.addEventListener("tick", _.bind(this.update, this));

            this.removeListener = removeListener;
        },
        remove: function () {
            this.mc.removeEventListener("tick", this.update);
            this.mc.stop();
            this.mc.parent.removeChild(this.mc);
            this.mc = null;
            if(this.removeListener){
                this.removeListener();
            }
        },
        update: function () {
            this.mc.y = this.position.y - this.up;
            this.up += UP_SPEED;
            if (this.up > UP_MAX) {
                this.remove();
            }
        }


    };

})();
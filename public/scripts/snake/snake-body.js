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
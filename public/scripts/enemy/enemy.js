var Enemy;

(function(){

    StartTasks.push(function(){

        Enemy = function(map, pos, id){
            this.init(map, pos, id);
        };

        Enemy.prototype = new FieldObject();

        Enemy.prototype.attackedTest = function (p) {
            return false;
        };

    });

})();

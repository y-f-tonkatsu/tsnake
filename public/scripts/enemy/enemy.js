var Enemy = function(stage, pos, id){
    this.init(stage, pos, id);
};

Enemy.prototype = new FieldObject();

Enemy.prototype.attackedTest = function (p) {
    return false;
};


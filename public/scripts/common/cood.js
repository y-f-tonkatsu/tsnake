var Cood;

(function () {

    Cood = {
        "UNIT":60,
        "MAX_GX":780,
        "MAX_GY":780,
        "MAX_X":13,
        "MAX_Y":12,
        "_STATUS_BAR_HEIGHT":60,
        "localToWorld": function (local) {
            if(typeof local == "object"){
                return local.mult(this.UNIT);
            } else {
                return local * this.UNIT;
            }
        }
    };

})();


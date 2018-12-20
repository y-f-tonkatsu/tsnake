var Cood;

(function () {

    Cood = {
        "UNIT":60,
        "MAX_GX":1200,
        "MAX_GY":900,
        "MAX_X":14,
        "MAX_Y":14,
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


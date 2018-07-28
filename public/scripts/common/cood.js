var Cood;

(function () {

    Cood = {
        "UNIT":60,
        "MAX_GX":1200,
        "MAX_GY":900,
        "MAX_X":20,
        "MAX_Y":14,
        "localToWorld": function (local) {
            if(typeof local == "object"){
                return local.mult(this.UNIT);
            } else {
                return local * this.UNIT;
            }
        }
    };

})();


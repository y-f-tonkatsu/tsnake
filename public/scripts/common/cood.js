var Cood;

(function () {

    Cood = {
        "UNIT":60,
        "MAX_X":20,
        "MAX_Y":14,
        "localToWorld": function (local) {
            return local * this.UNIT;
        }
    };

})();


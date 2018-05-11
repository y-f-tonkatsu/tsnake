var Cood;

(function () {

    Cood = {
        "UNIT":60,
        "MAX_X":20,
        "MAX_Y":15,
        "localToWorld": function (local) {
            return local * this.UNIT;
        }
    };

})();


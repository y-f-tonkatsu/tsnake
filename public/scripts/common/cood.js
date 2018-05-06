var Cood;

(function () {

    var UNIT = 60;

    Cood = {
        "MAX_X":10,
        "MAX_Y":10,
        "localToWorld": function (local) {
            return local * UNIT;
        }
    };

})();


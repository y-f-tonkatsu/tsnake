var cjsUtil;
var stage;
var tSnake;
var StartTasks = [];

$(function () {

    $("#popup--loader").css({
        "visibility": "visible"
    });

    $("#popup--loader__button--go").css({
        "visibility": "hidden"
    });

    cjsUtil = new CjsUtil(AdobeAn, "12203EAFB022374BAF15F927FCA8A97A");

    cjsUtil.loadImages(function () {
        $("#title--loader").text("READY");
        $("#popup--loader__button--go").css({
            "visibility": "visible"
        });
        $("#popup--loader__button--go").click(function () {
            $("#popup--loader__button--go").unbind("click");
            $("#popup--loader__button--go").css({
                "visibility": "hidden"
            });
            $("#popup--loader").css({
                "visibility": "hidden"
            });
            tSnake = new TSnake();
        });
    }, function (e) {
        var prog = Math.floor(e.progress * 100);
        $("#title--loader").text("LOADING " + prog + "%");
    });

    _.forEach(StartTasks, function (task) {
        task();
    });

});
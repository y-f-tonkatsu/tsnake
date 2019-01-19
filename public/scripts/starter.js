var cjsUtil;
var stage;
var tSnake;
var StartTasks = [];

$(function () {

    $("#popup--loader").css({
        "visibility": "visible"
    });

    var dots = ".";

    var interval = setInterval(function(){
        dots = dots == "." ? ".." : ".";
        $("#title--loader").text("LOADING" + dots);
        console.log(dots);
    }, 300);

    cjsUtil = new CjsUtil(AdobeAn, "12203EAFB022374BAF15F927FCA8A97A");

    cjsUtil.loadImages(function () {
        clearInterval(interval);
        $("#title--loader").text("READY");
        $("#popup--loader__button--go").click(function () {
            $("#popup--loader").css({
                "visibility": "hidden"
            });
            tSnake = new TSnake();
        });
    });

    _.forEach(StartTasks, function (task) {
        task();
    });

});
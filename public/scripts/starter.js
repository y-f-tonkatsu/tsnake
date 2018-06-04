var cjsUtil;
var stage;
var tSnake;
var StartTasks = [];

$(function () {

    cjsUtil = new CjsUtil(AdobeAn, "12203EAFB022374BAF15F927FCA8A97A");

    cjsUtil.loadImages(function () {
        tSnake = new TSnake();
    });

    _.forEach(StartTasks, function(task){
        task();
    });

});
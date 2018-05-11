var cjsUtil;
var stage;
var game;

$(function () {

    cjsUtil = new CjsUtil(AdobeAn, "12203EAFB022374BAF15F927FCA8A97A");

    cjsUtil.loadImages(function(){
        stage = new createjs.Stage($("#canvas--main").get(0));
        game = new Game(stage);
        game.startGameLoop();
    });


});
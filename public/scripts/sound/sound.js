var SoundHelper;
var playSound = function(id, loop){
    SoundHelper.play(id, loop);
};

(function () {

    SoundHelper = {
        play: function (id, loop) {
            return createjs.Sound.play(id, createjs.Sound.INTERRUPT_EARLY, 0, 0, loop);
        }

    }

})();
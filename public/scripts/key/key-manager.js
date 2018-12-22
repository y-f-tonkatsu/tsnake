var KeyManager;

(function () {

    window.onkeydown = function (e) {
        //console.log("key:" + e.which);
        if(KeyManager.listeners[e.which]){
            KeyManager.listeners[e.which]();
        }
    };

    KeyManager = {
        "listeners": {},
        "setKeyListeners": function (args) {
            _.each(args, _.bind(function (callback, key) {
                this.listeners[key] = callback;
            }, this));
        }
    };

})();
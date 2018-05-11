var KeyManager;

(function () {

    $(window).keypress(function (e) {
        if(KeyManager.listeners[e.which]){
            KeyManager.listeners[e.which]();
        }
    });

    KeyManager = {
        "listeners": {},
        "setKeyListeners": function (args) {
            _.each(args, _.bind(function (callback, key) {
                this.listeners[key] = callback;
            }, this));
        }
    };

})();
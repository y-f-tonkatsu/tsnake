let HighScore;

(function () {

    HighScore = {
        "getBaseUrl": function () {
            return $("body").attr("data-base-url");
        },
        "showInput": function (callback) {

            const popup = $("#popup--input-high-score, #bg--high-score");
            popup.css({
                visibility: "visible"
            });

            $("#popup--input-high-score__button--submit").click(_.bind(function () {
                popup.css({
                    visibility: "hidden"
                });

                if (callback) {
                    callback($("#popup--input-high-score__input--player").val());
                }

            }, this));
        },
        "show": function (callback) {

            this.get(function (data) {

                let wrapper = $("#wrapper--score");
                $(wrapper).empty();
                let i = 1;
                _.forEach(data, function (line) {
                    let elem = $("<div class='line--high-score'>" +
                        "<div class='column column--rank'></div>" +
                        "<div class='column column--player'></div>" +
                        "<div class='column column--score'></div>" +
                        "</div>");
                    $(elem).find(".column--rank").text(i.toString());
                    $(elem).find(".column--player").text(line.player.toString());
                    $(elem).find(".column--score").text(parseInt(line.score).toString());
                    $(wrapper).append(elem);
                    i++;
                });

                const popup = $("#popup--high-score, #bg--high-score");
                popup.css({
                    visibility: "visible"
                });

                $("#bg--high-score").click(_.bind(function () {
                    popup.css({
                        visibility: "hidden"
                    });

                    if (callback) {
                        callback();
                    }

                }, this));

            });

        },
        "get": function (callback) {
            $.get(this.getBaseUrl() + "score/", _.bind(function (data) {
                callback(data);
            }, this));
        },
        "post": function (name, score, callback) {

            $.post(this.getBaseUrl() + "score/", {
                "player": name,
                "score": score
            }, function (data) {

                callback(data);
            });
        },
    }


})();


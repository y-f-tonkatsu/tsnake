const express = require('express');
const router = express.Router();
const sanitizer = require('sanitize');

const redis = require('redis');
let redisClient = redis.createClient();
redisClient.on('connect', function () {
    console.log('Redis client connected');
});
redisClient.on('error', function (err) {
    console.log('Something went wrong ' + err);
});

/* GET High Score */
router.get('/', function (req, res, next) {

    return redisClient.get('tsnake:high_score', function (err, result) {
        if (!result) {
            ranking = createNewRanking();

            let highScoreJson = JSON.stringify(ranking);

            return redisClient.set('tsnake:high_score', highScoreJson, function () {
                if (err) {
                    return res.send("error");
                }

                return res.send(highScoreJson);
            });
        }
        return res.send(JSON.parse(result));
    });


});

let showRec = function (res, from, to) {
    console.log("Record Requested");
    console.log(from, to);
    return redisClient.lrange('tsnake:score_record', from, to, function (err, result) {
        if (err) {
            return res.send("error");
        }

        return res.send(result.toString());
    });
}

/* GET Records */
router.get('/rec/:from-:to', function (req, res, next) {

    let from = parseInt(req.params.from);
    let to = parseInt(req.params.to);

    return showRec(res, from, to);

});

router.get('/rec/', function (req, res, next) {

    return showRec(res, 0, -1);

});

router.post('/', function (req, res, next) {
    let player = req.bodyString('player');
    let score = req.bodyInt('score');
    let token = req.bodyString('token');
    let date = new Date();
    console.log("Score Posted");
    console.log("Player: " + player);
    console.log("Score: " + score);
    console.log("date: " + date.toString());
    console.log("timeStamp: " + Date.now());
    console.log("token: " + token);
    if (!validateToken(token, player, score)) {
        return res.send("Invalid Token");
    }
    let record = {
        "player": player,
        "score": score,
        "date": date.toString(),
        "timeStamp": Date.now()
    };

    return redisClient.get('tsnake:high_score', function (err, result) {

        if (err) {
            return res.send("error");
        }

        let ranking = JSON.parse(result);
        if (!ranking) {
            ranking = createNewRanking();
        }
        ranking.push(record);
        ranking.sort(function (a, b) {

            if (!a.timeStamp) {
                a.date = date.toString();
                a.timeStamp = Date.now();
            }
            if (!b.timeStamp) {
                b.date = date.toString();
                b.timeStamp = Date.now();
            }

            let x = parseInt(a.score);
            let y = parseInt(b.score);
            if (x > y) {
                return -1;
            } else if (x < y) {
                return 1;
            } else {
                if (parseInt(a.timeStamp) > parseInt(b.timeStamp)) {
                    return 1;
                } else {
                    return -1;
                }
            }
        });

        while (ranking.length > 10) {
            let out = ranking.pop();
            console.log("pop:" + out.player + " " + out.score);
        }

        ranking = createNewRanking();

        let highScoreJson = JSON.stringify(ranking);
        let recordJson = JSON.stringify(record);

        console.log("--RECORD--");
        console.log(record);
        console.log("--HIGH SCORE--");
        console.log(highScoreJson);

        return redisClient.rpush('tsnake:score_record', recordJson, function (err, result) {
            if (err) {
                return res.send("error");
            }

            return redisClient.set('tsnake:high_score', highScoreJson, function () {
                if (err) {
                    return res.send("error");
                }

                return res.send('success');
            });
        });

    });


});

function validateToken(token, name, score) {
    let str = (1000000 - 24635 + score).toString();
    str = str + "tonikaku" + name + "49ganbatta"
    return token === str;
}

function createNewRanking() {
    let ranking = [
        {"player":"つるまう","score":3326,"date":"Mon Feb 04 2019 16:19:13 GMT+0900 (JST)","timeStamp":1549264753861},
        {"player":"つるまう","score":2878,"date":"Thu Jan 31 2019 01:03:02 GMT+0900 (JST)","timeStamp":1548864182690},
        {"player":"つるまう","score":2699,"date":"Fri Feb 22 2019 12:13:50 GMT+0900 (JST)","timeStamp":1550805230859},
        {"player":"つるまう","score":2666,"date":"Sun Mar 10 2019 20:58:44 GMT+0900 (JST)","timeStamp":1552219124861},
        {"player":"つるまう","score":2040,"date":"Mon Feb 18 2019 21:48:07 GMT+0900 (JST)","timeStamp":1550494087262},
        {"player":"つるまう","score":2013,"date":"Thu Feb 21 2019 12:28:08 GMT+0900 (JST)","timeStamp":1550719688458},
        {"player":"つるまう","score":1872,"date":"Sat Feb 16 2019 14:03:49 GMT+0900 (JST)","timeStamp":1550293429590},
        {"player":"つるまう","score":1738,"date":"Wed Feb 20 2019 22:16:39 GMT+0900 (JST)","timeStamp":1550668599659},
        {"player":"つるまう","score":1738,"date":"Mon Mar 11 2019 14:44:49 GMT+0900 (JST)","timeStamp":1552283089365},
        {"player":"つるまう","score":1647,"date":"Tue Feb 12 2019 23:55:13 GMT+0900 (JST)","timeStamp":1549983313664}
        ];

    /*
    for (var i = 0; i < 10; i++) {
        ranking.push({
            "player": "tonkatsu",
            "score": 1,
            "date": new Date().toString(),
            "timeStamp": Date.now()
        });
    }
    */

    return ranking;
}

module.exports = router;

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

    return redisClient.get('high_score', function (err, result) {
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

    return redisClient.get('high_score', function (err, result) {

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

            return redisClient.set('high_score', highScoreJson, function () {
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
    let ranking = [];
    for (var i = 0; i < 10; i++) {
        ranking.push({
            "player": "tonkatsu",
            "score": 1,
            "date": date.toString(),
            "timeStamp": Date.now()
        });
    }
    return ranking;
}

module.exports = router;

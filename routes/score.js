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

    return redisClient.get('k', function (error, result) {
        if (error) {
            console.log(error);
            throw error;
        }

        return redisClient.get('high_score', function (err, result) {
            return res.send(JSON.parse(result));
        });

    });

});

router.post('/', function (req, res, next) {
    let player = req.bodyString('player');
    let score = req.bodyInt('score');
    console.log("Score Posted");
    console.log("Player: " + player);
    console.log("Score: " + score);
    let record = {
        "player": player,
        "score": score,
        "date": Date().toString()
    };

    return redisClient.get('high_score', function (err, result) {
        let ranking = JSON.parse(result);
        if (!ranking) {
            ranking = createNewRanking();
        }
        ranking.push(record);
        ranking.sort(function (a, b) {
            let x = parseInt(a.score);
            let y = parseInt(b.score);
            if (x > y) {
                return -1;
            } else if (x <= y) {
                return 1;
            }
        });

        while (ranking.length > 10) {
            let out = ranking.pop();
            console.log("pop:" + out.player + " " + out.score);
        }

        //ranking = createNewRanking();

        let highScoreJson = JSON.stringify(ranking);
        let recordJson = JSON.stringify(record);

        console.log("--RECORD--");
        console.log(record);
        console.log("--HIGH SCORE--");
        console.log(highScoreJson);

        return redisClient.rpush('tsnake:score_record', recordJson, function () {
            return redisClient.set('high_score', highScoreJson, function () {
                return res.send('success');
            });
        });

    });


});

function createNewRanking() {
    let ranking = [];
    for (var i = 0; i < 10; i++) {
        ranking.push({
            "player": "tonkatsu",
            "score": 1
        });
    }
    return ranking;
}

module.exports = router;

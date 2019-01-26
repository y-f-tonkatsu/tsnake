var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('main', {
        base_url: process.env.UNKO == "remote" ? 'http://knights.ton-katsu.net/games/tsnake/' : '',
        og_title: "YFT's TSnake",
        og_description: 'クラシックなスネークゲームをアレンジしたシンプルなゲームです。JavaScript と Adobe Animate で作成。',
        og_url: 'http://knights.ton-katsu.net/games/tsnake/',
        og_thumb: 'http://knights.ton-katsu.net/games/tsnake/images/ss_og.jpg',
    });
});

module.exports = router;

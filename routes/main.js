var express = require('express');
var router = express.Router();


/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('main', {
        base_url: 'http://knights.ton-katsu.net/games/tsnake/',
        og_title: 'TSnake',
        og_description: 'TSnake',
        og_url: 'http://knights.ton-katsu.net/games/tsnake/',
        og_thumb: 'images/og_thumb.png',
    });
});

module.exports = router;

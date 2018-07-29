var express = require('express');
var router = express.Router();

var baseUrl;
if(process.env.UNKO == 'local'){
    baseUrl = '';
} else if (process.env.UNKO == 'remote') {
    baseUrl = 'http://knights.ton-katsu.net/apps/tsnake/'
}

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('main', {
        base_url: baseUrl,
        og_title: 'TSnake',
        og_description: 'TSnake',
        og_url: 'http://knights.ton-katsu.net/apps/tsnake/',
        og_thumb: 'images/og_thumb.png',
    });
});

module.exports = router;

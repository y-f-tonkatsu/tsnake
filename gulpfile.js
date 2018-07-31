var gulp = require('gulp');

var _ = require('lodash');

var minify = require('gulp-minify');
var concat = require('gulp-concat');
var clean = require('gulp-clean');
var replace = require('gulp-replace');


var fs = require('fs');
var path = require('path');

var PATH_BASE_DEST = 'D:/Arts/Web/tnode/tsnake/public/'

var getScriptSrc = function () {
    return [PATH_BASE_DEST + 'scripts/**/*.js']
};

var getScriptDest = function () {
    return PATH_BASE_DEST + 'scripts_dest/'
};

gulp.task('bundle_js', function () {

    return gulp.src(getScriptSrc())
        .pipe(concat('bundle.js'))
        .pipe(replace('src:"../../', 'src:"'))
        .pipe(minify())
        .pipe(gulp.dest(getScriptDest()));
});

gulp.task('clear_script', function () {
    return gulp.src(path.join(getScriptDest(), '*.js'), {read: false})
        .pipe(clean());
});

gulp.task('tsnake', function () {
    gulp.start(['clear_script', 'bundle_js']);
});

gulp.task('default', ['tsnake']);
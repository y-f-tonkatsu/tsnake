const gulp = require('gulp');

const _ = require('lodash');

const minify = require('gulp-minify');
const concat = require('gulp-concat');
const clean = require('gulp-clean');
const replace = require('gulp-replace');


const fs = require('fs');
const path = require('path');

const PATH_BASE_DEST = 'D:/Arts/Web/tnode/tsnake/public/'

let getScriptSrc = function () {
    return [PATH_BASE_DEST + 'scripts/**/*.js']
};

let getScriptDest = function () {
    return PATH_BASE_DEST + 'scripts_dest/'
};

const bundleJs = function () {

    return gulp.src(getScriptSrc())
        .pipe(concat('bundle.js'))
        .pipe(replace('src:"../../', 'src:"'))
        .pipe(minify())
        .pipe(gulp.dest(getScriptDest()));
};

const cleaScript = function () {
    return gulp.src(path.join(getScriptDest(), '*.js'), {read: false})
        .pipe(clean());
};

gulp.task('tsnake', function () {
    gulp.start(['clear_script', 'bundle_js']);
});

const defaultTasks = gulp.series(cleaScript, bundleJs)

module.exports = {
    "default": defaultTasks
}
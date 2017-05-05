var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var wrap = require('gulp-wrap');
var rename = require('gulp-rename');

gulp.task('concat', function () {
  return gulp.src(['src/util/*.js', 'src/jquery-plugin.js'])
    .pipe(concat('magicwrap.js'))
    .pipe(wrap('(function(){\n<%= contents %>\n})();'))
    .pipe(gulp.dest('./'));
});

gulp.task('minify', ['concat'], function () {
  return gulp.src(['./magicwrap.js'])
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('./'));
});

gulp.task('default', ['minify', 'concat']);

gulp.task('watch', ['default'], function () {
  return gulp.watch(['src/**/*.js'], ['default']);
});

const gulp = require('gulp');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const gulpRollup = require('gulp-better-rollup');
const babel = require('rollup-plugin-babel');
const rollup = require('rollup');

gulp.task('js:compile', () =>
  gulp.src([
      'src/jquery-plugin.js'
    ])
    .pipe(gulpRollup({
        // Inject our own Rollup since gulp-rollup uses an outdated version.
        rollup: rollup,
        plugins: [
            babel()
        ]
    }, {
        format: 'iife',
    }))
    .pipe(rename({ basename: 'magicwrap' }))
    .pipe(gulp.dest('./'))
);

gulp.task('js:minify', ['js:compile'], function () {
  return gulp.src(['./magicwrap.js'])
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('./'));
});

gulp.task('build', ['js:compile', 'js:minify']);

gulp.task('default', ['build']);

gulp.task('watch', ['default'], function () {
  return gulp.watch(['src/**/*.js'], ['default']);
});

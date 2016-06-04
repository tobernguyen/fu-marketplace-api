'use strict';

var gulp = require('gulp'),
  mocha = require('gulp-mocha'),
  gutil = require('gulp-util'),
  gulpIf = require('gulp-if'),
  eslint = require('gulp-eslint');

function isFixed(file) {
  // Has ESLint fixed the file contents?
  return file.eslint != null && file.eslint.fixed;
}

gulp.task('set-test-node-env', function() {
  return process.env.NODE_ENV = 'test';
});

gulp.task('default', ['set-test-node-env'], function() {
  gulp.watch(['test/**/*.js'], ['mocha']);
});

gulp.task('mocha', ['set-test-node-env'],function() {
  return gulp.src(['test/**/*.js'], {read:false})
    .pipe(mocha({reporter: 'nyan'}))
    .on('error', gutil.log);
});

gulp.task('lint-n-fix', function() {
  return gulp.src(['**/*.js', '*.js', '!node_modules/**'], {base: './'})
    .pipe(eslint({
      fix: true
    }))
    .pipe(eslint.format())
    .pipe(gulpIf(isFixed, gulp.dest('./')));
});

gulp.task('lint', function() {
  return gulp.src(['**/*.js', '*.js', '!node_modules/**'])
    .pipe(eslint({}))
    .pipe(eslint.format());
});

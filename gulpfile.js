'use strict';

var gulp = require('gulp'),
  mocha = require('gulp-mocha'),
  gutil = require('gulp-util');

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

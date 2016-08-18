'use strict';

var gulp = require('gulp'),
  mocha = require('gulp-mocha'),
  gutil = require('gulp-util'),
  gulpIf = require('gulp-if'),
  eslint = require('gulp-eslint'),
  istanbul = require('gulp-istanbul');

function isFixed(file) {
  // Has ESLint fixed the file contents?
  return file.eslint != null && file.eslint.fixed;
}

gulp.doneCallback = function (err) {
  process.exit(err ? 1 : 0);
};

gulp.task('set-test-node-env', function() {
  return process.env.NODE_ENV = 'test';
});

gulp.task('mocha', ['set-test-node-env'],function() {
  return gulp.src(['test/**/*.js'], {read:false})
    .pipe(mocha({reporter: 'spec'}))
    .on('error', gutil.log);
});

gulp.task('lint-n-fix', function() {
  return gulp.src(['**/*.js', '*.js', '!node_modules/**', '!coverage/**', '!bin/**'], {base: './'})
    .pipe(eslint({
      fix: true
    }))
    .pipe(eslint.format())
    .pipe(gulpIf(isFixed, gulp.dest('./')));
});

gulp.task('lint', function() {
  return gulp.src(['**/*.js', '*.js', '!node_modules/**', '!coverage/**', '!bin/**'])
    .pipe(eslint({}))
    .pipe(eslint.format());
});

gulp.task('pre-istanbul', function () {
  return gulp.src(['controllers/**/*.js', '!controllers/index.js', 'libs/**/*.js', 'middlewares/**/*.js', 'models/**/*.js', '!models/index.js', 'routes/**/*.js'])
    // Covering files
    .pipe(istanbul())
    // Force `require` to return covered files
    .pipe(istanbul.hookRequire());
});

gulp.task('istanbul', ['set-test-node-env', 'pre-istanbul'], function () {
  return gulp.src(['test/**/*.js'])
    .pipe(mocha())
    // Creating the reports after tests ran
    .pipe(istanbul.writeReports())
    // Enforce a coverage of at least 90%
    .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }));
});

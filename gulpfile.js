'use strict';
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

var DEST = 'dist';
var resources = {
   scss: ['resources/sass/*.scss',
          '!resources/sass/_*.scss',
          'node_modules/font-awesome/scss/font-awesome.scss'],
   bootstrap: ['node_modules/bootstrap-sass/assets/stylesheets/bootstrap'],
   html: ['resources/geneaprove/**/*.html',
          '!resources/geneaprove/index.html'],
   js: ['resources/js/*'],
   statics: ['resources/fonts/*',
             'resources/geneaprove/index.html']
};

gulp.task('css', function() {
   return gulp.src(resources.scss)
       .pipe($.sourcemaps.init())
          .pipe($.cached('all_css'))
              .pipe($.sass({includePaths: resources.bootstrap})
                    .on('error', $.sass.logError))
              .pipe($.autoprefixer(
                       {browser: ['last 2 versions'], cascade: false}))
              .pipe($.cssmin())
          .pipe($.remember('all_css'))
          .pipe($.concat('geneaprove.min.css'))
       .pipe($.sourcemaps.write('.'))
       .pipe(gulp.dest(DEST))
       .pipe($.gzip())
       .pipe(gulp.dest(DEST));
});

gulp.task('js', function() {
   return gulp
      // First task is to compile the HTML templates into javascript so that
      // we do not have to load them later on
      .src(resources.html)
      .pipe($.cached('all_templates'))
         .pipe($.minifyHtml({quotes: true}))
      .pipe($.remember('all_templates'))
      .pipe($.angularTemplatecache(
          {module: 'geneaprove', filename: 'templates.js',
           root: 'geneaprove/'}))

      // Now add all other javascripts and minify them all
      .pipe($.addSrc.prepend(resources.js))
      .pipe($.cached('all_scripts'))
         .pipe($.ngAnnotate())
         .pipe($.uglify())
      .pipe($.remember('all_scripts'))

      // Finally add third parties that are already minified
      .pipe($.addSrc.prepend([
         'node_modules/angular/angular.min.js',
         'node_modules/angular-ui-router/release/angular-ui-router.min.js',
         'node_modules/d3/d3.min.js',
         'node_modules/angular-local-storage/dist/angular-local-storage.min.js',
         'node_modules/angular-upload/angular-upload.min.js']))

      // Write the result
      .pipe($.concat('geneaprove.min.js'))
      .pipe(gulp.dest(DEST))
      .pipe($.gzip())
      .pipe(gulp.dest(DEST));
});

gulp.task('static', function() {
   return gulp
      .src(resources.statics, {base: 'resources'})
      .pipe(gulp.dest(DEST));
});

gulp.task('default', ['css', 'js', 'static']);
gulp.task('watch', ['default'], function() {
   gulp.watch(resources.scss + resources.bootstrap, ['css']);
   gulp.watch(resources.js + resources.html, ['js']);
});

'use strict';
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

// Changing the font-path for font-awesome seems complex without changing the
// files themselves. Since that path defaults to "../fonts", we will simply
// put our CSS files in DEST+'/css' to workaround the issue.
var DEST = 'static';

var resources = {
   bootstrap: 'node_modules/bootstrap-sass/assets/stylesheets',
   fontawesome: 'node_modules/font-awesome/scss',
   scss: [//  'resources/sass/myboostrap.scss',  //  Keep this first
          'resources/sass/*.scss'
         ],
   html: ['resources/geneaprove/**/*.html',
          '!resources/geneaprove/**/\.#*.html',
          '!resources/geneaprove/**/#*.html#',
          '!resources/geneaprove/index.html'],
   js: ['resources/js/*',
        '!resources/js/\.#*.js',
        '!resources/js/#*.js#'],
   statics: ['resources/fonts/*',
             'resources/geneaprove/initial_data.json',
             'resources/geneaprove/index.html']
};

gulp.task('css', function() {
   return gulp.src(resources.scss) // "resources/sass/myboostrap.scss")
       .pipe($.sourcemaps.init())
          .pipe($.sass({
             includePaths: [resources.bootstrap, resources.fontawesome]
             })
             .on("error", $.notify.onError(function(error) {
                return error.message;
             })))
          .pipe($.autoprefixer(
                   {browser: ['last 2 versions'], cascade: false}))
          .pipe($.cssmin())
          .pipe($.concat('geneaprove.min.css'))
       .pipe($.sourcemaps.write('.'))
       .pipe(gulp.dest(DEST + '/css'))
       .pipe($.gzip())
       .pipe(gulp.dest(DEST + '/css'));
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
         .pipe($.ngAnnotate()
               .on("error", $.notify.onError(function(error) {
                  return error.message;
               })))
         .pipe($.uglify())
      .pipe($.remember('all_scripts'))

      // Finally add third parties that are already minified
      .pipe($.addSrc.prepend([
         'node_modules/angular/angular.min.js',
         'node_modules/angular-sanitize/angular-sanitize.min.js',
         'node_modules/angular-ui-router/release/angular-ui-router.min.js',
         'node_modules/d3/d3.min.js',
         'node_modules/angular-local-storage/dist/angular-local-storage.min.js',
         'node_modules/angular-upload/angular-upload.min.js']))

      // Write the result
      .pipe($.concat('geneaprove.min.js'))
      .pipe(gulp.dest(DEST + '/js'))
      .pipe($.gzip())
      .pipe(gulp.dest(DEST + '/js'));
});

gulp.task('static', function() {
   return gulp
      .src(resources.statics, {base: 'resources'})
      .pipe(gulp.dest(DEST));
});

gulp.task('default', ['css', 'js', 'static']);
gulp.task('watch', ['default'], function() {
   gulp.watch(resources.scss, ['css']);
   gulp.watch(resources.bootstrap, ['css']);
   gulp.watch(resources.html, ['js']);
   gulp.watch(resources.js, ['js']);
   gulp.watch(resources.statics, ['static']);
});

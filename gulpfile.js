'use strict';
var gulp = require('gulp');
var merge = require('merge2');
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
   ts: ['resources/ts/*',
        'resources/ts/typings/**/*.d.ts'],
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

// Create a typescript project so that increment compilation occurs much
// faster
var tsProject = $.typescript.createProject({
   module: 'system',
   out: 'ts.js',   // all in a single file
   removeComments: true,
   declaration: false,      // do not generate the definition file
   noExternalResolve: true, // All required files are in the stream
   noLib: false,   // include standard library if needed
   target: 'ES5',  // build for javascript 5 for now
   sortOutput: true,
   experimentalDecorators: false,
   emitDecoratorMetadata: false,
   preserveConstEnums: false,
   noEmitOnError: false,
   noImplicitAny: true,
});

gulp.task('js', function() {
   // Process HTML templates into javascript so that we do not have to load
   // them later on
   var html = gulp.src(resources.html)
      .pipe($.cached('all_templates'))
         .pipe($.minifyHtml({quotes: true}))
      .pipe($.remember('all_templates'))
      .pipe($.angularTemplatecache(
          {module: 'geneaprove', filename: 'templates.js',
           root: 'geneaprove/'}));

   // Convert typescript files to javascript
   var ts = gulp.src(resources.ts)
      .pipe($.typescript(tsProject));

   var uglified = merge(ts, html)  // in that order
      .pipe($.ngAnnotate()
            .on("error", $.notify.onError(function(error) {
               return error.message;
            })))
      .pipe($.uglify());

   // third parties
   var third = gulp.src([
         'node_modules/angular/angular.min.js',
         'node_modules/angular-sanitize/angular-sanitize.min.js',
         'node_modules/angular-ui-router/release/angular-ui-router.min.js',
         'node_modules/d3/d3.min.js',
         'node_modules/angular-local-storage/dist/angular-local-storage.min.js',
         'node_modules/angular-upload/angular-upload.min.js']);

   return merge(third, uglified)   // in sequence
      .pipe($.sourcemaps.init())
      .pipe($.concat('geneaprove.min.js'))  // move all files into one
      .pipe($.sourcemaps.write('.'))
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
   gulp.watch(resources.scss.concat(resources.bootstrap), ['css']);
   gulp.watch(resources.html.concat(resources.ts), ['js']);
   gulp.watch(resources.statics, ['static']);
});

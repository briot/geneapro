var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var gzip = require('gulp-gzip');
var ngannotate = require('gulp-ng-annotate');
var ngtemplates = require('gulp-angular-templatecache');
var minifyHTML = require('gulp-minify-html');
var addsrc = require('gulp-add-src');
var rename = require('gulp-rename');

// For CSS
var postcss = require('gulp-postcss');
var cssprocessors = [
   require('postcss-import'),
   require('css-mqpacker'), // media-query packer
   require('autoprefixer'),
   require('cssnano'),
];

var bootstrap = 'node_modules/bootstrap-sass/assets/stylesheets/bootstrap';

gulp.task('css', function() {
   return gulp.src('resources/sass/main.scss')
       //.pipe(sass({includePaths: [bootstrap],
       //            outputStyle: 'expanded'})
       //      .on('error', sass.logError))
       .pipe(postcss(cssprocessors))
       //.pipe(autoprefix({browser: ['last 2 versions'], cascade: false}))
       //.pipe(addsrc.append([
       //      'node_modules/font-awesome/css/font-awesome.css']))
       //  .pipe(cssmin())
       .pipe(concat('geneaprove.min.css'))
       .pipe(gulp.dest('resources/'))
       .pipe(rename('geneaprove.min.css_gz'))
       .pipe(gzip({append: false}))
       .pipe(gulp.dest('resources/'));
});

gulp.task('templates', function() {
   return gulp.src(['resources/geneaprove/**/*.html'])
       .pipe(minifyHTML({quotes: true}))
       .pipe(ngtemplates({module: 'geneaprove', filename: '.templates.js',
                          root: 'resources/geneaprove/'}))
       .pipe(gulp.dest('resources/geneaprove/'));
});

gulp.task('js', ['templates'], function() {
   return gulp.src('resources/js/*')
       .pipe(ngannotate())
       .pipe(uglify())
       .pipe(addsrc.prepend([
          'node_modules/angular/angular.min.js',
          'node_modules/angular-ui-router/release/angular-ui-router.min.js',
          'node_modules/d3/d3.min.js',
          'node_modules/angular-local-storage/dist/angular-local-storage.min.js',
          'node_modules/angular-upload/angular-upload.js']))
       .pipe(addsrc.append([
          'resources/geneaprove/.templates.js']))
       .pipe(concat('geneaprove.min.js'))
       .pipe(gulp.dest('resources/'))
       .pipe(rename('geneaprove.min.js_gz'))
       .pipe(gzip({append: false}))
       .pipe(gulp.dest('resources/'));
});

gulp.task('default', ['css', 'js']);
gulp.task('watch', ['default'], function() {
   gulp.watch(['resources/sass/*', 'gulpfile.js', bootstrap + '/*'], ['css']);
   gulp.watch(['resources/js/*', 'gulpfile.js', 'resources/html/**'], ['js']);
});

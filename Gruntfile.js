PRODUCTION=false;
MINIFIED_THIRD_PARTY=true;

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    /**
     * Process LessCSS files to generate proper minified CSS
     */
    less: {
       options: {report: 'min', compress: PRODUCTION, cleancss: true},
       build: {
          files: {
             'resources/tmp/lessoutput.css': [
                 'resources/css/*.less',
                 'resources/css/*.css']
          }
       }
    },

    /**
     * Minify CSS files
     */
    cssmin: {
      options: {report: 'min'},
      build: {
         src: 'resources/tmp/lessoutput.css',
         dest: 'resources/<%= pkg.name %>.min.css'
      }
    },

    /**
     * Compress the files
     */
/*    compress: {
       js: {
          options: {mode: 'gzip', pretty: true},
          files: [
             {expand: true,
              src: ['<%= pkg.name %>.min.js'],
              cwd: 'resources/tmp',
              ext: '.min.js_gz',
              dest: 'resources/'}
          ]
       },
       css: {
          options: {mode: 'gzip', pretty: true, level: 9},
          files: [
             {
                src: 'resources/tmp/<%= pkg.name %>.min.css',
                dest: 'resources/<%= pkg.name %>.css_gz'
             }
          ]
       }
    },
    */

    /**
     * Automatically annotate angularJS source code, so that dependency
     * injection is performed properly on controllers. Thus we can write
     * our javascript as:
     *   crmApp.controller('foo', function($scope) {})
     * and get automatically:
     *   crmApp.controller('foo', ['$scope', function($scope) {} ])
     */
    ngAnnotate: {
      options: {},
      build: {
         files: [{
            expand: true,
            cwd: 'resources',
            src: ['js/*.js'],
            dest: 'resources/tmp/',
            ext: '.tmp.js'
         }]
      }
    },

    /**
     * Add third-party libraries to our minified js, before we can compress.
     */
    concat: {
       options: { stripBanners: true },
       build: {
          src: [(MINIFIED_THIRD_PARTY ?
                     'node_modules/angular/angular.min.js' :
                     'node_modules/angular/angular.js'),
                'node_modules/angular-ui-router/release/angular-ui-router.min.js',
                (MINIFIED_THIRD_PARTY ?
                     'node_modules/d3/d3.min.js' :
                     'node_modules/d3/d3.js'),
                'node_modules/angular-local-storage/dist/angular-local-storage.min.js',
                'node_modules/angular-upload/angular-upload.js',
                'resources/tmp/<%= pkg.name %>.min.js'],
          dest: 'resources/<%= pkg.name %>.min.js',
          nonnull: true   // Warn when file is missing
       }
    },

    /**
     * Minify javascript files to save space
     */
    uglify: {
      options: {
        report: 'min',
        compress: PRODUCTION,
        mangle: PRODUCTION,
        beautify: !PRODUCTION,
        drop_console: false   //  remove console.log calls
      },
      build: {
        files: {
          'resources/tmp/<%= pkg.name %>.min.js': [
             'resources/tmp/js/app.tmp.js',  // must be first
             'resources/tmp/js/*.tmp.js']
        },
        notnull: true
      }
    },

    watch: {
      options: {
        atBegin: true
      },
      css: {
        files: ['Gruntfile.js', 'resources/css/*'],
        tasks: ['allcss']
      },
      js: {
        files: ['Gruntfile.js', 'resources/js/**/*.js'],
        tasks: ['alljs']
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-ng-annotate');
  grunt.loadNpmTasks('grunt-angular-templates');

  grunt.registerTask('allcss', ['less', 'cssmin', /* 'compress:css' */]);
  grunt.registerTask('alljs',
      ['ngAnnotate', 'uglify', 'concat', /* 'compress:js' */]);
  grunt.registerTask('default', ['allcss', 'alljs']);

};

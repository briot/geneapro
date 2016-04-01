var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var debugHTML = true;

module.exports = {
   metadata: {
      baseUrl: '/'
   },

   // Developer tool to enhance debugging
   devtool: 'source-map', //'cheap-module-eval-source-map',

   // Entry points for the bundles
   entry: {
      'geneaprove':  './resources/ts/main.ts',
      'vendor':      './resources/ts/vendor.ts',
   },

   resolve: {
      // which extensions to look for
      extensions: ['', '.ts', '.js', '.scss', '.html'],

      // Search for files under resoures/
      root: 'resources',

      alias: {
         //'dummy-es6':
         //   __dirname + '/node_modules/es6-shim/es6-shim.min.js',

         //'alias-angular2-polyfills':
         //   __dirname + '/node_modules/angular2/bundles/angular2-polyfills.min.js',

         'alias-d3': __dirname + '/node_modules/d3/d3.min.js',
         'alias-zonejs': __dirname + '/node_modules/zone.js/dist/zone.min.js'
      }
   },

   plugins: [
      new HtmlWebpackPlugin({
         template: 'resources/ts/index.html',
         chunkSortMode: 'auto'
      }),

      // remove files from the vendor from the app bundle
      new webpack.optimize.CommonsChunkPlugin(
            /* chunkName= */"vendor",
            /* filename= */ "vendor.bundle.js")

   ],

   output: {
      // Output directory as absolute path
      path: __dirname + '/static',

      // Name for each output on the disk
      filename: '[name].bundle.js',

      // Prefix to add to automatically generated URL for resources (in
      // index.html for the main bundle, and inside the bundles)
      // For fonts, we must specify the full http:// for Chrome
      // (this is only for the development version, since in production we
      // will extract the CSS)
      publicPath: 'http://127.0.0.1:8000/static/',

      // Name of sourcemap files
      sourceMapFilename: '[name].map',

      // Filename for non-entry chunks (external files,...)
      chunkFilename: '[id].chunk.js'
   },

   module: {
       noParse: [__dirname + '/node_modules/d3/d3.min.js',
                 //__dirname + '/node_modules/es6-shim/es6-shim.min.js',
                 __dirname + '/node_modules/@angular/core/bundles/core.umd.min.js',
                 __dirname + '/node_modules/@angular/common/bundles/common.umd.min.js',
                 //__dirname + '/node_modules/@angular/compiler/bundles/compiler.umd.min.js',
                 __dirname + '/node_modules/@angular/http/bundles/http.umd.min.js',
                 __dirname + '/node_modules/@angular/platform-browser-dynamic/bundles/platform-browser-dynamic.umd.min.js',
                 __dirname + '/node_modules/@angular/platform-browser/bundles/platform-browser.umd.min.js',
                 //__dirname + '/node_modules/@angular/platform-server/bundles/platform-server.umd.min.js',
                 __dirname + '/node_modules/@angular/router/bundles/router.umd.min.js',
                 __dirname + '/node_modules/rxjs/bundles/Rx.min.js',
                ],

       loaders: [
           {test: /\.ts$/,   loader: 'awesome-typescript-loader'},
           {test: /\.scss$/, loaders: ['style', 'css', 'sass'] },
           {test: /\.html$/, loader: 'html',
              exclude: [__dirname + '/resources/geneaprove/index.html']},

           // fonts for font-awesome
           { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
              loader: "url-loader?limit=10&minetype=application/font-woff&name=[name].[ext]" },
           { test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
              loader: "file-loader?name=[name].[ext]" }
       ]
   },

   // Options for specific plug-ins
   sassLoader: {
       includePaths: ['node_modules/bootstrap-sass/assets/stylesheets',
                      'node_modules/'],
   },
   htmlLoader: {
       minimize: !debugHTML,  // always, to detect errors in the HTML
       removeComments: !debugHTML,
       removeCommentsFromCDATA: !debugHTML,
       collapseWhitespace: !debugHTML,
       conservativeCollapse: false,
       removeAttributeQuotes: false,  // not compatible with Angular2
       useShortDoctype: true,
       keepClosingSlash: true,
   },
};

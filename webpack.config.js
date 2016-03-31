var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

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
         'angular':
            __dirname + '/node_modules/angular/angular.min.js',
         'angular-ui-router':
            __dirname + '/node_modules/angular-ui-router/release/angular-ui-router.min.js',
         'angular-sanitize':
            __dirname + '/node_modules/angular-sanitize/angular-sanitize.min.js',
         'angular-local-storage':
            __dirname + '/node_modules/angular-local-storage/dist/angular-local-storage.min.js',
         'angular-upload':
            __dirname + '/node_modules/angular-upload/angular-upload.min.js',
         'd3':
            __dirname + '/node_modules/d3/d3.min.js'
      }
   },

   plugins: [
      new HtmlWebpackPlugin({
         template: 'resources/geneaprove/index.html',
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
       noParse: [__dirname + '/node_modules/angular/angular.min.js',
                 __dirname + '/node_modules/angular-ui-router/release/angular-ui-router.min.js',
                 __dirname + '/node_modules/angular-sanitize/angular-sanitize.min.js',
                 __dirname + '/node_modules/angular-local-storage/dist/angular-local-storage.min.js',
                 __dirname + '/node_modules/angular-upload/angular-upload.min.js',
                 __dirname + '/node_modules/d3/d3.min.js'],

       loaders: [
           {test: /\.ts$/,   loader: 'awesome-typescript-loader'},
       // ??? Missing autoprefixer and cssmin
           {test: /\.scss$/, loaders: ['style', 'css?sourceMap', 'sass?sourceMap'] },
           {test: /\.html$/, loader: 'ngtemplate?relativeTo=resources/&module=geneaprove!html',
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
       minimize: true,  // always, to detect errors in the HTML
       removeComments: true,
       removeCommentsFromCDATA: true,
       collapseWhitespace: true,
       conservativeCollapse: false,
       removeAttributeQuotes: true,
       useShortDoctype: true,
       keepClosingSlash: true,
   },
};

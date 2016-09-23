var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var debugHTML = true;   // setting to false breaks the code

module.exports = {
   metadata: {
      baseUrl: '/'
   },

   // Developer tool to enhance debugging
   devtool: 'source-map',

   // Entry points for the bundles
   entry: {
      'vendor':      './resources/ts/vendor.ts',
      'geneaprove':  './resources/ts/main.ts'
   },

   resolve: {
      // which extensions to look for when an import doesn't specify them
      extensions: ['', '.ts', '.js', '.scss', '.html'],

      // Search for files under resoures/
      root: 'resources',

      alias: {
         'alias-zonejs': __dirname + '/node_modules/zone.js/dist/zone.min.js'
      }
   },

   plugins: [
      // Add <script> to index.html
      new HtmlWebpackPlugin({
         template: 'resources/ts/index.html',
         chunkSortMode: 'auto'
      }),

      // remove files from the vendor from the app bundle
      new webpack.optimize.CommonsChunkPlugin(
            /* chunkName= */"vendor",
            /* filename= */ "vendor.bundle.js"),
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
      indentedSyntax: false,
      indentWidth: 0,
   },
   htmlLoader: {
      minimize: !debugHTML,
      removeComments: true,
      removeCommentsFromCDATA: true,
      collapseWhitespace: true,
      conservativeCollapse: false,
      removeAttributeQuotes: false,  // not compatible with Angular2
      useShortDoctype: true,
      keepClosingSlash: true,
   },
};

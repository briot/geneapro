app.
config(function($stateProvider) {
   $stateProvider.
   state('sources', {
      url: '/sources/list',
      templateUrl: 'geneaprove/sources.html',
      controller: 'sourcesCtrl'
   }).
   state('source_new', {
      url: '/sources/new',
      templateUrl: 'geneaprove/source.html',
      controller: 'sourceCtrl'
   }).
   state('source', {
      url: '/sources/:id',
      templateUrl: 'geneaprove/source.html',
      controller: 'sourceCtrl'
   });
}).

controller('sourcesCtrl', function($scope, Paginated) {
   Paginated.instrument($scope, '/data/sources/list', 'settings.sources.rows');
}).

controller('sourceCtrl', function($scope, $http, $stateParams) {
   var id = $stateParams.id;
   var re_part = /\{\{([^}]+)\}\}/g;

   // The values that have been set by the user for the fields. This might
   // store information that are not used by the current medium, but were
   // entered for another medium, in case the user goes back to that medium
   $scope.cached_parts = {};

   // The citation template for the currently selected medium
   var citation = {full: '', short: '', biblio: ''};

   $scope.source = {}

   if (id === undefined) {
      id = -1;
   }

   $http.get('/data/sources/' + id).then(function(resp) {
      $scope.source = resp.data.source;
      $scope.source_types = resp.data.source_types;
      $scope.parts = resp.data.parts;
      angular.forEach($scope.parts, function(p) {
         $scope.cached_parts[p.name] = p.value;
      });
   });

   $scope.$watch('source.medium', function(val) {
      if (val) {
         $http.get('/data/citationModel/' + val).then(function(resp) {
            citation = resp.data;
            var required = [];
            var found = {};

            // Use an explicit order for citations, to get better control
            // on the order of fields in the UI.
            angular.forEach(
               [citation.full, citation.biblio, citation.short],
               function(cite) {
               var m;
               while ((m = re_part.exec(cite)) != null) {
                  if (!found[m[1]]) {
                     found[m[1]] = 1;
                     required.push(m[1]);
                  }
               }
            });
            $scope.required_parts = required;
            computeCitation();
         });
      }
   });

   $scope.$watch('cached_parts', computeCitation, true);

   function computeCitation() {
      if ($scope.source.medium) {
         var full = citation.full;
         var biblio = citation.biblio;
         var abbrev = citation.short;

         angular.forEach($scope.required_parts, function(name) {
            // Use a function for the replacement, to protect "$" characters
            function repl() { return $scope.cached_parts[name] || ''}
            full = full.replace('{{' + name + '}}', repl);
            biblio = biblio.replace('{{' + name + '}}', repl);
            abbrev = abbrev.replace('{{' + name + '}}', repl);
         });

         /** Remove special chars like commas, quotes,... when they do not
          *  separate words, in case some parts has not been set.
          */
         function cleanup(str) {
            var s = ''
            while (s != str) {
               s = str;
               str = str.replace(/^ *[,:;.] */g, ''). // leading characters
                         replace(/"[,.]?"/g, '').
                         replace(/\( *[,.:;]? *\)/g, '').
                         replace("<I></I>", '').
                         replace(/[,:;] *$/, '').
                         replace(/([,:;.]) *[,:;.]/g, "$1");
            }
            return str;
         }
         
         $scope.source.title = cleanup(full);
         $scope.source.biblio = cleanup(biblio);
         $scope.source.abbrev = cleanup(abbrev);
      }
   }
});

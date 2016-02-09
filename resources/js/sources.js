app.
config(function($stateProvider) {
   $stateProvider.
   state('sources', {
      url: '/sources/list',
      templateUrl: 'geneaprove/sources.html',
      controller: 'sourcesCtrl',
      data: {
         pageTitle: '[GP] List of sources'
      }
   }).
   state('source_new', {
      url: '/sources/new',
      templateUrl: 'geneaprove/source.html',
      controller: 'sourceCtrl',
      data: {
         pageTitle: '[GP] New Source'
      }
   }).
   state('source', {
      url: '/sources/:id',
      templateUrl: 'geneaprove/source.html',
      controller: 'sourceCtrl',
      data: {
         pageTitle: '[GP] Source {{id}}'
      }
   });
}).

controller('sourcesCtrl', function($scope, Paginated) {
   Paginated.instrument($scope, '/data/sources/list', 'settings.sources.rows');
}).

controller('sourceCtrl', function($scope, $http, $state, $stateParams) {
   var id = $stateParams.id;
   if (id === undefined) {
      id = -1;
   }

   var re_part = /\{([^}]+)\}/g;

   // The values that have been set by the user for the fields. This might
   // store information that are not used by the current medium, but were
   // entered for another medium, in case the user goes back to that medium
   $scope.cached_parts = {};

   // The citation template for the currently selected medium
   $scope.citation = {full: '', short: '', biblio: ''};

   // Always display the citation if the source does not exist yet
   $scope.showCitation = id = -1;
   $scope.source = {}

   // ??? Should use a service instead
   $http.get('/data/sources/' + id).then(function(resp) {
      $scope.source_types = resp.data.source_types;
      parseJson(resp);
   });

   $scope.$watch('source.medium', function(val) {
      if (val) {
         // ??? Should use a service instead
         $http.get('/data/citationModel/' + val).then(function(resp) {
            $scope.citation = resp.data;
            var required = [];
            var found = {};

            // Use an explicit order for citations, to get better control
            // on the order of fields in the UI.
            angular.forEach(
               [$scope.citation.full,
                $scope.citation.biblio,
                $scope.citation.short],
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

   // Parse a JSON response from the server (the 'source' and 'parts'
   // fields)
   function parseJson(resp) {
      $scope.source = resp.data.source;
      if ($scope.source.id == null) {
         $scope.source.id = -1;
      }
      $scope.parts = resp.data.parts;
      angular.forEach($scope.parts, function(p) {
         $scope.cached_parts[p.name] = p.value;
      });
   }

   function computeCitation() {
      if ($scope.source.medium) {
         var full = $scope.citation.full;
         var biblio = $scope.citation.biblio;
         var abbrev = $scope.citation.short;

         angular.forEach($scope.required_parts, function(name) {
            // Use a function for the replacement, to protect "$" characters
            function repl() { return $scope.cached_parts[name] || ''}
            full = full.replace('{' + name + '}', repl);
            biblio = biblio.replace('{' + name + '}', repl);
            abbrev = abbrev.replace('{' + name + '}', repl);
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

   $scope.saveParts = function() {
      //  ??? Should use a service instead
      var data = angular.copy($scope.source);
      angular.forEach($scope.required_parts, function(name) {
         if ($scope.cached_parts[name]) {
            data[name] = $scope.cached_parts[name];
         }
      });

      $http.post('/data/sources/' + $scope.source.id + '/saveparts', data).
         then(function(resp) {
            parseJson(resp);
            $state.transitionTo(
               'source',
               {id: $scope.source.id},
               {location:'replace', reload:false});
         });
   };
});

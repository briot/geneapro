app.
config(function($stateProvider) {
   $stateProvider.
   state('sources', {
      url: '/sources/list',
      templateUrl: 'geneaprove/sources.html',
      controller: 'sourcesCtrl'
   }).
   state('source', {
      url: '/sources/:id',
      templateUrl: 'geneaprove/source.html',
      controller: 'sourceCtrl'
   })
}).

controller('sourcesCtrl', function($scope, Paginated) {
   Paginated.instrument($scope, '/data/sources/list', 'settings.sources.rows');
}).

controller('sourceCtrl', function($scope, $http, $stateParams) {
   var id = $stateParams.id;

   $http.get('/data/sources/' + id).then(function(resp) {
      $scope.source = resp.data;
   });
});

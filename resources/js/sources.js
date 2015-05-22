app.
config(function($stateProvider) {
   $stateProvider.
   state('sources', {
      url: '/sources',
      templateUrl: 'geneaprove/sources.html',
      controller: 'sourcesCtrl'
   });
}).

controller('sourcesCtrl', function($scope, Paginated) {
   Paginated.instrument($scope, '/data/sources', 'settings.sources.rows');
});

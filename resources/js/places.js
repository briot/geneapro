app.
config(function($stateProvider) {
   $stateProvider.
   state('places', {
      url: '/places',
      templateUrl: 'geneaprove/places.html',
      controller: 'placesCtrl'
   });
}).

controller('placesCtrl', function($scope, Paginated) {
   Paginated.instrument($scope, '/data/places', 'settings.places.rows');
});

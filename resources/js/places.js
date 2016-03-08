app.
config(function($stateProvider) {
   $stateProvider.
   state('places', {
      url: '/places',
      templateUrl: 'geneaprove/places.html',
      controller: 'placesCtrl',
      data: {
         pageTitle: 'List of places'
      }
   }).

   state('place', {
      url: '/place/:id',
      templateUrl: 'geneaprove/place.html',
      controller: 'placeCtrl',
      data: {
         pageTitle: 'Place {{id}}'
      }
   });
}).

controller('placesCtrl', function($scope, Paginated) {
   Paginated.instrument($scope, '/data/places', 'settings.places.rows');
}).

controller('placeCtrl', function($scope) {
});

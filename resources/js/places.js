app.
config(function($stateProvider) {
   $stateProvider.
   state('places', {
      url: '/places',
      templateUrl: 'geneaprove/places.html',
      controller: 'placesCtrl',
      data: {
         pageTitle: '[Genaprove] List of places'
      }
   });
}).

controller('placesCtrl', function($scope, Paginated) {
   Paginated.instrument($scope, '/data/places', 'settings.places.rows');
});

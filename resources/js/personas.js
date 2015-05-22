app.
config(function($stateProvider) {
   $stateProvider.
   state('personas', {
      url: '/personas',
      templateUrl: 'geneaprove/personas.html',
      controller: 'personasCtrl'
   });
}).

controller('personasCtrl', function($scope, Paginated, $rootScope) {
   Paginated.instrument(
      $scope, '/data/personas', 'settings.personas.rows',
      function(data) { return data.persons });

   $scope.select = function(person) {
      $rootScope.decujus = person.id;
   };
});

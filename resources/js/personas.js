app.
config(function($stateProvider) {
   $stateProvider.
   state('personas', {
      url: '/personas',
      templateUrl: 'geneaprove/personas.html',
      controller: 'personasCtrl',
      data: {
         pageTitle: '[Genaprove] List of persons'
      }
   });
}).

controller('personasCtrl', function($scope, Paginated, $rootScope) {
   Paginated.instrument(
      $scope, '/data/persona/list', 'settings.personas.rows',
      function(data) { return data.persons });

   $scope.select = function(person) {
      $rootScope.decujus = person.id;
   };
});

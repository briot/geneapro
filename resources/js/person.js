app.
config(function($stateProvider) {
   $stateProvider.
   state('person', {
      url: '/person?id',
      templateUrl: 'geneaprove/person.html',
      controller: 'personCtrl',
      data: {
         pageTitle: '[Geneaprove] Person {{id}}'
      }
   });
}).

controller('personCtrl', function($scope, $http, $stateParams, $rootScope) {
   if ($stateParams.id !== undefined) {
       $rootScope.decujus = $stateParams.id;
   }
   $http.get('/data/persona/' + $rootScope.decujus).then(function(resp) {
      $scope.person = resp.data.person;
      $scope.p2p = resp.data.p2p;
   });

   $scope.toggleEventDetails = function(e) {
      e.$open = !e.$open;
      if (e.$open) {
         $http.get('/data/event/' + e.event.id).then(function(resp) {
            e.$details = resp.data;
         });
      }
   };
});

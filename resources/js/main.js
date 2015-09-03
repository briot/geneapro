app.
config(function($stateProvider) {
   $stateProvider.
   state('main', {
      url: '',
      templateUrl: 'geneaprove/main.html',
      controller: 'mainCtrl'
   });
}).

controller('mainCtrl', function($scope, $http, $state) {
   $http.get('/data/settings').then(function(resp) {
      var dp = resp.data.defaultPerson;
      if (dp > 0) {
         $state.go('pedigree', {id: dp});
         return;
      }
   });
});

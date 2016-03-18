/// <reference path="typings/angularjs/angular" />
/// <reference path="typings/angular-ui-router/angular-ui-router" />

module GP {
   app.config(($stateProvider : angular.ui.IStateProvider) => {
      $stateProvider.state('main', {
         url: '',
         templateUrl: 'geneaprove/dashboard.html',
         controller: DashboardController,
         data: { pageTitle: '[Genaprove] Dashboard' }
      });
   });

   type ServerDashboardResp = angular.IHttpPromiseCallbackArg<{
      defaultPerson : number;
   }>;

   class DashboardController {
      static $inject = ['$scope', '$http'];
      controller(
         $scope : angular.IScope,
         $http  : angular.IHttpService)
      {
         $http.get('/data/settings').then((resp : ServerDashboardResp) => {
            const dp = resp.data.defaultPerson;
         });
      }
   }
}

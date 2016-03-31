import {app} from './app';
import {} from 'angular';
import {} from 'angular-ui-router';

const html = require('geneaprove/dashboard.html');

app.config(($stateProvider : angular.ui.IStateProvider) => {
   $stateProvider.state('main', {
      url: '',
      templateUrl: html,
      controller: DashboardController,
      data: { pageTitle: '[Genaprove] Dashboard' }
   });
});

type ServerDashboardResp = angular.IHttpPromiseCallbackArg<{
   defaultPerson : number;
}>;

class DashboardController {
   static $inject = ['$scope', '$http'];
   constructor(
      $scope : angular.IScope,
      $http  : angular.IHttpService)
   {
      $http.get('/data/settings').then((resp : ServerDashboardResp) => {
         const dp = resp.data.defaultPerson;
      });
   }
}

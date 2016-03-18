/// <reference path="./basetypes.ts" />
/// <reference path="typings/angularjs/angular" />
/// <reference path="typings/angular-ui-router/angular-ui-router" />

module GP {
   export const app = angular.module(
         'geneaprove',
         ['ui.router',
          'LocalStorageModule',
          'lr.upload',
          'ngSanitize', //'ngDialog', 'ngQuickDate', 'ngCsv',
         ]).
   
   config(($urlRouterProvider : angular.ui.IUrlRouterProvider,
           $httpProvider      : angular.IHttpProvider) =>
   {
         $urlRouterProvider.otherwise('/');
   
         // Support for django csrf
         $httpProvider.defaults.xsrfCookieName = 'csrftoken';
         $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
   }).
   
   run(($rootScope   : IGPRootScope,
        $interpolate : angular.IInterpolateService) =>
   {
      // (readonly, set via Pedigree.select())
      $rootScope.decujus = 1;
   
      // Change the window title automatically using state's data.pageTitle
      // parameter. Only the state data is available for substitution.
      $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams) {
         $rootScope.pageTitle = (
            toState.data ?
               $interpolate(toState.data.pageTitle)(toParams) : 'Geneaprove');
      });
   });
}

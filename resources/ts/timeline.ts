/// <reference path="typings/angular-ui-router/angular-ui-router" />

module GP {
   app.config(($stateProvider : angular.ui.IStateProvider) => {
      $stateProvider.
      state('timeline', {
         url: '/timeline/:date',
         templateUrl: 'geneaprove/timeline.html',
         controller: TimelineController,
         data: {
            pageTitle: 'Timeline {{id}}'
         }
      });
   });

   class TimelineController {
   }
}


app.
config(function($stateProvider) {
   $stateProvider.
   state('timeline', {
      url: '/timeline/:date',
      templateUrl: 'geneaprove/timeline.html',
      controller: 'timelineCtrl',
      data: {
         pageTitle: 'Timeline {{id}}'
      }
   });
}).

controller('timelineCtrl', function() {
});


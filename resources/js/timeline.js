app.
config(function($stateProvider) {
   $stateProvider.
   state('timeline', {
      url: '/timeline/:date',
      templateUrl: 'geneaprove/timeline.html',
      controller: 'timelineCtrl',
      data: {
         pageTitle: '[GeneaProve] Timeline {{id}}'
      }
   });
}).

controller('timelineCtrl', function() {
});


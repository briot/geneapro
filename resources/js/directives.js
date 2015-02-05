app.

/**
 * A button used in the main menu bar
 */
directive('gpMenubutton', function(Pedigree) {
   return {
      scope: {
         url: '@gpMenubutton', // target url
         title: '@',
         icon: '@'
      },
      replace: true,
      controller: function($scope, $rootScope) {
         $rootScope.$watch('decujus', function(val) {
            $scope.target = '#' + $scope.url + '?id=' + val;
         });
      },
      template: '<li>' +
         '<a href="{{target}}" Aui-sref="{{state}}" title="{{title}}">' +
            '<span ng-if="!icon">{{title}}</span>' +
            '<img ng-if="icon" ng-src="{{icon}}"/>' +
         '</a></li>'
   };
}).

filter('paginate', function() {
   return function(input, page, pageSize, filter) {
      if (pageSize === undefined) {
         return input;
      }
      if (input) {
         page = (Number(page, 1) - 1) * pageSize;
         return input.slice(page, page + pageSize);
      }
   };
});

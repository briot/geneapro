app
.factory('Legend', function($http, $q) {
   class Legend {
      get() {
         if (this.promise === undefined) {
            const q = $q.defer();
            this.promise = q.promise;
            $http.get('/data/legend').then(function(resp) {
               q.resolve(resp.data);
            }, function() {
               q.reject();
            });
         }
         return this.promise;
      }
   }
   return new Legend;
})

.directive('gpLegend', function(Legend) {
   return {
      replace: true,
      template: '<div>' +
         '<input type="button" ng-click="toggleLegend()" value="Show Legend"></input>' +
         '<div ng-if="show" class="legend">' +
            '<h2>Custom colors</h2>' +
            '<table>' +
               '<tr ng-repeat="r in rules">' +
                  '<td style="{{r.css}}">{{r.name}}</td>' +
               '</tr>' +
            '</table>' +
         '</div></div>',
      controller: function($scope) {
         $scope.show = false;
         $scope.toggleLegend = function() {
            $scope.show = !$scope.show;
            if ($scope.show) {
               Legend.get().then(function(data) {
                  $scope.rules = data.rules;
               });
            }
         };
      }
   };
});

/// <reference path="./paginate.ts" />
/// <reference path="typings/angularjs/angular" />
/// <reference path="typings/angular-ui-router/angular-ui-router" />

module GP {
   app.
   config(($stateProvider : angular.ui.IStateProvider) => {
      $stateProvider.
      state('places', {
         url: '/places',
         templateUrl: 'geneaprove/places.html',
         controller: PlaceListController,
         controllerAs: 'ctrl',
         data: {
            pageTitle: 'List of places'
         }
      }).
   
      state('place', {
         url: '/place/:id',
         templateUrl: 'geneaprove/place.html',
         controller: PlaceController,
         data: {
            pageTitle: 'Place {{id}}'
         }
      });
   });

   class PlaceListController {
      static $inject = ['$scope', 'Paginated'];
      constructor(
         $scope    : IPaginateScope,
         paginated : PaginatedService)
      {
          paginated.instrument($scope, '/data/places', 'settings.places.rows');
      }
   }

   class PlaceController {
   }
}

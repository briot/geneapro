import {} from 'angular';
import {} from 'angular-ui-router';
import {IPaginateScope, PaginatedService} from './paginate';
import {app} from './app';

const html_places = require('geneaprove/places.html');
const html_place  = require('geneaprove/place.html');

app.
config(($stateProvider : angular.ui.IStateProvider) => {
   $stateProvider.
   state('places', {
      url: '/places',
      templateUrl: html_places,
      controller: PlaceListController,
      controllerAs: 'ctrl',
      data: {
         pageTitle: 'List of places'
      }
   }).

   state('place', {
      url: '/place/:id',
      templateUrl: html_place,
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

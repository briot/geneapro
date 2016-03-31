import {} from 'angular';
import {} from 'angular-ui-router';
import {app} from './app';
import {IPerson} from './basetypes';
import {IPaginateScope, PaginatedService} from './paginate';

const html_personas = require('geneaprove/personas.html');

app.config(($stateProvider : angular.ui.IStateProvider) => {
   $stateProvider.
   state('personas', {
      url: '/personas',
      templateUrl: html_personas,
      controller: PersonaListController,
      controllerAs: 'ctrl',
      data: {
         pageTitle: '[Genaprove] List of persons'
      }
   });
});

interface ServerPersonaListResp {
   persons: IPerson[];
}

class PersonaListController {
   static $inject = ['$scope', 'Paginated'];
   constructor(
      $scope     : IPaginateScope,
      paginated  : PaginatedService)
   {
      paginated.instrument(
         $scope, '/data/persona/list', 'settings.personas.rows',
         (data : ServerPersonaListResp) => data.persons);
   }
}

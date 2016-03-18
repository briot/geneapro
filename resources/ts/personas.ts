/// <reference path="./paginate.ts" />
/// <reference path="./basetypes.ts" />
/// <reference path="typings/angularjs/angular" />
/// <reference path="typings/angular-ui-router/angular-ui-router" />

module GP {
   app.config(($stateProvider : angular.ui.IStateProvider) => {
      $stateProvider.
      state('personas', {
         url: '/personas',
         templateUrl: 'geneaprove/personas.html',
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
}

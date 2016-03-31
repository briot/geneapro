import {} from 'angular';
import {} from 'angular-ui-router';
import {app} from './app';
import {IPerson, ISource, IAssertion, IGPRootScope} from './basetypes';

const html_person = require('geneaprove/person.html');

app.config(($stateProvider : angular.ui.IStateProvider) => {
   $stateProvider.
   state('person', {
      url: '/person?id',
      templateUrl: html_person,
      controller: PersonController,
      controllerAs: 'ctrl',
      data: {
         pageTitle: 'Person {{id}}'
      }
   });
});

interface ServerPersonaData {
   person  : IPerson,
   sources : { [id: number]: ISource},
   p2p     : IAssertion[]
}
type ServerPersonaResp = angular.IHttpPromiseCallbackArg<ServerPersonaData>;

interface ServerEventData {
   disproved  : boolean;
   rationale  : string;

   role_name  : string;
   person     : {name : string, id : number},
   surety     : number;  //  surety part id
   source     : {id : number };
}

//  ??? The server doesn't exactly return an assertion (though it should)
type ServerEventResp = angular.IHttpPromiseCallbackArg<ServerEventData>;

class PersonController {
   person  : IPerson;
   sources : { [id : number] : ISource};
   p2p     : IAssertion[];

   static $inject = ['$scope', '$http', '$stateParams', '$rootScope'];
   constructor(
      public $scope : angular.IScope,
      public $http  : angular.IHttpService,
      $stateParams  : angular.ui.IStateParamsService,
      $rootScope    : IGPRootScope)
   {
      if ($stateParams['id'] !== undefined) {
          $rootScope.decujus = $stateParams['id'];
      }
      $http.get('/data/persona/' + $rootScope.decujus).then(
         (resp : ServerPersonaResp) => {
            this.person = resp.data.person;
            this.sources = resp.data.sources;
            this.p2p = resp.data.p2p;
         });
   }
   
   toggleEventDetails(e : IAssertion) {
      e.$open = !e.$open;
      if (e.$open) {
         this.$http.get('/data/event/' + e.event.id).then(
            (resp : ServerEventResp) => {
               e.$details = resp.data;
            });
      }
   };
}

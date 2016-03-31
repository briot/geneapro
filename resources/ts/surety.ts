import {} from 'angular';
import {} from 'angular-ui-router';
import {app} from './app';

/**
 * A service that downloads information about the surety schemes created
 * by the user, and provide that information asynchronously.
 * The service must be used asynchronously:
 *     function controller(suretySchemes) {
 *        suretySchemes.then(function(data) {
 *           // data is of type SuretySchemes, see below
 *         });
 *     }
 */

interface SuretySchemePart {
   id          : number,
   name        : string,
   description : string,
   sequence    : number /* sequence number */
   scheme      ?: number;  /* SuretyScheme id */
}
interface SuretyScheme {
   id          : number,
   name        : string,
   description : string,
   parts       : SuretySchemePart[]
}

class SuretySchemesList {
   private _parts : SuretySchemePart[] = [];  // indexed by id

   constructor(
      public schemes : SuretyScheme[])
   {
      angular.forEach(schemes, (s, s_idx) => {
         angular.forEach(s.parts, (p) => {
            this._parts[p.id] = p;
            p.scheme = s_idx;
         });
      });
   }

   partFromId(id : number) {
      return this._parts[id];
   }
   schemeFromPart(partid : number) {
      const p = this._parts[partid];
      return p && this.schemes[p.scheme];
   }
}

type ServerSuretySchemeResp = angular.IHttpPromiseCallbackArg<SuretyScheme[]>;

class SuretySchemesService {
   private _promise : angular.IPromise<SuretySchemesList>;

   static $inject = ['$http', '$q'];
   constructor(
       public $http : angular.IHttpService,
       public $q    : angular.IQService)
   {
   }

   get() {
      if (!this._promise) {
         const q = this.$q.defer();
         this._promise = q.promise;

         this.$http.get('data/suretySchemes').then(
            (resp : ServerSuretySchemeResp) => {
                q.resolve(new SuretySchemesList(resp.data));
         }, function() {
            q.reject();
         });
       }
      return this._promise;
   }
}

app.service('suretySchemes', SuretySchemesService);

interface GpSuretyScope extends angular.IScope {
   surety   : number,
   selected : number,
   scheme   : SuretyScheme
}

app.directive('gpSurety', (suretySchemes : SuretySchemesService) => {
   return {
      scope: {
         surety   : '=gpSurety'
      },
      replace: true,
      link: (scope : GpSuretyScope) =>  {
         suretySchemes.get().then((data) => {
            scope.scheme = data.schemeFromPart(scope.surety);
            const part = data.partFromId(scope.surety);
            if (scope.scheme) {
               scope.selected = part.sequence;
            }
         });
      },
      template: '<ul class="rating">' +
         '<li ng-repeat="p in scheme.parts" title="{{p.name}}&#10;{{p.description}}">' +
            '<i ng-if="p.sequence<=selected" class="filled fa fa-star"></i>' +
            '<i ng-if="p.sequence>selected" class="fa fa-circle"></i>' +
         '</li>' +
         '</ul>'
   };
});

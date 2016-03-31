import {} from 'angular';
import {} from 'angular-ui-router';
import {app} from './app';

type RulesList = {name : string; css : string}[];
interface ServerLegendRespData {
   rules : RulesList;
}
type ServerLegendResp = angular.IHttpPromiseCallbackArg<ServerLegendRespData>;

class LegendService {
   private promise : angular.IPromise<ServerLegendRespData>;

   static $inject = ['$q', '$http'];
   constructor(public $q : angular.IQService,
               public $http : angular.IHttpService)
   {
   }

   get() {
      if (this.promise === undefined) {
         const q = this.$q.defer();
         this.promise = q.promise;
         this.$http.get('/data/legend').then((resp : ServerLegendResp) => {
            q.resolve(resp.data);
         }, function() {
            q.reject();
         });
      }
      return this.promise;
   }
}

class LegendController {
   show  : boolean = false;
   rules : RulesList;

   static $inject = ['$scope', 'LegendService'];
   constructor($scope : angular.IScope,
               public legend : LegendService) {
   }

   toggleLegend() {
      this.show = !this.show;
      if (this.show) {
         this.legend.get().then((data) => {
            this.rules = data.rules;
         });
      }
   }
}

app.service('LegendService', LegendService)
   .directive(
   'gpLegend',
   () =>
{
   return {
      replace: true,
      template: '<div>' +
         '<input type="button" ng-click="ctrl.toggleLegend()" value="Show Legend"></input>' +
         '<div ng-if="ctrl.show" class="legend">' +
            '<h2>Custom colors</h2>' +
            '<table>' +
               '<tr ng-repeat="r in ctrl.rules">' +
                  '<td style="{{r.css}}">{{r.name}}</td>' +
               '</tr>' +
            '</table>' +
         '</div></div>',
      controller: LegendController,
      controllerAs: 'ctrl'
   };
});

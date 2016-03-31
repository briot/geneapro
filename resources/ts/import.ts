import {} from 'angular';
import {} from 'angular-ui-router';
import {app} from './app';

const html_import = require('geneaprove/import.html');

app.config(($stateProvider : angular.ui.IStateProvider) => {
   $stateProvider.
   state('import', {
      url: '/import',
      templateUrl: html_import,
      controller:  ImportController,
      controllerAs: 'ctrl',
      data: { pageTitle: '[Geneaprove] Import' }
   })
})

type ServerImportResp = angular.IHttpPromiseCallbackArg<{
   success : boolean;
   error   ?: string;
}>

class ImportController {
   success        : boolean;   // undefined initially
   error          : string;
   importing      : boolean = false;
   importFileName : [string, HTMLInputElement];

   static $inject = ['$scope', 'upload']
   constructor(
      $scope : angular.IScope,
      public upload : any)
   {
      $scope.$watch('ctrl.importFileName', () => this.import());
   }

   import() {
      if (this.importFileName) {
         this.importing = true;
         this.upload({
            url: '/import',
            method: 'POST',
            data: { file: this.importFileName[1] }
         }).then((resp : ServerImportResp) => {
            this.success = resp.data.success;
            this.error = resp.data.error;
            this.importing = false;
         });
      }
   }
}

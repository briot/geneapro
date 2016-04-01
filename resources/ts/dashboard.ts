import {Component} from '@angular/core';
import {Settings} from './settings.service';
import {RouterLink} from '@angular/router-deprecated';

@Component({
   template: require('./dashboard.html'),
   directives: [RouterLink]
})
export class Dashboard {
   constructor(settings : Settings) {
      // $http.get('/data/settings').then((resp : ServerDashboardResp) => {
      //    const dp = resp.data.defaultPerson;
      // });

      settings.setTitle('Dashboard');
   }
}

// const html = require('geneaprove/dashboard.html');
//type ServerDashboardResp = angular.IHttpPromiseCallbackArg<{
//   defaultPerson : number;
//}>;


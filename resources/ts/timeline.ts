import {app} from './app';
import {} from 'angular-ui-router';

const html_timeline = require('geneaprove/timeline.html');

app.config(($stateProvider : angular.ui.IStateProvider) => {
   $stateProvider.
   state('timeline', {
      url: '/timeline/:date',
      templateUrl: html_timeline,
      controller: TimelineController,
      data: {
         pageTitle: 'Timeline {{id}}'
      }
   });
});

class TimelineController {
}

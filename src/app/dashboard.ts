import {Component} from '@angular/core';
import {Settings} from './settings.service';

@Component({
   templateUrl: './dashboard.html'
})
export class Dashboard {
   constructor(settings : Settings) {
      settings.setTitle('Dashboard');
   }
}

import {Component} from '@angular/core';
import {Settings} from './settings.service';

@Component({
   selector: 'menu-bar',
   styleUrls: ['./logo.scss'],
   templateUrl: './menubar.html'
})
export class Menubar {
   constructor(public settings : Settings) {}

}

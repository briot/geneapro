import {ROUTER_DIRECTIVES} from '@angular/router-deprecated';
import {Component} from '@angular/core';
import {MenuButton} from './menubar.button';
import {Settings} from './settings.service';

@Component({
   selector: 'menu-bar',
   template: require('./menubar.html'),
   directives: [ROUTER_DIRECTIVES, MenuButton]
})
export class Menubar {
   constructor(public settings : Settings) {}

}

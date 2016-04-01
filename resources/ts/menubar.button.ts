/**
 * A button used in the main menu bar
 */

import {Component, Input} from '@angular/core';
import {NgIf} from '@angular/common';
import {RouterLink} from '@angular/router-deprecated';
import {Settings} from './settings.service';

@Component({
   selector:   'li[menuButton]',
   template:   require('./menubar.button.html'),
   directives: [RouterLink, NgIf]
})
export class MenuButton {
   @Input() comp = '';  // The target component
   @Input() title = '';
   @Input() icon = '';

   constructor(public settings : Settings) {}
}

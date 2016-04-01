import {Component, Input, Output, EventEmitter} from '@angular/core';
import {Control, CORE_DIRECTIVES, FORM_DIRECTIVES} from '@angular/common';

var floatlabel_id = 0;

/**
 * A form input with a floating label on top of it.
 * The label plays the role of a placeholder, but is still displayed when
 * the input contains some input.
 */
@Component({
   selector: 'floatlabelinput',
   template: require('./floatlabels.html'),
   directives: [CORE_DIRECTIVES, FORM_DIRECTIVES]
})
export class FloatLabelInput {
   @Input() label : string;
   @Input() title : string;
   @Input() readonly : boolean;

   // If greater than 1, display a textarea rather than a single line input
   @Input() lines  : number = 1;

   @Input() modelpath : string;
   @Output() modelpathChange : EventEmitter<String> = new EventEmitter<String>();
   
   labelid  : string;

   constructor() {
      this.labelid = 'floatlabel' + (floatlabel_id++);
   }
}

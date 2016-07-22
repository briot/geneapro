/**
 * A form input with a floating label on top of it.
 * The label plays the role of a placeholder, but is still displayed when
 * the input contains some input.
 */

import {Component, Provider, forwardRef, Input, Output} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR, } from '@angular/forms';
import {CORE_DIRECTIVES} from '@angular/common';

var floatlabel_id = 0;

const noop = () => {};
const FLOATLABEL_CONTROL_VALUE_ACCESSOR = new Provider(
   NG_VALUE_ACCESSOR,
   {useExisting: forwardRef(() => FloatLabelInput), multi: true});

@Component({
   selector: 'floatlabelinput[formControl],floatlabelinput[ngModel]',
   template: require('./floatlabels.html'),
   directives: [CORE_DIRECTIVES],
   providers: [FLOATLABEL_CONTROL_VALUE_ACCESSOR]
})
export class FloatLabelInput implements ControlValueAccessor {
   @Input() label : string;
   @Input() title : string = "";
   @Input() readonly : boolean;

   // If greater than 1, display a textarea rather than a single line input
   @Input() lines  : number = 1;

   labelid  : string;
   val      : string;

   //private _value : any = '';  // the internal data model
   private _onChangeCallback: (_:any) => void  = noop;
   private _onTouchedCallback: () => void  = noop;

   constructor() {
      this.labelid = 'floatlabel' + (floatlabel_id++);
   }

   writeValue(value : any) {  // from ControlValueAccessor interface
      // Called when the ngModel is updated programmatically, for instance
      // once the data has been loaded via JSON. We don't need to let
      // listeners know about it, since they just told us (and doing so
      // would mark the form as not-pristine.
      this.val = value;
   }
   registerOnChange(fn : any) {  // from ControlValueAccessor interface
      this._onChangeCallback = fn;
   }
   registerOnTouched(fn : any) {  // from ControlValueAccessor interface
      this._onTouchedCallback = fn;
   }
   onTouched() {
      this._onTouchedCallback();
   }
   onChange(value : any) {
      this._onChangeCallback(value);
   }
}

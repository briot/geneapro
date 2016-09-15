import {Component, Input} from '@angular/core';
import {AssertionList} from './asserts.service';

@Component({
   selector: 'gp-asserts',
   template: require('./asserts.html')
})
export class Asserts {
   @Input() asserts : AssertionList;

}

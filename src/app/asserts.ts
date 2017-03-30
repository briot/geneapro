import {Component, Input} from '@angular/core';
import {AssertionList} from './asserts.service';

@Component({
   selector: 'gp-asserts',
   templateUrl: './asserts.html'
})
export class Asserts {
   @Input() asserts : AssertionList;

}

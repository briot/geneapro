import {Component, Input} from '@angular/core';
import {FloatLabelInput} from './floatlabels';
import {AssertSubjectDirective} from './asserts.subject';
import {AssertionList} from './asserts.service';

@Component({
   selector: 'gp-asserts',
   template: require('./asserts.html'),
   directives: [FloatLabelInput, AssertSubjectDirective]
})
export class Asserts {
   @Input() asserts : AssertionList;

}

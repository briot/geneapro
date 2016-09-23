import {Component, Input} from '@angular/core';
import {AssertionList, Assertion, AssertSubject} from './asserts.service';

@Component({
   selector: 'assert-subject',
   templateUrl: './asserts.subject.html',
})
export class AssertSubjectDirective {
   @Input('assertion') assert  : Assertion;
   @Input('asserts')   asserts : AssertionList;
   @Input('subject-num') subjectNum : number;

   sub        : AssertSubject;

   ngOnChanges(changes : any) {
      this.sub = (this.subjectNum == 1 ? this.assert.p1 : this.assert.p2);
   }

   onKindChanged(event : any) {
   }

   /**
    * Return the list of valid subject types, depending on whether we
    * are manipulating the first or second subject, and the value alread
    * set for the other subject
    */
   validTypes() : AssertSubject[] {
      if (this.subjectNum == 1) {
         return this.asserts.allPersons;
      } else {
         return [].
            concat(this.asserts.allPersons,
                   this.asserts.allEvents,
                   this.asserts.allGroups);
      }
   }
}

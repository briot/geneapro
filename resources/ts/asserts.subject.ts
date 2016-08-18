import {Component, Input} from '@angular/core';
import {GroupByPipe} from './groupby';
import {AssertionList, Assertion, AssertSubject, AssertSubjectPerson,
        AssertSubjectGroup, AssertSubjectEvent,
        AssertSubjectChar} from './asserts.service';
import {PersonaLink, PlaceLink, SourceLink, TimeLink} from './links';

@Component({
   selector: 'assert-subject',
   template: require('./asserts.subject.html'),
   directives: [PersonaLink, PlaceLink, SourceLink, TimeLink],
   pipes: [GroupByPipe]
})
export class AssertSubjectDirective {
   @Input('assertion') assert  : Assertion;
   @Input('asserts')   asserts : AssertionList;
   @Input('subject-num') subjectNum : number;

   sub        : AssertSubject;

   ngOnChanges() {
      this.sub = (this.subjectNum == 1 ? this.assert.p1 : this.assert.p2);
   }

   onKindChanged(event : any) {
      console.log("kind changed to ", event);
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

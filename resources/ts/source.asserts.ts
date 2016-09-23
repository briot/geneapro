import {Component, Input} from '@angular/core';
import {SourceData} from './source.service';

@Component({
   selector: 'gp-source-asserts',
   templateUrl: './source.asserts.html'
})
export class SourceAsserts {
   @Input() data : SourceData;

   newAssert() {
/*
      this.data.asserts.unshift({
         $edited: true,
         disproved: false,
         rationale: '',
         researcher: {id: undefined, name: 'you'},
         last_change: new Date(),
         source_id: this.$scope.source.id,
         surety: undefined,
         p1: {},
         p2: {}
      });
*/

   }

}

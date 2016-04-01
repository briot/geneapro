/**
 * A pipe that allows a *ngFor on an object, while grouping the elements
 * on a specific key
 */

import {Pipe} from '@angular/core';

type GroupableObject = {[key:string]: string|any};
type GroupedObject = [GroupableObject[]];
type Grouped = {[groupname:string]: GroupableObject[]};

@Pipe({
   name: 'groupBy',
   pure: true
})
export class GroupByPipe {
   transform(values: GroupableObject[], fieldname: string) {
      if (!values) {
         return undefined;
      }

      let groups : Grouped = {};
      values.forEach((v : GroupableObject) => {
         if (v.hasOwnProperty(fieldname)) {
            let cat = v[fieldname];
            let g = groups[cat];
            if (!g) {
               groups[cat] = [v];
            } else {
               g.push(v);
            }
         }
      });
      return Object.keys(groups).map(groupname => groups[groupname]);
   }
}

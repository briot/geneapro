/**
 * A pipe that allows a *ngFor on an object, while grouping the elements
 * on a specific key. The key can be the name of a string field, or the name
 * of a parameter-less method that returns a string.
 *
 *  <optgroup [label]='g.name' *ngFor='let g of values | groupBy:"group"'>
 *     <option *ngFor='let s of g' [value]='s'>{{s.name}}</option>
 *  </optgroup>
 */

import {Pipe} from '@angular/core';

type GroupableObject = {[key:string]: string|any};
interface GroupContent {
   name ?: string;  // name of group
   [position:number]: GroupableObject; // list of items in this group
   push(g : GroupableObject): number;
   sort(compareFn ?: (a:GroupableObject, b:GroupableObject) => number) : void;
};
type Grouped = {[groupname:string]: GroupContent};

@Pipe({
   name: 'groupBy',
   pure: true
})
export class GroupByPipe {
   transform(values: GroupableObject[], fieldname: string, sortname ?: string) {
      if (!values) {
         return undefined;
      }

      let groups : Grouped = {};
      values.forEach((v : GroupableObject) => {
         let cat : string = undefined;
         if (v.hasOwnProperty(fieldname)) {
            cat = v[fieldname];
         } else if (typeof(v[fieldname]) == "function") {
            cat = v[fieldname]();
         }

         if (cat) {
            let g = groups[cat];
            if (!g) {
               g = groups[cat] = <GroupContent> [v];
               g.name = cat;
            } else {
               g.push(v);
            }
         }
      });
      return Object.keys(groups).map(groupname => {
         let r = groups[groupname];
         if (sortname) {
            r.sort((a, b) => (a[sortname] < b[sortname] ? -1 : (a[sortname] == b[sortname]) ? 0 : 1));
         }
         return r;
      });
   }
}

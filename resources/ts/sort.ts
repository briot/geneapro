import {Directive, Input} from '@angular/core';
import {LocalStorage} from './localstorage.service';

// Sorters that can be used by the 'sortBy' directive.
const numericCompare = (a : number, b : number) => a - b;
const strCompare = (a : string, b : string) => (a < b) ? -1 : (b < a) ? 1 : 0;
interface Sorter<T> {
   compare : (a : T, b : T) => number,  // -1, 0, 1
   format  : (s : any) => T  // transform value of model to compare value
}
const sorters : { [key : string] : Sorter<any> } = {
   'text':    {compare: strCompare,     format: s => s},
   'numeric': {compare: numericCompare, format: (s : string) => +s},
   'date':    {compare: numericCompare, format: (s : string) => Date.parse(s)}
};

/**
 * Information stored in local storage
 */
interface sortLocalStorage {
   idx : number;
   asc : boolean;
}

/**
 * Order of calls:
 *    addColumn (for each sortable column)
 *    ngOnChanges (sets name and data) -- columns do not have getters yet
 *    ngOnInit (for SortOn then for each sortable column)
 *    setDefault (in the middle of the ngOnInit sequence)
 *    ngAfterViewInit
 *    ngOnChanges called regularly if data changes
 */
@Directive({
   selector: "table[sortOn]",
   inputs:   ['data : sortOn', 'name : sortName']
})
export class SortOn {
   private name : string;            // name in local storage
   private data : any[];             // The table to sort
   private _columns : SortBy[] = []; // The various sort columns
   current : SortBy;        // Current sort column

   ascending : boolean = true;
   private _sorterComputed : boolean = false; // whether we have computed the $sort column

   constructor(private _storage : LocalStorage) {}

   /**
    * register a new sortable column
    */
   addColumn(col : SortBy) {
      col.idx = this._columns.length;
      this._columns.push(col);
   }

   /**
    * Mark a column as the default sort column, unless one was set in local storage
    */
   setDefault(col : SortBy) {
      if (this.current === undefined) {
         this.current = col;
      }
   }

   ngOnChanges(changes : any) {
      var c = this.current;
      if (this.name && changes['name']) {
         const d = this._storage.get<sortLocalStorage>(this.name);
         if (d) {
            this.ascending = d.asc;
            c = this._columns[d.idx];
         }
      }
      this.sort(c);
   }

   /**
    * Sets col as the sort column. If it was already the sort column, changes
    * the sort order.
    * Meant to be called from SortBy
    */
   toggleAsc(col : SortBy) {
      if (col == this.current) {
         this.ascending = !this.ascending;
      }
      this.sort(col);

      if (this.name) {
         this._storage.set<sortLocalStorage>(
            this.name, {idx: col.idx, asc: this.ascending});
      }
   }

   ngAfterViewInit() {
      this.sort(this.current);
   }

   /**
    * Perform the sorting of the table.
    * For each element of the table, the getter returns the field to be sorted.
    * This function automatically takes the sorting criteria into account.
    */
   private sort(col : SortBy) {
      if (!this.data || !col || !col.getter) {
         this.current = col;   // in case we get the data later
         this._sorterComputed = false;
         return;
      }

      const sorter = sorters[col.sorter];
      if (this.current != col || !this._sorterComputed) {
         // Precompute the sort field (once) with appropriate conversion (in
         // particular for dates)
         this.data.forEach((a : any) => a.$sort = sorter.format(col.getter(a)));
         this._sorterComputed = true;
      }

      this.current = col;

      if (this.ascending) {
         this.data.sort((a : any, b : any) => sorter.compare(a.$sort, b.$sort));
      } else {
         this.data.sort((a : any, b : any) => -sorter.compare(a.$sort, b.$sort));
      }
   }
}

@Directive({
   selector:  'th[sortBy]',
   inputs:    ['getter : sortBy', 'sorter', 'isdefault'],
   host:      {
      '(click)':                'changeSort()',
      'class':                  'sortable',
      '[class.headerSortUp]':   'sortOn.current?.idx==idx && sortOn.ascending==false',
      '[class.headerSortDown]': 'sortOn.current?.idx==idx && sortOn.ascending==true'
   }
})
export class SortBy {
   getter : (v : any) => any;    // Extracts the field to sort from an element of the table
   sorter : string = 'text';     // Name of the sorter to use
   isdefault : boolean = false;  // Whether this is the default sort order (only read once)

   idx : number;  // To store in local storage (index in parent's list of columns)

   constructor(private sortOn : SortOn) {
      sortOn.addColumn(this);
   }

   ngOnInit() {
      if (this.isdefault) {
         this.sortOn.setDefault(this);
      }
   }

   changeSort() {
      this.sortOn.toggleAsc(this);
   }
}

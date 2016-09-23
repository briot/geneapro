import {Component, Injectable, Input, EventEmitter} from '@angular/core';

/**
 * Return an array with the elements of data that have a field containing
 * the string filter (case insensitive)
 */
function filterArray(data : any[], filter : string) {
   filter = filter.toLowerCase();
   return data.filter(item => {
      for (let key in item) {
         if ((typeof item[key] === 'string' || item[key] instanceof String)
             && (item[key].toLowerCase().indexOf(filter) !== -1)) {
             return true;
         }
      }
   });
}

/**
 * This service must be injected in components that use the <paginated>
 * directive. It contains the data used by that directive and also the
 * list of filtered data to display, depending on rows per page and current
 * filter.
 */
@Injectable()
export class PaginateData {
   rows = [{rows: 10,  label: '10'},
           {rows: 20,  label: '20'},
           {rows: 30,  label: '30'},
           {rows: 40,  label: '40'},
           {rows: 50,  label: '50'},
           {rows: 60,  label: '60'},
           {rows: 70,  label: '70'},
           {rows: 80,  label: '80'},
           {rows: 100, label: '100'},
           {rows: 200, label: '200'},
           {rows: undefined, label: 'All'}];
   rowsPerPage  = 10; // number of rows per page
   page         = 1; // current page
   maxPage      = 0; // maximal page
   offset       = 0; // index of first displayed row
   offsetMax    = 0; // index of last displayed row
   private data         : any[];      // data to display
   private filteredData : any[] = undefined; // data after applying the filter
   pagedData    : any[] = undefined; // filtered data visible on current page
   pageRange    : number[];   // page numbers to display at bottom
   private _filter = '';  // current filter

   constructor() {
   }

   setPage(page : number) {
      const len = this.filteredData !== undefined ? this.filteredData.length : 0;
      if (len == 0) {
         this.offset = 0;
         this.offsetMax = 0;  // last on page
         this.maxPage = 0;
         this.pagedData = [];
         this.pageRange = [];
      } else {
         const s = this.rowsPerPage || len; // page size
         this.maxPage = Math.ceil(len / s);
         page = Math.min(this.maxPage, Math.max(1, page));
         this.page = page;
         this.offset = (page - 1) * s;
         this.offsetMax = Math.min(this.offset + s - 1, len - 1);
         this.pageRange = [];
         const min = Math.max(1, this.page - 3);
         const max = Math.min(this.maxPage, min + 7);
         for (let r2 = min; r2 <= max; r2++) {
            this.pageRange.push(r2);
         }

         // paginate again
         this.pagedData = this.filteredData.slice(this.offset, this.offsetMax + 1);
      }
   }

   setRowsPerPage(rows : number) {
      this.rowsPerPage = rows;
      this.setPage(this.page);
   }

   setFilter(filter : string) {
      this._filter = filter;
      this.filteredData = filterArray(this.data, filter);
      this.setPage(this.page);  // compute offsets and paginate
   }

   setData(data: any[]) {
      this.data = data;
      this.setFilter(this._filter);  // filter and then paginate data
   }
}

@Component({
   selector:   'paginate',
   template:   require('./paginate.html')
})
export class Paginate {
   @Input() panelTitle = '';
   filter  : string = '';

   private filterValues : EventEmitter<string> = new EventEmitter<string>();

   constructor(
      public paginated : PaginateData)
   {
      //  Subscribe to changes for the filter, but wait until the user has
      //  finished typing.
      this.filterValues
         .debounceTime(400)
         .distinctUntilChanged()
         .subscribe((filter : string) => paginated.setFilter(filter));
   }

   onFilterChange(filter : string) {
      this.filterValues.emit(filter);
   }
}

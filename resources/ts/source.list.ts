import {Component} from '@angular/core';
import {CORE_DIRECTIVES} from '@angular/common';
import {SourceService} from './source.service';
import {PaginateData, Paginate} from './paginate';
import {Settings} from './settings.service';
import {SourceLink} from './links';

@Component({
   template: require('./source.list.html'),
   providers: [PaginateData],
   directives: [CORE_DIRECTIVES, Paginate, SourceLink]
})
export class SourceList {

   constructor(
      public settings   : Settings,
      public paginate   : PaginateData,
      private _sources  : SourceService)
   {
   }

   ngOnInit() {
      this.settings.setTitle('Source List');
      this._sources.listAll()
         .subscribe(sources => this.paginate.setData(sources));
   }

   onRowsChange(rows : number) {
      this.paginate.setRowsPerPage(rows);
      this.settings.sourceList.rows = rows;
   }
}

import {Component} from '@angular/core';
import {SourceService} from './source.service';
import {PaginateData} from './paginate';
import {Settings} from './settings.service';

@Component({
   templateUrl: './source.list.html',
   providers: [PaginateData],
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

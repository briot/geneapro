import {Component} from '@angular/core';
import {Control, CORE_DIRECTIVES} from '@angular/common';
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

   rows : Control;

   constructor(
      public settings   : Settings,
      public paginate   : PaginateData,
      private _sources  : SourceService)
   {
      this.rows = new Control(settings.sourceList.rows);
   }

   ngOnInit() {
      this.settings.setTitle('Source List');
      this._sources.listAll()
         .subscribe(sources => this.paginate.setData(sources));
      this.rows.valueChanges
         .subscribe((rows : string) => {
            this.paginate.setRowsPerPage(+rows);
            this.settings.sourceList.rows = +rows;
         });
   }
}

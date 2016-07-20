import {Component} from '@angular/core';
import {CORE_DIRECTIVES} from '@angular/common';
import {Settings} from './settings.service';
import {PaginateData, Paginate} from './paginate';
import {PlaceService} from './place.service';
import {PlaceLink} from './links';

/**
 * This component must be encapsulated in a <paginate> directive
 */
@Component({
   template: require('./place.list.html'),
   providers: [PaginateData],   // local to this component
   directives: [CORE_DIRECTIVES, Paginate, PlaceLink]
})
export class PlaceList {

   constructor(
      public settings   : Settings,
      public paginate   : PaginateData,
      private _places   : PlaceService)
   {
   }

   ngOnInit() {
      this.settings.setTitle('Place List');
      this._places.listAll().subscribe(
         places => this.paginate.setData(places));
   }

   onRowsChange(rows : number) {
      this.paginate.setRowsPerPage(rows);
      this.settings.placeList.rows = rows;
   }
}

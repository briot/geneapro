import {Component} from '@angular/core';
import {Control, CORE_DIRECTIVES} from '@angular/common';
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

   rows : Control;

   constructor(
      public settings   : Settings,
      public paginate   : PaginateData,
      private _places   : PlaceService)
   {
      this.rows = new Control(settings.placeList.rows);
   }

   ngOnInit() {
      this.settings.setTitle('Place List');
      this._places.listAll()
          .subscribe(places => this.paginate.setData(places));
      this.rows.valueChanges
         .subscribe((rows : string) => {
            this.paginate.setRowsPerPage(+rows);
            this.settings.placeList.rows = +rows;
         });
   }
}

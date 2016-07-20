import {Component} from '@angular/core';
import {CORE_DIRECTIVES} from '@angular/common';
import {Settings} from './settings.service';
import {ColorScheme} from './basetypes';
import {PaginateData, Paginate} from './paginate';
import {PersonaService} from './persona.service';
import {PersonaLink} from './links';
import {Legend} from './legend';

/**
 * This component must be encapsulated in a <paginate> directive
 */
@Component({
   template: require('./persona.list.html'),
   providers: [PaginateData],   // local to this component
   directives: [CORE_DIRECTIVES, Paginate, PersonaLink, Legend]
})
export class PersonaList {


   constructor(
      public settings   : Settings,
      public paginate   : PaginateData,
      private _personas : PersonaService)
   {
   }

   ngOnInit() {
      this.settings.setTitle('Person List');
      this._personas.listAll().subscribe(
         personas => this.paginate.setData(personas));
   }

   onRowsChange(rows : number) {
      this.settings.personaList.rows = rows;
      this.paginate.setRowsPerPage(rows);
   }

   onColorSchemeChange(scheme : number) {
      this.settings.personaList.colorScheme = scheme;
   }
}

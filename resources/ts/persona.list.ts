import {Component} from '@angular/core';
import {Control, CORE_DIRECTIVES, FORM_DIRECTIVES} from '@angular/common';
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

   rows : Control;
   colorScheme : Control;

   constructor(
      public settings   : Settings,
      public paginate   : PaginateData,
      private _personas : PersonaService)
   {
      this.rows = new Control(settings.personaList.rows);
      this.colorScheme = new Control(settings.personaList.colorScheme);
   }

   ngOnInit() {
      this.settings.setTitle('Person List');
      this._personas.listAll()
          .subscribe(personas => this.paginate.setData(personas));
      this.rows.valueChanges
         .subscribe((rows : string) => {
            this.paginate.setRowsPerPage(+rows);
            this.settings.personaList.rows = +rows;
         });
      this.colorScheme.valueChanges
         .subscribe((scheme : string) =>
            this.settings.personaList.colorScheme = +scheme);
   }
}

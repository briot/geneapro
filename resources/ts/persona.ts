import {Component} from '@angular/core';
import {CORE_DIRECTIVES} from '@angular/common';
import {FORM_DIRECTIVES} from '@angular/forms';
import {RouteParams} from '@angular/router-deprecated';
import {PersonaService, PersonaData} from './persona.service';
import {Surety} from './surety';
import {Settings} from './settings.service';
import {EventService, EventData} from './event.service';
import {SourceLink, PersonaLink} from './links';
import {IAssertion} from './basetypes';
import {SortOn, SortBy} from './sort';

@Component({
   template:   require('./persona.html'),
   directives: [CORE_DIRECTIVES, Surety, SourceLink, PersonaLink, SortOn, SortBy]
})
export class Persona {
   id   : number;
   data : PersonaData;

   constructor(
      routeParams       : RouteParams,
      public settings   : Settings,
      private _events   : EventService,
      private _personas : PersonaService)
   {
      this.id = +routeParams.get('id');
   }

   ngOnInit() {
      this.settings.setTitle('Person ' + this.id);
      this._personas.get(this.id)
         .subscribe((resp : PersonaData) => {
            this.data = resp;
            this.settings.setTitle('Person ' + resp.person.givn + ' ' + resp.person.surn);
         });
   }

   toggleEventDetails(e : IAssertion) {
      e.$open = !e.$open;
      if (e.$open && !e.$details) {
         this._events.get(e.event.id)
            .subscribe((resp : EventData) => e.$details = resp);
      }
   };

   /** Support for the sorter */
   getCharName(p : any) {return p.char.name }
   getCharDate(p : any) {return p.char.date_sort }
   getCharPlaceName(p : any) {return p.char.place && p.char.place.name }
   getEventTypeName(e : any) {return e.event.type.name}
   getEventName(e : any) {return e.event.name}
   getEventDate(e : any) {return e.event.date_sort}
   getEventPlaceName(e : any) {return e.event.place && e.event.place.name}
   getGroupName(g : any) {return g.group.name}
   getGroupDate(g : any) {return g.group.date_sort}
   getGroupPlaceName(g : any) {return g.group.place && g.group.place.name}
}

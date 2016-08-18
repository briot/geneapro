import {Component} from '@angular/core';
import {CORE_DIRECTIVES} from '@angular/common';
import {FORM_DIRECTIVES} from '@angular/forms';
import {RouteParams} from '@angular/router-deprecated';
import {PersonaService, PersonaData} from './persona.service';
import {Surety} from './surety';
import {Settings} from './settings.service';
import {EventService, EventData} from './event.service';
import {SourceLink, PersonaLink} from './links';
import {Assertion, P2G, P2E, P2C, AssertSubjectEvent, AssertSubjectGroup, AssertSubjectChar} from './asserts.service';
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

      // Change menubar so that links relate to this person
      settings.decujus = this.id;
   }

   ngOnInit() {
      this.settings.setTitle('Person ' + this.id);
      this._personas.get(this.id)
         .subscribe((resp : PersonaData) => {
            this.data = resp;
            this.settings.setTitle('Person ' + resp.person.givn + ' ' + resp.person.surn);
         });
   }

   toggleEventDetails(e : P2E) {
      e.$open = !e.$open;
      if (e.$open && !e.$details) {
         this._events.get(e.p2.event.id)
            .subscribe((resp : EventData) => e.$details = resp);
      }
   };

   /** Support for the sorter */
   getCharName(p : P2C) {return p.p2.char.name }
   getCharDate(p : P2C) {return p.p2.char.date_sort }
   getCharPlaceName(p : P2C) { return p.p2.char.place && p.p2.char.place.name }

   getEventTypeName(e : P2E) {return e.p2.event.type.name}
   getEventName(e : P2E) {return e.p2.event.name}
   getEventDate(e : P2E) {return e.p2.event.date_sort}
   getEventPlaceName(e : P2E) { return e.p2.event.place && e.p2.event.place.name}

   getGroupName(g : P2G) {return g.p2.gr.name}
   getGroupDate(g : P2G) {return g.p2.gr.date_sort}
   getGroupPlaceName(g : P2G) {return g.p2.gr.place && g.p2.gr.place.name}
}

import {Component} from '@angular/core';
import {CORE_DIRECTIVES} from '@angular/common';
import {RouteParams} from '@angular/router-deprecated';
import {Surety} from './surety';
import {Settings} from './settings.service';
import {Linky, SourceLink, PersonaLink} from './links';
import {SourceService, SourceData} from './source.service';
import {Citation} from './source.citation';

@Component({
   template: require('./source.html'),
   directives: [CORE_DIRECTIVES, Surety, SourceLink, PersonaLink, Citation],
   pipes: [Linky]
})
export class Source {
   id : number;
   data : SourceData;
   initial_full_citation : string;
   showCitation : boolean;

   constructor(
      routeParams      : RouteParams,
      public settings  : Settings,
      private _sources : SourceService)
   {
      this.id = +routeParams.get('id');
   }

   ngOnInit() {
      this._sources.get(this.id)
         .subscribe((resp : SourceData) => {
            this.data = resp;
            this.settings.setTitle('Source ' + this.data.source.title);
         });
   }

   toggleCitation() {
      this.showCitation = ! this.showCitation;
   }
}

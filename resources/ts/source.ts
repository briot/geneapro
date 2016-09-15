import {Component} from '@angular/core';
import {ActivatedRoute, Params} from '@angular/router';
import {Settings} from './settings.service';
import {SourceService, SourceData} from './source.service';

@Component({
   template: require('./source.html'),
})
export class Source {
   id : number;
   data : SourceData;
   initial_full_citation : string;
   showCitation : boolean;

   constructor(
      private route    : ActivatedRoute,
      public settings  : Settings,
      private _sources : SourceService)
   {
   }

   ngOnInit() {
      this.route.params.forEach((p : Params) => {
         this.id = +p['id'];
         this._sources.get(this.id)
            .subscribe((resp : SourceData) => {
               this.data = resp;
               this.settings.setTitle('Source ' + this.data.source.title);
            });
      });
   }

   toggleCitation() {
      this.showCitation = ! this.showCitation;
   }

   onMediaChange(data : SourceData) {
      this.data = data;
   }
}

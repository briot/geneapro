import {Component, Input} from '@angular/core';
import {CORE_DIRECTIVES} from '@angular/common';
import {FORM_DIRECTIVES} from '@angular/forms';
import {Surety} from './surety';
import {Settings} from './settings.service';
import {SourceData, SourceService, ModelData, CitationModel, ISourcePart,
        CitationTemplate, ICitation} from './source.service';
import {FloatLabelInput} from './floatlabels';
import {Observable} from 'rxjs';
import {GroupByPipe} from './groupby';

@Component({
   selector: 'citation',
   template: require('./source.citation.html'),
   directives: [CORE_DIRECTIVES, Surety, FloatLabelInput, FORM_DIRECTIVES],
   pipes: [GroupByPipe]
})
export class Citation {
   @Input() data : SourceData;
   citation : CitationTemplate;

   // All possible source types
   source_types : CitationModel[];

   // Initial citation, to be able to revert to it
   private saved_citation : ICitation;
   private saved_parts : ISourcePart[];

   // Extra parts stored in the database, but not used for the current
   // template. These could come from a GEDCOM import
   extra_parts : ISourcePart[] = [];

   // The values that have been set by the user for the fields.
   // This might store information that are not used by the current
   // medium, but were entered for another medium, in case the user
   // goes back to that medium
   cache : {[key:string]:string} = {};

   constructor(
      public settings  : Settings,
      private sources  : SourceService)
   {
   }

   ngOnInit() {
      this.saved_citation = {
         full:   this.data.source.title,
         abbrev: this.data.source.abbrev,
         biblio: this.data.source.biblio
      };

      this.sources.get_all_models().subscribe((d : ModelData) => {
         this.source_types = d.source_types});

      this.sources.get_citation_parts(this.data.source).subscribe(
         (d : ISourcePart[]) => {
            this.saved_parts = d;
            d.forEach(p => this.cache[p.name] = p.value);
            this.computeExtraParts();
         });
   }

   onMediumChange(medium : string) {
      this.data.source.medium = medium;
      if (!medium) {
         this.citation = undefined;
         this.computeCitation();
      } else {
         this.sources.get_model_template(medium).subscribe(
            (d : CitationTemplate) => {
               this.citation = d;
               this.computeExtraParts();
               this.computeCitation();
            });
      }
   }

   // From the information stored in the database, find those parts that
   // are not in the template, and therefore might come from GEDCOM
   computeExtraParts() {
      this.extra_parts = [];
      if (this.citation) {
         this.saved_parts.forEach(p => {
            if (!(p.name in this.citation.fields)) {
               this.extra_parts.push(p);
            }
         });
      } else {
         this.extra_parts = this.saved_parts;
      }
   }

   computeCitation(fieldname : string = undefined, value : string = undefined) {
      if (fieldname) {
         this.cache[fieldname] = value;
      }
      const c = (this.citation && this.citation.cite(this.cache)) || this.saved_citation;
      if (c) {
         this.data.source.title = c.full;
         this.data.source.abbrev = c.abbrev;
         this.data.source.biblio = c.biblio;
      }
   }

   save(fields : Object) {
      console.log("MANU saving ", fields);
   }
}

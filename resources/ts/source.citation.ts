import {Component, Input} from '@angular/core';
import {Router} from '@angular/router';
import {SourceData, SourceService, ModelData, CitationModel, ISourcePart} from './source.service';
import {CitationTemplate, ICitation} from './citation.service';

@Component({
   selector: 'citation',
   templateUrl: './source.citation.html'
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
      private router: Router,
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

      this.sources.get_citation_parts(this.data.source.id).subscribe(
         d => this._parse_parts(d));
   }

   private _parse_parts(d : ISourcePart[]) {
      this.saved_parts = d;
      d.forEach(p => this.cache[p.name] = p.value);

      // Load the details of the citation template
      this.onMediumChange(this.data.source.medium);
   }

   onMediumChange(medium : string) {
      this.data.source.medium = medium;
      if (!medium) {
         this.citation = undefined;
         this.computeCitation();
         this.computeExtraParts();
      } else {
         this.sources.get_model_template(medium).subscribe(
            (d : CitationTemplate) => {
               this.citation = d;
               this.computeCitation();

               // Compute what parts are not in the template
               this.computeExtraParts();
            });
      }
   }

   // From the information stored in the database, find those parts that
   // are not in the template, and therefore might come from GEDCOM
   computeExtraParts() {
      this.extra_parts = [];
      if (this.citation) {
         this.saved_parts.forEach(p => {
            if (this.citation.fields.indexOf(p.name) == -1) {
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
      this.sources.save_citation(this.data.source, fields).subscribe(
         (d : ISourcePart[]) => {
            this._parse_parts(d);
            this.router.navigate(['Source', {id: this.data.source.id}]);

            // Unfortunately, there is no way to reset the 'pristine' set of
            // the form yet.
         });
   }
}

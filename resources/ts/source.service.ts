import {Injectable} from '@angular/core';
import {Http, Headers, RequestOptions} from '@angular/http';
import {ISource, IAssertion, IRepr} from './basetypes';
import {Observable} from 'rxjs';
import {json_post} from './http_utils';

export interface SourceData {
   source          : ISource,
   higher_sources ?: ISource[],
   asserts        ?: IAssertion[],
   repr           ?: IRepr[]
}

export interface CitationModel {
   id       : string,
   type     : string,
   category : string
}

export interface RepositoryData {
   id          : number,
   description : string,
   name        : string
}

export interface ModelData {
   source_types     : CitationModel[],
   repository_types : RepositoryData[]
}

// One element of a citation
export interface ISourcePart {
   name       : string;
   value      : string;
   fromHigher ?: boolean;
}

export interface ICitation {
   full    : string, // template for the full citation
   biblio  : string, // template for the bibliography
   abbrev  : string  // abbreviated version of the full template
}

// Server response for a citation template
export interface TemplateData {
   full    : string, // template for the full citation
   biblio  : string, // template for the bibliography
   abbrev  : string  // abbreviated version of the full template
}

export class CitationTemplate {
   public fields : string[] = [];  // list of customizable fields in template

   constructor(public template : TemplateData) {
      // use an explicit order for citations, to get better control on the
      // order of fields in the UI.
      let found : {[key : string]: boolean} = {};
      const re_part = /\{([^}]+)\}/g;
      const addFields = (template : string) => {
         let m : string[];
         while ((m = re_part.exec(template)) != null) {
            if (!found[m[1]]) {
               found[m[1]] = true;
               this.fields.push(m[1]);
            }
         }
      }
      addFields(this.template.full);
      addFields(this.template.biblio);
      addFields(this.template.abbrev);
   }

   /**
     * Resolve the template given some values for the fields.
     * @param vals    The values for the fields.
     */
    cite(vals : { [name : string] : string}) : ICitation {
       // Remove special chars like commas, quotes,... when they do not
       // separate words, in case some parts has not been set.
       function cleanup(str : string) {
          let s = ''
          while (s != str) {
             s = str;
             str = str.replace(/^ *[,:;.] */g, ''). // leading characters
                       replace(/"[,.]?"/g, '').
                       replace(/\( *[,.:;]? *\)/g, '').
                       replace("<I></I>", '').
                       replace(/[,:;] *$/, '').
                       replace(/([,:;.]) *[,:;.]/g, "$1");
          }
          return str;
       }

       let full = this.template.full;
       let biblio = this.template.biblio;
       let abbrev = this.template.abbrev;

       this.fields.forEach(name => {
          // Use a function for the replacement, to protect "$" characters
          function repl() { return vals[name] || ''}
          full   = full.replace('{' + name + '}', repl);
          biblio = biblio.replace('{' + name + '}', repl);
          abbrev = abbrev.replace('{' + name + '}', repl);
       });
       return {full:   cleanup(full),
               biblio: cleanup(biblio),
               abbrev: cleanup(abbrev)};
    }
}

@Injectable()
export class SourceService {
   constructor(private http : Http) {}

   /**
    * Retrieve the list of all sources in the database
    */
   listAll() {
      return this.http.get('/data/sources/list').map(res => res.json());
   }

   /**
    * Retrieve info on a specific source
    */
   get(id : number) : Observable<SourceData> {
      return this.http.get('/data/sources/' + (id || -1)).map(res => res.json());
   }

   /**
    * Retrieve the list of all source templates
    */
   get_all_models() : Observable<ModelData> {
      return this.http.get('/data/citationModels').map(res => res.json());
   }

   /**
    * Retrieve a template for a specific model
    */
   get_model_template(id : string) : Observable<CitationTemplate> {
      return this.http.get('/data/citationModel/' + id).map(
         res => new CitationTemplate(res.json()));
   }

   /**
    * Retrieve all citation parts for a specific source
    */
   get_citation_parts(source_id : number) : Observable<ISourcePart[]> {
      return this.http.get('/data/sources/' + (source_id || -1) + '/parts').map(
         res => res.json().parts);
   }

   /**
    * Save the source citation
    */
   save_citation(source : ISource, fields : Object) : Observable<ISourcePart[]> {
      return json_post(
         this.http,
         '/data/sources/' + (source.id || -1) + '/saveparts',
         fields).map(res => res.json().parts);
   }
}

import {Injectable} from '@angular/core';
import {Http, Headers, RequestOptions} from '@angular/http';
import {ISource, IRepr} from './basetypes';
import {Observable} from 'rxjs';
import {json_post, formdata_post} from './http_utils';
import {CitationTemplate} from './citation.service';
import {AssertionList, IAssertionFromServer} from './asserts.service';

export interface SourceData {
   source          : ISource,
   higher_sources ?: ISource[],
   asserts        ?: AssertionList,
   repr           ?: IRepr[]
}
export interface SourceDataFromServer {
   source          : ISource,
   higher_sources ?: ISource[],
   asserts        ?: IAssertionFromServer[],
   repr           ?: IRepr[],
   error          ?: string
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
      return this.http.get('/data/sources/' + (id || -1)).map(
         res => {
            let j : SourceDataFromServer = res.json();
            return {
               source         : j.source,
               higher_sources : j.higher_sources,
               asserts        : AssertionList.buildFromServer(j.asserts),
               repr           : j.repr};
         });
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

   /**
    * Delete a representation of source
    */
   delete_repr(source : ISource, repr : IRepr, ondisk : boolean) : Observable<SourceData> {
      return json_post(
         this.http,
         '/data/sources/' + source.id + '/delRepr/' + repr.id,
         {'ondisk': ondisk}).map(res => res.json());
   }
}

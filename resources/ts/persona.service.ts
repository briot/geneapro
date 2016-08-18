import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import {IPerson, ISource} from './basetypes';
import {Observable} from 'rxjs';
import {AssertionList, IAssertionFromServer} from './asserts.service';

export interface PersonaDataFromServer {
   person  : IPerson,
   sources : { [id: number]: ISource},
   p2p     : IAssertionFromServer[] // person-to-person ("same as" relationship)
}
export interface PersonaData {
   person  : IPerson,
   sources : { [id: number]: ISource},
   p2p     : AssertionList   // person-to-person ("same as" relationship)
}

@Injectable()
export class PersonaService {

   constructor(private http : Http) { }

   /**
    * Retrieve the list of all personas in the database
    */
   listAll() {
      return this.http.get('/data/persona/list')
         .map(res => res.json().persons);
   }

   /**
    * Retrieve info on a specific person
    */
   get(id : number) : Observable<PersonaData> {
      return this.http.get('/data/persona/' + id)
         .map(res => {
            const j : PersonaDataFromServer = res.json();
            return {
               person  : j.person,
               sources : j.sources,
               p2p     : AssertionList.buildFromServer(j.p2p)}
         });
   }

   /**
    * Retrieve details on a specific person, to display in the graphic views.
    * The details are a multi-line string.
    */
   getDetails(id : number) : Observable<string[]> {
      return this.http.get('/personaEvents/' + id)
         .map(resp => resp.json());
   }

}

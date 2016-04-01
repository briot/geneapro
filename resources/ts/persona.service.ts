import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import {IPerson, IAssertion, ISource} from './basetypes';
import {Observable} from 'rxjs';

export interface PersonaData {
   person  : IPerson,
   sources : { [id: number]: ISource},
   p2p     : IAssertion[]   // person-to-person ("same as relationship)
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
         .map(res => res.json());
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

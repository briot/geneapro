import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import {IPerson, IAssertion, ISource} from './basetypes';
import {Observable} from 'rxjs';

// All assertions related to a specific event
export interface EventData {
   // ??? Should use an IAssertion array
   p2e  : {
      person: {id : number, name : string},
      role_name : string,
      rationale : string,
      disproved : boolean,
      surety    : number,
      source    : {id : number}
   }
}


@Injectable()
export class EventService {

   constructor(private http : Http) { }

   /**
    * Retrieve info on a specific event
    */
   get(id : number) : Observable<EventData> {
      return this.http.get('/data/event/' + id)
         .map(res => res.json());
   }
}

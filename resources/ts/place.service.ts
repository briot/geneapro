import {Injectable} from '@angular/core';
import {Http} from '@angular/http';

@Injectable()
export class PlaceService {
   constructor(private http : Http) { }

   /**
    * Retrieve the list of all places in the database
    */
   listAll() {
      return this.http.get('/data/places').map(res => res.json());
   }
}

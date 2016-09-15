/**
 * A service that downloads information about the surety schemes created
 * by the user, and provide that information asynchronously.
 */

import {Component, Input, Injectable} from '@angular/core';
import {Http} from '@angular/http';
import {Observable} from 'rxjs';

interface SuretySchemePart {
   id          : number,
   name        : string,
   description : string,
   sequence    : number /* sequence number */
   scheme      ?: number;  /* SuretyScheme id */
}
interface SuretyScheme {
   id          : number,
   name        : string,
   description : string,
   parts       : SuretySchemePart[]
}

/**
 * A list of all the known surety schemes
 */
export class SuretyList {
   private _parts : SuretySchemePart[] = [];  // indexed by id

   constructor(private schemes : SuretyScheme[])
   {
      schemes.forEach((s, idx) => {
         s.parts.forEach(p => {
            this._parts[p.id] = p;
            p.scheme = idx;
         });
      });
   }

   partFromId(id : number) {
      return this._parts[id];
   }
   schemeFromPart(partid : number) {
      const p = this._parts[partid];
      return p && this.schemes[p.scheme];
   }
}

/**
 * A service that retrieves and caches the known surety schemes
 */
@Injectable()
export class SuretyService {
   allSchemes  : Observable<SuretyList>;

   constructor(http : Http) {
      // This won't perform a request until someone subscribes to it.
      // share() ensures that all subscribers will receive the same info,
      // downloaded only once.
      this.allSchemes = http.get('/data/suretySchemes')
         .map(resp => new SuretyList(resp.json().schemes))
         .share();
   }
}

/**
 * A Component to display a specific surety scheme
 */
@Component({
   selector:   'surety',
   template:   require('./surety.html'),
})
export class Surety {
   @Input() part   : number;   // the id of a specific part
   selected : number;
   scheme   : SuretyScheme;

   constructor(private _schemes : SuretyService) {}

   ngOnInit() {
      this._schemes.allSchemes.subscribe((s : SuretyList) => {
         this.scheme = s.schemeFromPart(this.part);
         if (this.scheme) {
            const part = s.partFromId(this.part);
            this.selected = part.sequence;
         }
      });
   }
}

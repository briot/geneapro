import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import {Observable} from 'rxjs';

export interface StatsData {
   ranges: [/* index */ number,
               /* min year */ number,
               /* max year */ number,
               /* legend */ string][],
   ages:   [/* start point */ number,
            /* males */ number,
            /* females */ number,
            /* unknown */ number][],
   total_ancestors : number,
   total_father    : number,
   total_mother    : number,
   decujus         : number,
   decujus_name    : string
}

@Injectable()
export class StatsService {
   private id : number;   // decujus
   private stream : Observable<StatsData>;

   constructor(private http : Http) {
      // ??? Cant we use Jsonp from @angular/http instead of Http
   }

   setDecujus(id : number) {
      if (id != this.id) {
         this.id = id;
         this.stream = this.http.get('/data/stats/' + id).map(res => res.json()).share();
      }
   }

   get() : Observable<StatsData> {
      return this.stream;
   }
}

import {Component, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {CORE_DIRECTIVES} from '@angular/common';
import {Http, HTTP_PROVIDERS} from '@angular/http';

type RuleList = {name : string; css : string}[];
interface RulesRes {
   rules : RuleList;
}

@Injectable()
export class LegendService {
   constructor(private _http : Http) {}

   get() {
      return this._http.get('/data/legend').map(res => res.json().rules);
   }
}

@Component({
   selector: 'gp-legend',
   template: require('./legend.html'),
   directives: [CORE_DIRECTIVES]
})
export class Legend {
   show  : boolean = false;
   rules : Observable<RuleList>;

   constructor(private _legend : LegendService) { }

   toggle() {
      this.show = !this.show;
      if (this.show && !this.rules) {
         this.rules = this._legend.get();
      }
   }
}

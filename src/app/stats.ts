import {Component} from '@angular/core';
import * as d3 from 'd3';
import {StatsData, StatsService} from './stats.service';
import {ActivatedRoute, Params} from '@angular/router';
import {Settings} from './settings.service';

@Component({
   templateUrl: './stats.html'
})
export class StatsPage {

   id : number;
   data : StatsData;

   constructor(private route    : ActivatedRoute,
               private settings : Settings,
               private stats    : StatsService)
   {
   }

   ngOnInit() {
      this.route.params.forEach((p : Params) => {
         this.id = +p['id'];
         this.settings.decujus = this.id;
         this.stats.setDecujus(this.id);
      });
      this.stats.get().subscribe(data => this.data = data);
   }
}

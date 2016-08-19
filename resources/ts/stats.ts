import {Component} from '@angular/core';
import * as d3 from 'd3';
import {StatsData, StatsService} from './stats.service';
import {StatsGenerations} from './stats.generations';
import {StatsLifespan} from './stats.lifespan';
import {RouteParams} from '@angular/router-deprecated';
import {PersonaLink} from './links';
import {Settings} from './settings.service';

@Component({
   template: require('./stats.html'),
   directives: [StatsGenerations, StatsLifespan, PersonaLink],
   providers: [StatsService]
})
export class StatsPage {

   id : number;
   data : StatsData;

   constructor(routeParams  : RouteParams,
               settings     : Settings,
               stats        : StatsService) {
      this.id = +routeParams.get('id');
      settings.decujus = this.id;
      stats.setDecujus(this.id);
      stats.get().subscribe(data => this.data = data);

   }
}

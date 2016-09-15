import {NgModule} from '@angular/core';
import {StatsPage} from './stats';
import {StatsGenerations} from './stats.generations';
import {StatsLifespan} from './stats.lifespan';
import {StatsService} from './stats.service';
import {SharedModule} from './shared.module';

@NgModule({
   providers: [StatsService],
   imports: [SharedModule],
   declarations: [StatsGenerations, StatsLifespan, StatsPage],
   exports: [StatsPage]
})
export class StatsModule {}

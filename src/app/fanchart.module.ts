import {NgModule} from '@angular/core';
import {Fanchart, FanchartPage, FanchartLayoutService} from './fanchart';
import {SharedModule} from './shared.module';

@NgModule({
   declarations: [Fanchart, FanchartPage],
   imports: [SharedModule],
   providers: [FanchartLayoutService],
})
export class FanchartModule {};

import {NgModule} from '@angular/core';
import {Radial, RadialPage} from './radial';
import {SharedModule} from './shared.module';

@NgModule({
   imports: [SharedModule],
   declarations: [Radial, RadialPage],
})
export class RadialModule {};

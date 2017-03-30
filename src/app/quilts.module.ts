import {NgModule} from '@angular/core';
import {Quilts, QuiltsPage} from './quilts';
import {SharedModule} from './shared.module';

@NgModule({
   imports: [SharedModule],
   declarations: [Quilts, QuiltsPage],
})
export class QuiltsModule {};

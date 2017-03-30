import {NgModule} from '@angular/core';
import {PedigreeLayoutService, Pedigree, PedigreePage} from './pedigree';
import {SharedModule} from './shared.module';

@NgModule({
   imports: [SharedModule],
   declarations: [Pedigree, PedigreePage],
   exports: [PedigreePage],
   providers: [PedigreeLayoutService],
})
export class PedigreeModule {};

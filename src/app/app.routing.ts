import {ModuleWithProviders} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';

import {Dashboard} from './dashboard';
import {Import} from './import';
import {PersonaList} from './persona.list';
import {Persona} from './persona';
import {PlaceList} from './place.list';
import {Place} from './place';
import {SourceList} from './source.list';
import {Source} from './source';
import {PedigreePage} from './pedigree';
import {RadialPage} from './radial';
import {StatsPage} from './stats';
import {FanchartPage} from './fanchart';
import {QuiltsPage} from './quilts';

const appRoutes : Routes = [
   {path: 'dashboard',    component: Dashboard},
   {path: '',              component: Dashboard},
   {path: 'import',       component: Import},
   {path: 'persona/list', component: PersonaList},
   {path: 'persona/:id',  component: Persona},
   {path: 'place/list',   component: PlaceList},
   {path: 'place/:id',    component: Place},
   {path: 'source/list',  component: SourceList},
   {path: 'source/:id',   component: Source},
   {path: 'pedigree/:id', component: PedigreePage},
   {path: 'radial/:id',   component: RadialPage},
   {path: 'stats/:id',    component: StatsPage},
   {path: 'fanchart/:id', component: FanchartPage},
   {path: 'quilts/:id',   component: QuiltsPage}
];

export const appRoutingComponents = [
   Dashboard, Import, PersonaList, Persona, PlaceList, Place,
   SourceList,
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);

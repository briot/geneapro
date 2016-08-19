// Declares require()
/// <reference path="../../node_modules/awesome-typescript-loader/lib/runtime.d.ts" />

import '../sass/geneaprove.scss';

import {Title} from '@angular/platform-browser';
import {bootstrap} from '@angular/platform-browser-dynamic';
import {Component, provide} from '@angular/core';
import {RouteConfig, ROUTER_DIRECTIVES, ROUTER_PROVIDERS} from '@angular/router-deprecated';
import {disableDeprecatedForms, provideForms} from '@angular/forms';
import {APP_BASE_HREF} from '@angular/common';
import {HTTP_PROVIDERS} from '@angular/http';
import {Menubar} from './menubar';
import {Dashboard} from './dashboard';
import {Import} from './import';
import {Settings} from './settings.service';
import {LocalStorage} from './localstorage.service';
import {GPd3Service} from './d3.service';

import {PersonaList} from './persona.list';
import {Persona} from './persona';
import {PersonaService} from './persona.service';

import {PlaceList} from './place.list';
import {Place} from './place';
import {PlaceService} from './place.service';

import {SourceList} from './source.list';
import {Source} from './source';
import {SourceService} from './source.service';

import {LegendService} from './legend';
import {SuretyService} from './surety';
import {EventService} from './event.service';

import {PedigreePage} from './pedigree';
import {PedigreeService} from './pedigree.service';

import {RadialPage} from './radial';

import {StatsPage} from './stats';

import {ContextMenuService} from './contextmenu';

import 'rxjs/add/observable/of';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/groupBy';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/debounceTime';

@Component({
   selector:   'geneaprove-app',
   template:   require('./main.html'),
   providers:  [ROUTER_PROVIDERS,

                // Can't use <base> in the document, it breaks svg
                provide(APP_BASE_HREF, {useValue: '/'}),

                Title, Settings, PersonaService, LegendService,
                PlaceService, SourceService, SuretyService, EventService,
                ContextMenuService,
                PedigreeService, LocalStorage, GPd3Service, HTTP_PROVIDERS],
   directives: [ROUTER_DIRECTIVES, Menubar]
})
@RouteConfig([
   {path: '/dashboard',    name: 'Dashboard',   component: Dashboard, useAsDefault: true},
   {path: '/import',       name: 'Import',      component: Import},
   {path: '/persona/list', name: 'PersonaList', component: PersonaList},
   {path: '/persona/:id',  name: 'Persona',     component: Persona},
   {path: '/place/list',   name: 'PlaceList',   component: PlaceList},
   {path: '/place/:id',    name: 'Place',       component: Place},
   {path: '/source/list',  name: 'SourceList',  component: SourceList},
   {path: '/source/:id',   name: 'Source',      component: Source},
   {path: '/pedigree/:id', name: 'Pedigree',    component: PedigreePage},
   {path: '/radial/:id',   name: 'Radial',      component: RadialPage},
   {path: '/stats/:id',    name: 'Stats',       component: StatsPage}
])
export class MainComponent {
}

bootstrap(MainComponent, [
   // Support for the new forms module
   disableDeprecatedForms(),
   provideForms(),
])

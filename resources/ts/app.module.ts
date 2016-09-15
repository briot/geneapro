// Declares require()
/// <reference path="../../node_modules/awesome-typescript-loader/lib/runtime.d.ts" />

import '../sass/geneaprove.scss';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/groupBy';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/debounceTime';

import {NgModule} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {APP_BASE_HREF} from '@angular/common';
import {AppComponent} from './app.component';
import {routing, appRoutingComponents}  from './app.routing';

import {Settings} from './settings.service';
import {LocalStorage} from './localstorage.service';
import {GPd3Service} from './d3.service';
import {PersonaService} from './persona.service';
import {PlaceService} from './place.service';
import {SourceService} from './source.service';
import {LegendService} from './legend';
import {SuretyService} from './surety';
import {EventService} from './event.service';
import {PedigreeService} from './pedigree.service';
import {QuiltsService} from './quilts.service';
import {ContextMenuService} from './contextmenu';

import {FloatLabelModule} from './floatlabels';
import {SharedModule} from './shared.module';
import {MenubarModule} from './menubar.module';
import {FanchartModule} from './fanchart.module';
import {RadialModule} from './radial.module';
import {PedigreeModule} from './pedigree.module';
import {QuiltsModule} from './quilts.module';
import {UploadModule} from './upload.module';
import {SourceModule} from './source.module';
import {StatsModule} from './stats.module';

@NgModule({
   imports:      [routing, FanchartModule, FloatLabelModule,
                  UploadModule, SourceModule, MenubarModule, PedigreeModule,
                  StatsModule, RadialModule, QuiltsModule, SharedModule],
   declarations: [AppComponent, appRoutingComponents],
   bootstrap: [AppComponent],
   providers: [Title,

               // Can't use <base> in the document, it breaks svg
               {provide: APP_BASE_HREF, useValue: '/'},

               Title, Settings, PersonaService, LegendService,
               PlaceService, SourceService, SuretyService, EventService,
               ContextMenuService, QuiltsService,
               PedigreeService, LocalStorage, GPd3Service
   ],
})
export class AppModule {}

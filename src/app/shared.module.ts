//  All the common directives and components shared by all modules
//  in this application

import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {RouterModule} from '@angular/router';
import {FormsModule}  from '@angular/forms';
import {HttpModule} from '@angular/http';
import {PersonaLink, PlaceLink, SourceLink, TimeLink} from './links';
import {GroupByPipe} from './groupby';
import {Linky} from './linky.pipe';
import {AssertSubjectDirective} from './asserts.subject';
import {Legend} from './legend';
import {Slider} from './slider';
import {ContextMenu} from './contextmenu';
import {Surety} from './surety';
import {ModalModule} from './modal.module';
import {SortOn, SortBy} from './sort';
import {Paginate} from './paginate';

@NgModule({
   declarations:      [
      PersonaLink, PlaceLink, SourceLink, TimeLink,
      GroupByPipe,
      AssertSubjectDirective,
      ContextMenu,
      Slider,
      Legend,
      Surety,
      Linky,
      Paginate,
      SortOn, SortBy],
   imports: [BrowserModule, FormsModule, RouterModule, ModalModule, HttpModule],
   exports: [BrowserModule, FormsModule, RouterModule, ModalModule, HttpModule,
      PersonaLink, PlaceLink, SourceLink, TimeLink,
      GroupByPipe,
      AssertSubjectDirective,
      ContextMenu,
      Slider,
      Legend,
      Surety,
      Linky,
      Paginate,
      SortOn, SortBy]
})
export class SharedModule {}

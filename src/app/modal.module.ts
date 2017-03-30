import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {Modal, ModalService} from './modal';

@NgModule({
   imports: [BrowserModule],
   declarations: [Modal],
   exports: [Modal],
   providers: [ModalService],
})
export class ModalModule {}

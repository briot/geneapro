
import {NgModule, Component, Injectable, Directive, Input, Output, EventEmitter} from '@angular/core';
import {ElementRef} from '@angular/core';
import {Observable} from 'rxjs';
import {formdata_post} from './http_utils';
import {Http} from '@angular/http';
import {SharedModule} from './shared.module';

@Directive({
   selector: 'form[gp-upload-form]',
   exportAs: 'UploadForm',
   host: {'class': 'upload-form',
          '[class.dragover]': 'dragover',
          '(drag)': 'onStopPropagation($event)',
          '(dragstart)': 'onStopPropagation($event)',
          '(dragover)': 'onDragEnter($event)',
          '(dragenter)': 'onDragEnter($event)',
          '(dragsend)': 'onDragLeave($event)',
          '(dragleave)': 'onDragLeave($event)',
          '(drop)': 'onDrop($event)'}

})
class UploadForm {
   @Input() mini : boolean;
   @Output() onupload : EventEmitter<any>;
   @Input() url : string;   // mandatory

   autosubmit  : boolean = true;
   dragover    : boolean = false;
   files       : File[]= [];
   isUploading : boolean = false;

   constructor(private http   : Http) {
      this.onupload = new EventEmitter<any>();
   }

   onStopPropagation(e : Event) {
      e.preventDefault();
      e.stopPropagation();
   }

   onDragEnter(e : DragEvent) {
      e.dataTransfer.dropEffect = 'copy';
      this.dragover = true;
      this.onStopPropagation(e);
   }

   onDragLeave(e : DragEvent) {
      this.dragover = false;
      this.onStopPropagation(e);
   }

   onDrop(e : DragEvent) {
      this.onDragLeave(e);
      const files = e.dataTransfer.files;
      for (let idx = 0; idx < files.length; idx++) {
         this.files.push(files[idx]);
      }
      if (this.autosubmit) {
         this.send();
      }
   }

   // Must be called when files have been modified
   send() {
      if (!this.isUploading && this.files.length != 0) {
         this.isUploading = true;

         // ??? In case of error, we should still reset isUploading
         let data = new FormData();
         this.files.forEach(f => data.append('file', f));
         formdata_post(this.http, this.url, data).map(res => res.json()).subscribe(
            (d : any) => {
               this.isUploading = false;
               this.files = [];
               this.onupload.emit(d);
         });
      }
   }
}


/**
 * UploadTarget
 * A drop target. This is only compatible with autosubmit.
 * Must be nested inside a <span gp-upload-target> element.
 */
@Component({
   selector: 'gp-upload-target',
   template: `
      <div class="maxi upload-target">
         <label>
           <span class="fa fa-download icon"></span><br>
           <input type=file multiple (change)='onFileAdded($event.target)'/>
           <span *ngIf='parent.files.length==0'>
              <span>Choose a file or </span>
              <span class="normal">drop media here</span>.
           </span>
           <div *ngFor="let f of parent.files" style="margin-right:10px">{{f.name}}</div>
         </label>
         <button *ngIf='parent.files.length>0 && !parent.isUploading' class="btn btn-primary" (click)="parent.send()">
            Upload
         </button>
         <div *ngIf="parent.isUploading" class="fa fa-spin fa-spinner"></div>
      </div>`
})
class UploadTarget {
   @Input() parent : UploadForm;

   ngOnInit() {
      this.parent.autosubmit = false;
   }

   // Files added via the "Browse" dialog (drag-and-drop is handled by the form)
   onFileAdded(input : HTMLInputElement) {
      for (let f = 0; f < input.files.length; f++) {
         this.parent.files.push(input.files[f]);
      }

      // Send immediately since we have a single <input> anyway
      this.parent.send();
   }
}

/**
 * UploadTargetMini
 * A one-line drop target.
 * Must be nested inside a <span gp-upload-target> element.
 */
@Component({
   selector: 'gp-upload-target-mini',
   template: `
      <label class='upload-target'>
         <span class="fa fa-download icon"> drop media here</span>
         <input type=file multiple (change)='onFileAdded($event.target)'/>
         <span *ngIf="!parent.isUploading" class="fa fa-plus btn btn-sm btn-primary" style="float:none"></span>
         <span *ngIf="parent.isUploading" class="fa fa-spin fa-spinner"></span>
      </label>`
})
class UploadTargetMini {
   @Input() parent : UploadForm;

   ngOnInit() {
      this.parent.autosubmit = true;
   }

   onFileAdded(input : HTMLInputElement) {
      for (let f = 0; f < input.files.length; f++) {
         this.parent.files.push(input.files[f]);
      }
      this.parent.send();
   }
}

const decl = [UploadTarget, UploadForm, UploadTargetMini];
@NgModule({
   imports: [SharedModule],
   declarations: decl,
   exports: decl,
})
export class UploadModule {}

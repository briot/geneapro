import {Component} from '@angular/core';
import {NgIf} from '@angular/common';
import {UploadForm, UploadTarget} from './upload';

interface ImportFromServer {
   success : boolean;
   error   ?: string;
}

@Component({
   template:   require('./import.html'),
   directives: [NgIf, UploadTarget, UploadForm]
})
export class Import {
   error = '';
   success : boolean;  // undefined initially

   // Receives the result of /import
   onUpload(result : ImportFromServer) {
      this.error = result.error;
      this.success = result.success;
   }

}

import {Component} from '@angular/core';

interface ImportFromServer {
   success : boolean;
   error   ?: string;
}

@Component({
   template:   require('./import.html'),
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

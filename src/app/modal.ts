import {Component, Injectable, Input, EventEmitter} from '@angular/core';

@Injectable()
export class ModalService {

   dialog : Modal;

   // Register a new modal dialog
   register(m : Modal) {
      this.dialog = m;
   }

   show() {
      if (this.dialog)  {
         return this.dialog.show();
      }
   }
}

@Component({
   selector: 'modal',

   template: `
      <div class='modal fade' role="dialog" [ngStyle]='{"display":visible?"block":"none"}'
          [ngClass]='{"in": visible}'>
         <div class="modal-dialog">
            <div class='modal-content'>
               <div class="modal-header">
                  <button type="button" class="close" data-dismiss="modal">&times;</button>
                  <h4><ng-content select='.modal-title'></ng-content></h4>
               </div>
               <div class="modal-body">
                  <ng-content select='.modal-body'></ng-content>
               </div>
               <div class="modal-footer">
                  <button *ngFor='let b of buttons; let last=last'
                          class='btn btn-xl' 
                          [class.btn-primary]='last'
                          (click)='close(b)'>
                      {{b}}
                  </button>
                  <!--
                  <button class='btn btn-xl' (click)='close("cancel")'>Cancel</button>
                  <button class='btn btn-xl btn-primary' (click)='close("ok")'>OK</button>
                  -->
               </div>
            </div>
         </div>
      </div>
   `
})
export class Modal {
   // The list of buttons to add. The last one is the primary button
   @Input() buttons : string[] = ["Cancel", "OK"];

   visible : boolean = false;
   events  : EventEmitter<string>;

   constructor(modal : ModalService) {
      modal.register(this);
      this.events = new EventEmitter<string>();
   }

   show() {
      document.body.classList.add('modal-open');
      this.visible = true;
      return this.events;
   }

   close(button : string) {
      document.body.classList.remove('modal-open');
      this.visible = false;
      this.events.emit(button);
   }
}

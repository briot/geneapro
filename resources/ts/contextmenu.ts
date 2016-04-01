import {Injectable, Component, Input, EventEmitter, ElementRef} from '@angular/core';
import {CORE_DIRECTIVES} from '@angular/common';
import * as d3 from 'd3';

/**
 * A service to display a contextual menu
 */

interface ContextualEvent {
   name  : string;    // either 'open' or 'close'
   event ?: MouseEvent;
}

export interface ContextualItem {
   name   : string;     // as displayed in the menu
   title ?: string;     // for tooltips
   func   : (data:any,item:ContextualItem)=>any    // called when menu is executed
}

@Injectable()
export class ContextMenuService {
   onChange = new EventEmitter<ContextualEvent>();
   private _data : any = undefined;

   hide() {
      this.onChange.next({name: 'close', event: null});
   }

   exec(item : ContextualItem) {
      item.func(this._data, item);
   }

   createMenu(event : MouseEvent, data : any) {
      // Do not end up displaying the contextual menu for parent elements
      event.stopPropagation(); 

      // Do not propagate right click
      event.preventDefault();

      this._data = undefined;
      if (data) {
         this._data = data;
         this.onChange.next({name: 'open', event: event});
      }
   }
}

@Component({
   selector: 'div[context-menu]',
   template: require('./contextmenu.html'),
   host: {
      '(document:click)': 'hideMenu()',
      '(document:keyup)': 'onKeyUp($event)',
      'class': 'contextMenu navbar navbar-default'
   },
   directives: [CORE_DIRECTIVES]
})
export class ContextMenu{
   @Input('context-menu') items : ContextualItem[];

   constructor(
      private element : ElementRef,
      private contextService : ContextMenuService)
   {
      contextService.onChange.subscribe((e : ContextualEvent) => {
         let st = this.element.nativeElement.style;
         if (e.event && e.name == 'open') {
            st.display = 'block';
            st.left = e.event.clientX + 'px';
            st.top = e.event.clientY + 'px';
         } else {
            st.display = 'none';
         }
      });
   }

   exec(it : ContextualItem) {
      this.contextService.exec(it);
   }

   onKeyUp(event : KeyboardEvent) {
      if (event.keyCode === 27) {
         this.hideMenu();
      }
   }

   hideMenu() {
      this.contextService.hide();
   }
}

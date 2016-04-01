/**
 * A horizontal slider
 */

import {Component, Input, Output, EventEmitter, ElementRef} from '@angular/core';

@Component({
   selector: 'slider',
   template: require('./slider.html')
})
export class Slider {
   @Input() min : string;
   @Input() max : string;
   @Output() valueChange = new EventEmitter<number>();
   @Input() value : number = 0;

   percent  : number = 0;
   dragging : boolean = false;  // whether the mouse is dragging

   constructor(private element : ElementRef) {}

   ngOnInit() {
      const min = parseFloat(this.min);
      const range = parseFloat(this.max) - min;
      this.percent = (this.value - min) / range * 100;
   }

   setvalue(event : MouseEvent) {
      const min = parseFloat(this.min);
      const range = parseFloat(this.max) - min;
      const r = this.element.nativeElement.getBoundingClientRect();
      let ratio = (event.clientX - r.left) / r.width;
      ratio = Math.max(Math.min(ratio, 1), 0);
      this.value = Math.floor(min + ratio * range);
      this.percent = ratio * 100;
      this.valueChange.next(this.value); // let the world know
   }

   mousedown(event : MouseEvent) {
      this.dragging = true;

      const onmousemove = (event : MouseEvent) => this.setvalue(event);
      const onmouseup = (event : MouseEvent) => {
         this.dragging = false;
         document.removeEventListener('mousemove', onmousemove);
         document.removeEventListener('mouseup', onmouseup);
      };

      document.addEventListener('mousemove', onmousemove);
      document.addEventListener('mouseup', onmouseup);
   }
}

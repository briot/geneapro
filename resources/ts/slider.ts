/**
 * A horizontal slider
 */

import {Component, Input, Output, EventEmitter, ElementRef} from '@angular/core';

@Component({
   selector: 'slider',
   template: require('./slider.html'),
   host: {
      '(window:resize)': 'onResize()'
   }
})
export class Slider {
   @Input() min : string;
   @Input() max : string;
   @Output() valueChange = new EventEmitter<number>();
   @Input() value : number = 0;
   @Input() disabled : boolean;
   @Input() label: string;

   percent  : number = 0;
   dragging : boolean = false;  // whether the mouse is dragging

   public sliderSize : ClientRect;

   constructor(private element : ElementRef) {
   }

   ngAfterContentInit() {
      this.onResize();
   }

   onResize() {
      this.sliderSize = this.element.nativeElement.querySelector('.horizontal').getBoundingClientRect();
   }

   ngOnChanges(changes : any) {
      const min = parseFloat(this.min);
      const range = parseFloat(this.max) - min;
      this.percent = (this.value - min) / range;
   }

   setvalue(event : MouseEvent) {
      const min = parseFloat(this.min);
      const range = parseFloat(this.max) - min;
      let ratio = (event.clientX - this.sliderSize.left) / this.sliderSize.width;
      ratio = Math.max(Math.min(ratio, 1), 0);
      this.value = Math.floor(min + ratio * range);
      this.percent = ratio;
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

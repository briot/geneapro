/**
 * An image that can be manipulated scroll, zoom, ...)
 */

import {NgModule, Component, Directive, Injectable, Input,
        Renderer, ElementRef} from '@angular/core';
import {IRepr} from './basetypes';
import {SharedModule} from './shared.module';

@Injectable()
export class ZoomImage {
   scale  : number = 1;
   left   : number = 0;
   top    : number = 0;
   img    : HTMLImageElement;
   canvas : HTMLCanvasElement;
   cache  : { [url : string]: HTMLImageElement } = {};

   /**
    * Set the image
    * @param {string}  url    The url to load.
    */
   setUrl(url : string) {
      if (this.cache[url]) {
         this.img = this.cache[url];
         this.fit();
      } else {
         this.img = this.cache[url] = new Image();
         this.img.onload = () => this.fit();
         this.img.src = url;
      }
   }
   
   /**
    * Set the canvas on which the image should be displayed
    * @param {Canvas} canvas   The canvas in which the image is displayed
    */
   setCanvas(canvas : HTMLCanvasElement) {
      this.canvas = canvas;
   }
   
   /**
    * Convert from pixel coordinates to image coordinates
    */
   toAbsX(xpixel : number) {
      return xpixel / this.scale + this.left;
   }
   toAbsY(ypixel : number) {
      return ypixel / this.scale + this.top;
   }
   
   /**
    * Convert from image coordinates to pixels
    */
   toScreenX(xabs : number) {
      return (xabs - this.left) * this.scale;
   }
   toScreenY(yabs : number) {
      return (yabs - this.top) * this.scale;
   }
   
   /**
    * Zoom-to-fit and center in the canvas
    */
   fit(ev ?: Event) {
      // Zoom-to-fit
      this.scale = Math.min(
         this.canvas.width / this.img.width,
         this.canvas.height / this.img.height);
   
      // Center the image initially
      this.left = -(this.canvas.width / this.scale - this.img.width) / 2;
      this.top  = -(this.canvas.height / this.scale - this.img.height) / 2;
   
      this.draw();
   }
   
   /**
    * Draw the image on the canvas
    */
   draw() {
      if (this.canvas && this.img) {
         const ctxt = this.canvas.getContext('2d');
         ctxt.save();
            // Clear the canvas
            ctxt.setTransform(1, 0, 0, 1, 0, 0);
            ctxt.clearRect(0, 0, this.canvas.width, this.canvas.height);
   
            // Draw the image
            ctxt.setTransform(
                  this.scale, 0, 0, this.scale,
                  this.toScreenX(0), this.toScreenY(0))
            ctxt.drawImage(this.img, 0, 0);
         ctxt.restore();
      }
   }
   
   /**
    * Scroll the image
    * @param left    Absolute position of top-left corner.
    * @param top     Absolute position of top-left corner.
    */
   scroll(left : number, top : number) {
      this.left = left;
      this.top = top;
      this.draw();
   }
   
   /**
    * Update scale of the canvas, and keep (xoffs, yoffs) in same place
    * on the screen.
    * @param xoffs    Optional, position to preserve on screen
    */
   zoom(newScale : number, xoffs ?: number, yoffs ?: number) {
      if (xoffs === undefined) {
         xoffs = this.canvas.width / 2;
      }
   
      if (yoffs === undefined) {
         yoffs = this.canvas.height / 2;
      }
   
      const old_scale = this.scale;
      const xabs = this.toAbsX(xoffs);
      const yabs = this.toAbsY(yoffs);
      this.scale = newScale;
      this.left = xabs - (xabs - this.left) * old_scale / this.scale;
      this.top = yabs - (yabs - this.top) * old_scale / this.scale;
      this.draw();
   }
   
   /**
    * Zoom in, keeping the given pixel (if specified) at the same
    * coordinates.
    */
   zoomIn(xpixel : number, ypixel : number) {
      this.zoom(this.scale * 1.2, xpixel, ypixel);
   }
   
   /**
    * Zoom out, keeping the given pixel (if specified) at the same
    * coordinates.
    */
   zoomOut(xpixel : number, ypixel : number) {
      this.zoom(this.scale / 1.2, xpixel, ypixel);
   };
}

/**
 *
 * ZoomImageDirective
 *
 */

@Directive({
   selector: '[zoomImage]',
   host: {'(wheel)': 'onWheel($event)',
          '(mousedown)': 'onMouseDown($event)',
          'title': 'alt-wheel to zoom in or out'},
})
export class ZoomImageDirective {
   @Input('zoomImage') url : string;

   canvas : HTMLCanvasElement;

   constructor(
      element : ElementRef,
      public image : ZoomImage,
      private render : Renderer)
   {
      // ??? Should we use d3.behavior.zoom to handle zoom ?
      this.canvas = element.nativeElement;
      image.setCanvas(this.canvas);

      window.onresize = () => {
         this.canvas.width = this.canvas.offsetWidth;
         this.canvas.height = this.canvas.offsetHeight;
         this.image.draw();
      };
   }

   ngOnChanges(changes : any) {
      this.canvas.width = this.canvas.offsetWidth;
      this.canvas.height = this.canvas.offsetHeight;
      this.image.setUrl(this.url);
   }

   onWheel(e : WheelEvent) {
      if (e.altKey) {
         if (e.deltaY < 0) {
            this.image.zoomIn(e.layerX, e.layerY);
         } else {
            this.image.zoomOut(e.layerX, e.layerY);
         }
         e.stopPropagation();
         e.preventDefault();
      }
   }

   onMouseDown(e : MouseEvent) {
      const offset = {left: e.pageX, top: e.pageY};
      const initial = {left: this.image.left, top: this.image.top}

      const rm = this.render.listen(this.canvas, 'mousemove', (e : MouseEvent) => {
         const newOffs = {left: e.pageX, top: e.pageY};
         this.image.scroll(
            initial.left + (offset.left - newOffs.left) / this.image.scale,
            initial.top + (offset.top - newOffs.top) / this.image.scale);
      });

      const ru = this.render.listen(this.canvas, 'mouseup', () => {
         rm();  // remove callback
         ru();  // remove callback
      });
   }
}

/**
 *
 * GpMedia
 *
 */

@Component({
   selector: 'gp-media',
   template: `
      <figure *ngIf="repr" class="media">
        <canvas [zoomImage]='repr.url' style="width:100%; height:600px; background:#666" *ngIf='isimage'></canvas>
        <audio controls=1 preload=metadata *ngIf='isaudio'>
           <source [src]="repr.url" [type]="repr.mime">
           No support for audio files in this browser
        </audio>
        <p *ngIf='!isimage && !isaudio'>Unknown media type</p>
        <figcaption>
           <span class="mediaName">{{repr.comments}}</span>
           {{repr.file}}<br>
           mime: {{repr.mime}}<br>Id: {{repr.id}}
        </figcaption>
     </figure>`,
})
export class GpMedia {
   @Input() repr  = <IRepr>null;
   isimage        : boolean;
   isaudio        : boolean;

   ngOnChanges(changes : any) {
      if (this.repr) {
         this.isimage = this.repr.mime.lastIndexOf('image/', 0) == 0 ||
            this.repr.file.endsWith('.jpg') ||
            this.repr.file.endsWith('.png') ||
            this.repr.file.endsWith('.gif');
         this.isaudio = this.repr.mime.lastIndexOf('audio/', 0) == 0;
      }
   }
}

@NgModule({
   imports: [SharedModule],
   declarations: [ZoomImageDirective, GpMedia],
   exports: [ZoomImageDirective, GpMedia],
   providers: [ZoomImage],
})
export class MediaModule {}

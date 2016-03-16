/**
 * An image that can be manipulated (scroll, zoom, ...).
 * This in fact encapsulate several images.
 * @constructor
 */
app.factory('ZoomImage', function() {

   class ZoomImage {
      constructor() {
         this.scale = 1;
         this.left = 0;
         this.top = 0;
         this.img = undefined;  // @type {Image}
         this.canvas = undefined;  // @type {Canvas}
         this.cache = {};   // url->Image
      }
      
      /**
       * Set the image
       * @param {string}  url    The url to load.
       */
      setImage(url) {
         if (this.cache[url]) {
            this.img = this.cache[url];
            this.fit();
         } else {
            this.img = this.cache[url] = new Image();
            this.img.onload = angular.bind(this, this.fit);
            this.img.src = url;
         }
      }
      
      /**
       * Set the canvas on which the image should be displayed
       * @param {Canvas} canvas   The canvas in which the image is displayed
       */
      setCanvas(canvas) {
         this.canvas = canvas;
      }
      
      /**
       * Convert from pixel coordinates to image coordinates
       */
      toAbsX(xpixel) {
         return xpixel / this.scale + this.left;
      }
      toAbsY(ypixel) {
         return ypixel / this.scale + this.top;
      }
      
      /**
       * Convert from image coordinates to pixels
       */
      toScreenX(xabs) {
         return (xabs - this.left) * this.scale;
      }
      toScreenY(yabs) {
         return (yabs - this.top) * this.scale;
      }
      
      /**
       * Zoom-to-fit and center in the canvas
       */
      fit() {
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
       * @param {Number} left    Absolute position of top-left corner.
       * @param {Number} top     Absolute position of top-left corner.
       */
      scroll(left, top) {
         this.left = left;
         this.top = top;
         this.draw();
      }
      
      /**
       * Update scale of the canvas, and keep (xoffs, yoffs) in same place
       * on the screen.
       * @param {=Number} xoffs    Optional, position to preserve on screen
       */
      zoom(newScale, xoffs, yoffs) {
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
      zoomIn(factor, xpixel, ypixel) {
         this.zoom(this.scale * 1.2, xpixel, ypixel);
      }
      
      /**
       * Zoom out, keeping the given pixel (if specified) at the same
       * coordinates.
       */
      zoomOut(factor, xpixel, ypixel) {
         this.zoom(this.scale / 1.2, xpixel, ypixel);
      };
   }

   return ZoomImage;
}).

directive('zoomImage', function(ZoomImage, $window, $document) {
   return {
      scope: {
         repr: '=',    // a String (URL)
         image: '='   // a ZoomImage. Can be created in another scope, so that
                      // it can zoom the image via buttons, for instance.
      },
      replace: true,
      link: function(scope, element) {
         const canvas = element[0];

         if (!scope.image) {
            scope.image = new ZoomImage();
         }
         scope.image.setCanvas(canvas);

         element.on('wheel', function(e) {
            if (e.altKey) {
               if (e.deltaY < 0) {
                  scope.image.zoomIn(e.layerX, e.layerY);
               } else {
                  scope.image.zoomOut(e.layerX, e.layerY);
               }
               e.stopPropagation();
               e.preventDefault();
               scope.$apply();
            }
         });

         element.on('mousedown', function(e) {
            const offset = {left: e.pageX, top: e.pageY};
            const initial = {left: scope.image.left, top: scope.image.top}

            function _onMouseMove(e) {
               const newOffs = {left: e.pageX, top: e.pageY};
               scope.image.scroll(
                  initial.left + (offset.left - newOffs.left) / scope.image.scale,
                  initial.top + (offset.top - newOffs.top) / scope.image.scale);
            }
            function _onMouseUp(e) {
               $document.off('mousemove', _onMouseMove);
               $document.off('mouseup', _onMouseUp);
            }
            $document.on('mousemove', _onMouseMove);
            $document.on('mouseup', _onMouseUp);
         });

         angular.element($window).bind('resize', function() {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            scope.image.draw();
         });

         scope.$watch('repr', function(repr) {
            if (repr) {
               canvas.width = canvas.offsetWidth;
               canvas.height = canvas.offsetHeight;
               scope.image.setImage(repr.url);
            }
         });
      },
      template: '<canvas style="width:100%; height:600px; background:#666">'
         + '</canvas>'
   };
}).

directive('gpMedia', function() {
   return {
      scope: {
         representation: '=',    // a String (URL)
         image: '='   // a ZoomImage. Can be created in another scope, so that
                      // it can zoom the image via buttons, for instance.
      },
      link: function(scope, element) {
         const orig_image = scope.image;
         scope.$watch('representation', function(r) {
            if (r) {
               scope.isimage = r.mime.lastIndexOf('image/', 0) == 0;
               scope.isaudio = r.mime.lastIndexOf('audio/', 0) == 0;
            }
            scope.image = (scope.isimage ? orig_image : null);
         });
      },
      template:
         '<figure ng-if="representation" class="media">'
       +   '<span zoom-image repr="representation" image="image" ng-if="isimage"></span>' 
       +   '<audio controls=1 preload=metadata ng-if="isaudio">'
       +      '<source src="{{representation.url}}" type="{{representation.mime}}">'
       +      'No support for audio files in this browser'
       +   '</audio>'
       +   '<figcaption>'
       +      '<span class="mediaId">R{{representation.id}}</span>'
       +      '{{representation.file}}<br>'
       +      'mime: {{representation.mime}}<br>'
       +      '{{representation.comments}}'
       +   '</figcaption>'
       + '</figure>'
   };
});

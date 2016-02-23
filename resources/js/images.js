/**
 * An image that can be manipulated (scroll, zoom, ...).
 * This in fact encapsulate several images.
 * @constructor
 */
app.factory('ZoomImage', function() {
   function ZoomImage() {
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
   ZoomImage.prototype.setImage = function(url) {
      if (this.cache[url]) {
         this.img = this.cache[url];
         this.fit();
      } else {
         this.img = this.cache[url] = new Image();
         this.img.onload = angular.bind(this, this.fit);
         this.img.src = url;
      }
   };
   
   /**
    * Set the canvas on which the image should be displayed
    * @param {Canvas} canvas   The canvas in which the image is displayed
    */
   ZoomImage.prototype.setCanvas = function(canvas) {
      this.canvas = canvas;
   };
   
   /**
    * Convert from pixel coordinates to image coordinates
    */
   ZoomImage.prototype.toAbsX = function(xpixel) {
      return xpixel / this.scale + this.left;
   };
   ZoomImage.prototype.toAbsY = function(ypixel) {
      return ypixel / this.scale + this.top;
   };
   
   /**
    * Convert from image coordinates to pixels
    */
   
   ZoomImage.prototype.toScreenX = function(xabs) {
      return (xabs - this.left) * this.scale;
   };
   ZoomImage.prototype.toScreenY = function(yabs) {
      return (yabs - this.top) * this.scale;
   };
   
   /**
    * Zoom-to-fit and center in the canvas
    */
   ZoomImage.prototype.fit = function() {
      // Zoom-to-fit
      this.scale = Math.min(
         this.canvas.width / this.img.width,
         this.canvas.height / this.img.height);
   
      // Center the image initially
      this.left = -(this.canvas.width / this.scale - this.img.width) / 2;
      this.top  = -(this.canvas.height / this.scale - this.img.height) / 2;
   
      this._draw();
   };
   
   /**
    * Draw the image on the canvas
    */
   ZoomImage.prototype._draw = function() {
      if (this.canvas && this.img) {
         var ctxt = this.canvas.getContext('2d');
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
   };
   
   /**
    * Scroll the image
    * @param {Number} left    Absolute position of top-left corner.
    * @param {Number} top     Absolute position of top-left corner.
    */
   ZoomImage.prototype.scroll = function(left, top) {
      this.left = left;
      this.top = top;
      this._draw();
   };
   
   /**
    * Update scale of the canvas, and keep (xoffs, yoffs) in same place
    * on the screen.
    * @param {=Number} xoffs    Optional, position to preserve on screen
    */
   ZoomImage.prototype.zoom = function(newScale, xoffs, yoffs) {
      if (xoffs === undefined) {
         xoffs = this.canvas.width / 2;
      }
   
      if (yoffs === undefined) {
         yoffs = this.canvas.height / 2;
      }
   
      var old_scale = this.scale;
      var xabs = this.toAbsX(xoffs);
      var yabs = this.toAbsY(yoffs);
      this.scale = newScale;
      this.left = xabs - (xabs - this.left) * old_scale / this.scale;
      this.top = yabs - (yabs - this.top) * old_scale / this.scale;
      this._draw();
   };
   
   /**
    * Zoom in, keeping the given pixel (if specified) at the same
    * coordinates.
    */
   ZoomImage.prototype.zoomIn = function(xpixel, ypixel) {
      this.zoom(this.scale * 1.2, xpixel, ypixel);
   };
   
   /**
    * Zoom out, keeping the given pixel (if specified) at the same
    * coordinates.
    */
   ZoomImage.prototype.zoomOut = function(xpixel, ypixel) {
      this.zoom(this.scale / 1.2, xpixel, ypixel);
   };

   return ZoomImage;
}).

directive('zoomImage', function(ZoomImage) {
   return {
      scope: {
         src: '=',    // a String (URL)
         image: '='   // a ZoomImage
      },
      replace: true,
      link: function(scope, element) {
         var canvas = element[0];

         if (!scope.image) {
            scope.image = new ZoomImage();
         }
         scope.image.setCanvas(canvas);

         element.on('wheel', function(e) {
            if (e.deltaY < 0) {
               scope.image.zoomIn(e.layerX, e.layerY);
            } else {
               scope.image.zoomOut(e.layerX, e.layerY);
            }
            e.stopPropagation();
            e.preventDefault();
            scope.$apply();
            return false;
         });

         element.on('mousedown', function(e) {
            var offset = {left: e.pageX, top: e.pageY};
            var initial = {left: scope.image.left, top: scope.image.top}

            function _onMouseMove(e) {
               var newOffs = {left: e.pageX, top: e.pageY};
               scope.image.scroll(
                  initial.left + (offset.left - newOffs.left) / scope.image.scale,
                  initial.top + (offset.top - newOffs.top) / scope.image.scale);
            }
            function _onMouseUp(e) {
               element.off('mousemove', _onMouseMove);
               element.off('mouseup', _onMouseUp);
            }
            element.on('mousemove', _onMouseMove);
            element.on('mouseup', _onMouseUp);
         });

         scope.$watch('src', function(v) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            scope.image.setImage(v);
         });
      },
      template: '<canvas style="width:100%; height:600px; background:#666">'
        + '</canvas>'
   };
});

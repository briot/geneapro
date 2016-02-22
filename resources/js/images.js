app.
directive('zoomImage', function() {

   return {
      scope: {
         src: '=',
      },
      replace: true,
      link: function(scope, element) {
         var canvas = element[0];
         var ctxt = canvas.getContext('2d');
         var img = new Image();
         var scale = 1;
         var left = 0;
         var top = 0;

         /**
          * Draw the image on the canvas
          */

         function _redraw() {
            ctxt.save();
               // Clear the canvas
               ctxt.setTransform(1, 0, 0, 1, 0, 0);
               ctxt.clearRect(0, 0, canvas.width, canvas.height);

               // Draw the image
               ctxt.setTransform(
                     scale, 0, 0, scale, _toScreenX(0), _toScreenY(0))
               ctxt.drawImage(img, 0, 0);
            ctxt.restore();
         }

         /**
          * Convert from pixel coordinates to image coordinates.
          */

         function _toAbsX(xpixel) {
            return xpixel / scale + left;
         }
         function _toAbsY(ypixel) {
            return ypixel / scale + top;
         }

         /**
          * Convert from image coordinates to pixels
          */

         function _toScreenX(xabs) {
            return (xabs - left) * scale;
         }
         function _toScreenY(yabs) {
            return (yabs - top) * scale;
         }

         /**
          * Update scale of the canvas, and keep (xoffs, yoffs) in same place
          * on the screen.
          */
         function _updateZoom(newScale, xoffs, yoffs) {
            var old_scale = scale;
            var xabs = _toAbsX(xoffs);
            var yabs = _toAbsY(yoffs);

            scale = newScale;
            left = xabs - (xabs - left) * old_scale / scale;
            top = yabs - (yabs - top) * old_scale / scale;
            _redraw();
         }

         /**
          * Zoom-to-fit and center
          */
         function _zoomToFit() {
            // Zoom-to-fit
            scale = Math.min(
               canvas.width / img.width, canvas.height / img.height);

            // Center the image initially
            left = -(canvas.width / scale - img.width) / 2;
            top  = -(canvas.height / scale - img.height) / 2;

            _redraw();
         }

         /**
          * Zoom in, keeping the given pixel (if specified) at the same
          * coordinates.
          */
         scope.zoomIn = function(xpixel, ypixel) {
            if (xpixel === undefined) {
               xpixel = canvas.width / 2;
               ypixel = canvas.height / 2;
            }
            _updateZoom(scale * 1.2, xpixel, ypixel);
         };

         /**
          * Zoom out, keeping the given pixel (if specified) at the same
          * coordinates.
          */
         scope.zoomOut = function(xpixel, ypixel) {
            if (xpixel === undefined) {
               xpixel = canvas.width / 2;
               ypixel = canvas.height / 2;
            }
            _updateZoom(scale / 1.2, xpixel, ypixel);
         };

         /**
          * Handle events
          */

         canvas.addEventListener('wheel', function(e) {
            if (e.deltaY < 0) {
               scope.zoomIn(e.layerX, e.layerY);
            } else {
               scope.zoomOut(e.layerX, e.layerY);
            }
            e.stopPropagation();
            e.preventDefault();
            return false;
         });

         /**
          * Drag events
          */
         canvas.addEventListener('mousedown', function(e) {
            var offset = {left: e.pageX, top: e.pageY};
            var initial = {left: left, top: top}

            function _onMouseMove(e) {
               var newOffs = {left: e.pageX, top: e.pageY};
               left = initial.left + (offset.left - newOffs.left) / scale;
               top = initial.top + (offset.top - newOffs.top) / scale;
               _redraw();
            }
            function _onMouseUp(e) {
               canvas.removeEventListener('mousemove', _onMouseMove);
               canvas.removeEventListener('mouseup', _onMouseUp);
            }
            canvas.addEventListener('mousemove', _onMouseMove);
            canvas.addEventListener('mouseup', _onMouseUp);
         });

         /**
          * Loading the image
          */

         img.onload = function() {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            _zoomToFit();
         };
         img.src = scope.src;
      },
      template: '<canvas style="width:100%; height:600px; background:#666">'
        + '</canvas>'
   };
});

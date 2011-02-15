/* Copyright Emmanuel Briot 2011 */
/* Makes an <img> scrollable by clicking and dragging the mouse.
 * Also makes it scrollable with the mousewheel
/* Requires mouse_events.js and canvas.js*/

;(function($) {
   $.fn.dragPane = function(){
      return this.each(function(){
         var img=this, $i=$(this);
         $i.load(function() {
          // Called when the image data has been loaded. Replace the image
          // with a canvas (on a <img>, we can play with scrollTop and
          // scrollLeft, but zooming can only be implemented by modifying
          // width and height, which is less flexible)

          var c = $("<canvas></canvas>"),
              ctx = c[0].getContext("2d");

          c[0].className = img.className;
          $i.replaceWith(c);

          $(window).resize();

          c.canvas({weight:100,
                    onDraw:function(evt,box){
                       var t = this.ctx;
                       t.save();
                         t.scale(this.scale, this.scale);
                         t.drawImage(img,-this.x,-this.y);
                       t.restore();
                       }});
     });
   });
 };
})(jQuery);



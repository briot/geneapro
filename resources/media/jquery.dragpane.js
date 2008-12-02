jQuery.DragPane = function (img, options) {
  var imgQuery   = jQuery(img);

  var m = {
     _down:function(e){
        if (options.disable) return false;
        if (e.which != 1) {return false};
        m._img = this;
        jQuery('body').css("cursor","move");
        m._zoom = e.ctrlKey;
        m._x = e.pageX;
        m._y = e.pageY;

        /* Attach events on the document itself, so that if the mouse
           moves outside of the image we still get the event */
        jQuery(document).mousemove(m._move);
        jQuery(document).one("mouseup", function(){
           jQuery('body').css("cursor","");
           jQuery(document).unbind("mousemove",m._move);
        });
        return false;
      },
           
     _move: function(e){
        if (m._zoom) {
           multiplier = 1.01
           if (m._y > e.pageY) zoom (1, multiplier);
           else zoom (-1, multiplier);
        } else {
           m._img.parentNode.scrollTop  += (m._y - e.pageY);
           m._img.parentNode.scrollLeft += (m._x - e.pageX);
        }
        m._x = e.pageX;
        m._y = e.pageY;
        return false;
     }
  };

  this.setOptions = function (newOptions) {
     //  Override some of the options used for this dragPane
     options = jQuery.extend (options, newOptions);
  };

  var zoom = function (step, multiplier) {
     multiplier = multiplier || 1.1;
     if (step > 0) {
        options.zoomFactor *= Math.pow (multiplier, step);
     } else {
        options.zoomFactor /= Math.pow (multiplier, -step);
     }

     var div = img.parentNode;
     imgQuery.width  (options.zoomFactor * img.origWidth);
     imgQuery.height (options.zoomFactor * img.origHeight);

     //  Show as much of the image as possible
     if (imgQuery.width() - div.scrollLeft < jQuery(div).width()) {
        var tmp = imgQuery.width() - jQuery (div).width();
        div.scrollLeft = (tmp < 0 ? 0 : tmp);
     }
     if (imgQuery.height() - div.scrollTop <= jQuery(div).height()) {
        var tmp = imgQuery.height() - jQuery (div).height();
        div.scrollTop = (tmp < 0 ? 0 : tmp);
     }
  }

  if (options.zoomAble) {
     var buttons = jQuery("<div class='buttons'></div>");
     var button = jQuery("<input type='button' value='Zoom in'>");
     button.click (function(){zoom(1)});
     buttons.append (button);

     button = jQuery("<input type='button' value='Zoom out'>");
     button.click (function(){zoom(-1)});
     buttons.append (button);

     buttons.append ($(" <span>Use mouse-drag to scroll, control-mouse to zoom</span>"));

     var viewBox = jQuery ("<div></div>");
     viewBox.addClass (img.className);

     //  Set the width and height of the box to that of the original image,
     //  so that clipping occurs (if we do not have javascript, the image is
     //  scaled by the browser, so this degrades nicely).
     //  Computation of size must be set before we reset the CSS for the image,
     //  so that we know the amount of space that the user has reserved on the
     //  screen for that image
     viewBox.css ({overflow:"auto",
                   width:imgQuery.width(),
                   height:imgQuery.height()});
   
     //  The image's size will be set in setOptions, but we need to compute its
     //  preferred size now, so we need to temporarily override the css
     imgQuery.css ({width:"auto", height:"auto"});
     img.origWidth =imgQuery.width();
     img.origHeight=imgQuery.height();

     //  Add the function buttons in the wrapping box
     imgQuery.wrap ("<div></div>")
        .parent().prepend (buttons).end()
        .wrap (viewBox);
  }

  imgQuery.mousedown(m._down);
  this.setOptions (options);
};

jQuery.fn.DragPane = function(options){
    options = jQuery.extend({
       disable:false, // if true, disable moving image with mouse
       zoomFactor:1,  // if >1, zoom in, if <1, zoom out
       zoomAble:true  // whether the image can be zoomed (can't be changed later)
    }, options);

    if (options.zoomFactor == 0) options.zoomFactor = 1;

    return this.each(function(){
       var data = jQuery(this).data('DragPane');
       if (data) {
         data.setOptions (options);
       } else {
         jQuery(this).data('DragPane', new jQuery.DragPane(this,options));
       }
    });
}; 

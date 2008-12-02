/* AdaCore's implementation of tooltips
   Standard jQuery plug-ins for tooltips are missing features:
     Tooltip 1.2: no support for fetching tooltip's content via AJAX
     clueTip 0.9.8: no support for displaying tooltips after a delay,
        no support for displaying only part of the ajax document as the
        tooltip text, tooltip doesn't disappear when clicking with the mouse,
        which makes it incompatible with various other plug-ins
 */
(function($){
 defaultSettings = {
   className  : 'tooltip',  // Class of the <div> for the tooltip
   delay      : 500,        // Delay before displaying the tooltip
   inlineAttr : 'title',    // attribute that contains inline text for
                            // tooltip. If it starts with '@', the rest of
                            // string is taken as a jQuery selector, and the
                            // first matching element is used
   ajaxAttr   : 'tooltip'   // If no inline attribute exists, this one is
                            // checked and is an AJAX url to download. If it
                            // contains a '#' anchor, only part of the result
                            // is displayed: the part following "# " is a jQuery
                            // selector, and the first matching element will be used,
                            // for instance "url.html# #id"
 };

 var _atx, _aty, _timeout, _tooltip, _element;

 function hideTooltip() {
    window.clearTimeout (_timeout);
    _timeout = 0;
    if (_tooltip) {
       _tooltip.remove();
       _tooltip = null;
    }
    $().unbind ("mousedown", hideTooltip);
 };

 function showTooltip() {
	if (!_tooltip) return;
    _tooltip.hide ().appendTo (document.body)
      .css ({width: 'auto', minWidth:'150px', maxWidth:'400px',
             height: 'auto', position: 'absolute'});

    if (_atx + _tooltip.outerWidth() > $(window).width() - 10)
       _tooltip.css ('right', '2px');
    else
       _tooltip.css ('left', _atx + 2);

    var screenHeight = $(window).height();
    var screenTop    = $(window).scrollTop();
    if (_aty - screenTop + _tooltip[0].offsetHeight > screenHeight - 10)
       _tooltip.css
          ('top', Math.max (0, screenHeight - _tooltip[0].offsetHeight - 10));
    else
       _tooltip.css ('top', _aty + 5);

    _tooltip.fadeIn ("fast");

    // Any click, anywhere, should hide the tooltip
    $().bind ("mousedown", hideTooltip);
 };

 function computeTooltip (settings) {
    hideTooltip();
    _tooltip = $("<div class='" + settings.className + "'/>")
    var txt = $(_element).attr ("_" + settings.inlineAttr);
    if (txt) {
      if (txt.charAt (0) == '@')
         txt = $(txt.subst(1)).html();
      _tooltip.html (txt);
      showTooltip ();

    } else {
      txt= $(_element).attr (settings.ajaxAttr);
      _tooltip.load (txt, showTooltip);
    } 
 };

 jQuery.fn.tooltip = function(settings){
   settings = jQuery.extend ({}, defaultSettings, settings);
   return this
      .mouseover (function(e) { // Display tooltip after a timeout
        if (_timeout) return;  //  Only one of them at a time
        _element = this;
        _atx     = e.pageX;
        _aty     = e.pageY;
        _timeout = window.setTimeout (function() {computeTooltip(settings)},
                                      settings.delay);
     })
     .mousedown (hideTooltip)  /* pressing mouse button would first result
                                  in mouseover, and therefore would show the
                                  tooltip otherwise */
     .mouseout (hideTooltip)

     // Remove default "title" attribute to prevent default tooltips
     // Use some DOM functions for attributes since they are faster than
     // jQuery calls to attr()
     .each (function() {
              this.alt="";  //  default tooltip in IE
              this.setAttribute ("_" + settings.inlineAttr,
                                 this.getAttribute (settings.inlineAttr));
              this.removeAttribute ("title");
            });
 };
})(jQuery);

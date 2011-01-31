/*********************************
 * Adds support for a number of mouse events.
 *
 * - "click": The usual click event (available in standard jQuery)
 *            Called whatever modifiers are used
 * - "dlbclick": the usual double-click event (from jQuery)
 *   Always preceded by two "click" (or some of the events below if some
 *   modifiers are pressed at the same time)
 * - "no-modifier-click": click with no modifier
 * - "ctrl-click": same, but control is pressed
 * - "ctrl-shift-click"
 * - "ctrl-alt-click"
 * - "alt-click"
 * - "alt-shift-click"
 * - "shift-click"
 * - "ctrl-alt-shift-click"
 *
 * - "wheel"
 *    Mouse wheel was modified, use "event.delta" to find the direction
 *
 * - "click-and-hold"
 *    Called when the user presses the mouse and holds it down for a while
 *    (configurable). If you have first connected to some of the click()
 *    events above, they will be raised when the mouse is released. If you
 *    connect to them after click-and-hold, they will not be called.
 *
 * - "start-drag", "in-drag", "stop-drag"
 *    Similar to jQuery UI draggable API (but with different names so that you
 *    can use both signals in your application). This is called before the drag
 *    starts, while it is taking place, and once the mouse has been released.
 *    Optionally, the element can be "thrown", ie when the mouse is released
 *    the element will keep moving for a while. The amount of extra move
 *    depends on the "weight" of the element, and the speed of the mouse.
 *
 *    To prevent throwing, use a 0 weight (the default). Weight 100 provides
 *    the usual throw. Small means the throw will go further away.
 *
 *    These handlers are called with an parameter:
 *       function handler (event, dragdata) { ... }
 *    where
 *       dragdata = {offset: {top:..., left:...},
 *                   weight: 0,
 *                   parent:{top:..., left:...}}
 *
 *    "offset" are the coordinates of the element relative to the page.
 *       Originally set to the element's topcorner.
 *    "parent" are the coordinates relative to the parent element.
 *    "weight" is initially set to the same value you set through set_weight().
 *
 *    You can freely modify "offset" as you need. For instance, in "start-drag"
 *    you would override offset to the coordinates of the top-left corner of
 *    the element, so that later "in-drag" events contain the coordinates to
 *    which the element must be moved.
 *
 *    Compared to jQuery UI, these signals will not actually move the object.
 *    The goal is that you can connect a <canvas>, and then use the events to
 *    move items within the canvas. But they will also work for DOM elements.
 *
 *
 * MISSING:
 * - "contextmenu" (see jquery.longclick.js)
 *
 * Code inspired from the jquery.event.extendedclick.js plugin
 * and http://plugins.jquery.com/node/3440/release
 * and jquery.longclick.js
 * Compared to those modules, you can always pass a "data" arguments, and
 * correctly receive it in your handlers.
 *********************************/

;(function ($) {  // Self-executing function, converts jQuery to "$"

  //  Shortcuts to connect or trigger the custom events
  //  Use:  $("selector").ctrl_click ();  //  emits "ctrl-click"
  //        $("selector").ctrl_click (function(){...});  // binds to it

  $.fn.ctrl_click = function(d,fn) {
     return this[(fn||d)?"bind":"trigger"]("ctrl-click",d,fn)};
  $.fn.ctrl_shift_click = function(d,fn) {
     return this[(fn||d)?"bind":"trigger"]("ctrl-shift-click",d,fn)};
  $.fn.ctrl_alt_click = function(d,fn) {
     return this[(fn||d)?"bind":"trigger"]("ctrl-alt-click",d,fn)};
  $.fn.alt_click = function(d,fn) {
     return this[(fn||d)?"bind":"trigger"]("alt-click",d,fn)};
  $.fn.alt_shift_click = function(d,fn) {
     return this[(fn||d)?"bind":"trigger"]("alt-shift-click",d,fn)};
  $.fn.shift_click = function(d,fn) {
     return this[(fn||d)?"bind":"trigger"]("shift-click",d,fn)};
  $.fn.ctrl_alt_shiftclick = function(d,fn) {
     return this[(fn||d)?"bind":"trigger"]("ctrl-alt-shift-click",d,fn)};
  $.fn.no_modifier_click = function(d,fn) {
     return this[(fn||d)?"bind":"trigger"]("no-modifier-click",d,fn)};
  $.fn.wheel = function(d,fn) {
     return this[(fn||d)?"bind":"trigger"]("wheel",d,fn)};
  $.fn.click_and_hold = function(d,fn) {
     return this[(fn||d)?"bind":"trigger"]("click-and-hold",d,fn)};
  $.fn.set_weight = function(weight) {return this.data (_weight,weight)}
  $.fn.start_drag = function(d,fn) {
     return this[(fn||d)?"bind":"trigger"]("start-drag",d,fn)};
  $.fn.in_drag = function(d,fn) {
     return this[(fn||d)?"bind":"trigger"]("in-drag",d,fn)};
  $.fn.stop_drag = function(d,fn) {
     return this[(fn||d)?"bind":"trigger"]("stop-drag",d,fn)};

  //*********************************************
  //* Common handler
  //* This handler is used for all the special events defined in this
  //* package. It is always called only once per object, even if it is
  //* connected to multiple signals. Its role is to alter the signal type
  //* as appropriate, and then propagate the signal to all the listeners for
  //* the new type.
  //*********************************************/

  function _handler (e) {
     var alt = e.altKey || e.originalEvent.altKey;
     if (e.ctrlKey) {
       if (e.shiftKey)
          e.type = alt ? "ctrl-alt-shift-click" : "ctrl-shift-click";
       else
          e.type = alt ? "ctrl-alt-click" : "ctrl-click";
     } else if (alt) {
       e.type = (e.shiftKey) ? "alt-shift-click" : "alt-click";
     } else {
       e.type = (e.shiftKey) ? "shift-click" : "no-modifier-click";
     }

     return $.event.handle.apply(this, arguments);
  }

  //*********************************************
  //* Basic click events
  //*********************************************
  //  The new events are defined using jQuery's "special" event support.
  //  setup() gets called when the new event is bound to an element.
  //  tearDown() when it gets unbound.

  $.event.special["ctrl-alt-shift-click"] =
  $.event.special["ctrl-shift-click"] =
  $.event.special["ctrl-alt-click"] =
  $.event.special["alt-click"] =
  $.event.special["alt-shift-click"] =
  $.event.special["shift-click"] =
  $.event.special["no-modifier-click"] =
  $.event.special["ctrl-click"] = {
     setup: function (data,namespace) {$(this).bind ('click',data,_handler)},
     teardown: function () {$(this).unbind ('click', _handler)}
  }

  //*********************************************
  //* Wheel events
  //*********************************************

  var  _timer = 'timer.clickAH',
       _fired = 'fired.clickAH',
       _weight = 'weight.AH',
       hold_duration = 200,  //  milliseconds
       _onIOS = (/iphone|ipad|ipod/i).test(navigator.userAgent),
       _wheelEvents = !$.browser.mozilla ? "mousewheel" : // IE, opera, safari
          "DOMMouseScroll" + ($.browser.version<"1.9" ? " mousemove":""); // ff

  $.event.special.wheel = {
     setup: function(data){
       $(this).bind (_wheelEvents, data, $.event.special.wheel.handler)},
     teardown: function(){
       $(this).unbind (_wheelEvents, $.event.special.wheel.handler)},
     handler : function (e) {
       terminate_throw ($(this));
       switch (e.type ){
          case "mousemove": // FF2 has incorrect event positions
             return $.extend (e.data, { // store the correct properties
                clientX: e.clientX, clientY: e.clientY,
                pageX: e.pageX, pageY: e.pageY});
          case "DOMMouseScroll": // firefox
             $.extend (e, e.data ); // fix event properties in FF2
             e.delta = -e.detail/3; // normalize delta
             break;
          case "mousewheel": // IE, opera, safari
             e.delta = e.wheelDelta/120; // normalize delta
             if ( $.browser.opera ) e.delta *= -1; // normalize delta
             break;
          }
       e.type = "wheel"; // hijack the event
       return $.event.handle.apply (this, arguments);
     }
  };

  //*********************************************
  //* Touchpad events
  // Commit subset of touch events to trigger jQuery events of same names
  //*********************************************

  function touch_enabled (elem){
    var $e=$(elem);
    $.each(['touchstart','touchmove','touchend','touchcancel'],
        function bind(ix, it){
           elem.addEventListener(it, function (){$e.trigger(it)}, false);
        });
    return $e;
  }

  //*********************************************
  //* click-and-hold events
  //*********************************************

  function _schedule (e) {
      /* Check the timer isn't already running and drop if so */
      var $t = $(this), elem=this, args=arguments;
      if ($t.data(_timer))
         return;

      terminate_throw ($t);

      /* Flag as "not fired" and schedule the trigger */
      $t.data(_fired, false)
        .data(_timer, setTimeout(scheduled, hold_duration));

      if (_onIOS) {
        $t.bind("touchend.clickAH touchmove.clickAH touchcancel.clickAH",
                _cancel);
      } else {
         $t.bind("mousemove.clickAH mouseup.clickAH mouseout.clickAH", _cancel);
      }
      function scheduled(){
         $t.data(_fired, true)
         e.type= "click-and-hold";

         // Disable click-and-drag and click-and-throw
         $(window).unbind (".THROW");

         $.event.handle.apply(elem, args);  //  Using saved values
      }
  }

  function _cancel (e) {
     var $t=$(this);
     $t.data (_timer, clearTimeout ($t.data (_timer)) || null)
       .unbind("mousemove.clickAH mouseup.clickAH mouseout.clickAH"
               + " touchend.clickAH touchmove.clickAH touchcancel.clickAH");
  }

  function _prevent_click (e) {
     // Prevent firing 'click' event on button release after click-and-hold
     if ($(this).data (_fired))
        return e.stopImmediatePropagation() || false;
  }

  $.event.special["click-and-hold"] = {
    setup: function(data){
      if (_onIOS) {
        touch_enabled(this)
        .bind("touchstart.clickAH", data, _schedule)
        .bind("click.clickAH", data, _prevent_click)
        .css({ WebkitUserSelect:'none'});
      } else {
        $(this).bind("mousedown.clickAH", data, _schedule)
               .bind("click.clickAH", data, _prevent_click);
      }
    },
    teardown: function() {$(this).unbind(".clickAH")}
  };

  /**********************************************************
   * Dragging and throwing items
   **********************************************************/

  var _minDist = 4 * 4,  //  square of min move distance before drag starts
      dt = 0.02, // interval in seconds between two refresh when throwing
      Threshold = 0.01,  // 1% of initial velocity stops the element
      Time = 0.7,        // stops moving at this many seconds
      storePast = 500,   // save position data for the last ... milliseconds
      _throwtimer = "timerTHROW",
      _dragData = "dataTHROW";

  function terminate_throw ($elem) {
     // Terminate any throw Elem is in currently. Elem will stop moving
     // immediately
     var d = $elem.data (_dragData);
     if (d && d._indrag) {
        d._indrag = false;
        $elem.data (_throwtimer, clearInterval ($elem.data (_throwtimer)));
        $elem.trigger ('stop-drag', d);
     }
     $(window).unbind (".THROW");
  }

  function _drag_handler (e) {
     var off = $(this).offset(),
         data = {
             offset: off,
             parent: {left:e.pageX - off.left, top: e.pageY - off.top},
             weight: $(this).data (_weight) || 0,
             _elem: this,
             _indrag: false,
             _past:  [{t:e.timeStamp, x:e.pageX, y:e.pageY}], // compute speed
             _click: {x:e.pageX, y:e.pageY}};

     terminate_throw ($(this));
     $(this).data (_dragData, data);  // save data for use in terminate_throw
     $(window).bind("mousemove.THROW", data, _mousemoveTHROW)
              .bind("mouseup.THROW",   data, _mouseupTHROW);
  }
  function _mousemoveTHROW (e) {
     var d = e.data;
     if (!d._indrag) {
        var diffX = e.pageX - d._click.x,
            diffY = e.pageY - d._click.y;
        if (diffX * diffX + diffY * diffY > _minDist) {
           d._indrag = true;
           $(d._elem).trigger ('start-drag', d);
           d._click.x += d.offset.left
           d._click.y += d.offset.top
        }
     } else {
       d.offset = {top:d._click.y - e.pageY, left:d._click.x - e.pageX}

       // Preserve the last 1s or so of movement, so that we can compute
       // an acceleration when the mouse is released
       while (d._past.length && e.timeStamp - d._past[0].t > storePast)
          d._past.shift();
       d._past.push ({t:e.timeStamp, x:e.pageX, y:e.pageY});
       $(d._elem).trigger ('in-drag', d);
     }
  }

  /* Compute speed and position at any time
   * See http://efreedom.com/Question/1-2298763/Calculate-Negative-Acceleration
   * We force the element to move along the initial line (so that the equations
   * are one-dimensional along this line).
   * The web page above demonstrates how to compute v.
   * The element will stop moving when its current speed reaches Threshold% of
   *   the speed when the user released the mouse. This is also the speed at
   *   which static friction kicks in.
   * It should reach that speed after Time seconds.
   * However, we do not want to deal with the time in seconds when computing
   * the position, and it will be more efficient to rely on a tickrate (number
   * of ticks per seconds). For instance, for a refresh rate of 20ms, this
   * corresponds to 50 ticks/s.
   * Here is the demo from that website:
   *    a(t) = -u * v(t)    //  dynamic friction, proportional to speed
   *    v(t) = integral(a(t)dt), which gives  v(t) = exp (-u * t) = exp(-u)^t
   *    coefficient u computed with   v(Time) = Threshold * v(0) = Threshold
   *    so  u = -ln (Threshold) / Time
   *
   *    v(n) = v0 * k^n, where k=exp (ln(Threshold)/Time/Tickrate)
   * which is more convenient computed recursively, so that we do not have to
   * keep initial values in memory:
   *
   *    v(n+1) = v(n) * k
   * This finally gives us the position of the item along the line:
   *    y(n) = y0 + sum(0,n)(v(n)) = y0 + v0 * (1-k^n)/(1-k)
   */

  function _mouseupTHROW (e) {
     var d = e.data, $e=$(d._elem), r=d._past.length - 2;
     if (d._indrag && r >= 0) {
        if (d.weight) {  // not undefined, and not 0
           function thrown () {
              v *= k;
              var xd = v*cosA,  yd = v*sinA;
              if (Math.abs (xd)<2 && Math.abs (yd)<2) {
                 terminate_throw ($e);
              } else {
                 x -= xd; // use floating point here
                 y -= yd;
                 d.offset={left:Math.round (x), top:Math.round (y)};
                 $e.trigger ('in-drag', d);
              }
           }

           var deltaT = (e.timeStamp - d._past[r].t) / 1000.0,
               vx0 = (e.pageX - d._past[r].x) / deltaT,
               vy0 = (e.pageY - d._past[r].y) / deltaT,
               x = d.offset.left,
               y = d.offset.top,
               v = Math.sqrt (vx0 * vx0 + vy0 * vy0),
               cosA = dt * vx0 / v,  //  the line along which we move
               sinA = dt * vy0 / v,
               k = Math.exp (Math.log (Threshold) * dt / Time * d.weight/100);
           $e.data (_throwtimer, setInterval (thrown, dt * 1000));

        } else {
           terminate_throw ($e);
        }
     }

     //  Always stop following mouse events
     $(window).unbind (".THROW");
     e.stopImmediatePropagation();
     return false;
  }

  // Setup all three events, so that the user only has to connect to at least
  // one of them to activate drag-and-drop
  $.event.special["start-drag"] =
  $.event.special["stop-drag"] =
  $.event.special["in-drag"] = {
     setup: function(data) {$(this).bind ("mousedown", data, _drag_handler)},
     teardown: function() {
        terminate_throw ($(this));
        $(this).unbind ("mousedown",_drag_handler)}
  };

})(jQuery); // map "jQuery" to "$" in the function

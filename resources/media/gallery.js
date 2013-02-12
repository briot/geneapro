/**
 * Transforms root into a gallery. Each of its direct <div> children
 * will be animated, so that they are laid out side by side and only a
 * few of them are visible at a time.
 * If one or more of the children have a "actions" class, they will not
 * be displayed as part of the gallery, but next to the scroll bar.
 *
 *  @param {jQuery} root      The root container.
 *  @param {number} childSize   The maximal size (height or width) of children.
 *  @constructor
 */

function Gallery(root, childSize) {
   this.root = root;
   this.childSize = childSize;
   this.setUp_();
   this.onSetCurrent_(0, false);
}

/** Index of current child */
Gallery.prototype.current;

/** Title area */
Gallery.prototype.title;

/** Margin between the current child and its neighbors */
Gallery.prototype.margin = 10;

/** Ratio between the margins at different generations */
Gallery.prototype.marginRatio = 0.6;

/** Ratio between the sizes of two neighbor items */
Gallery.prototype.sizeRatio = 0.8;

/** Animation duration (ms) */
Gallery.prototype.duration = 200;

/** Number of children to show on its sides of the current child */
Gallery.prototype.threshold = 2;

/** The DOM elements for the children */
Gallery.prototype.children;

/** Perform the initial setup of the gallery
 *  @private
 */

Gallery.prototype.setUp_ = function() {
   var gallery = this;

   var all_images = this.root.find('>div');
   this.children = [];

   this.root.find('>div').each(function() {
      if (!$(this).is('.actions')) {
         $(this).css({'overflow': 'hidden',
                      'display': 'none',
                      'position': 'absolute',
                      'bottom': '50px'})
           .click(function() { gallery.setCurrent(this)});
         gallery.children.push(this);
      }
   });

   this.root.height(this.childSize)
      .mousewheel($.proxy(this.onMouseWheel_, this));
   var wrapper = this.root.wrap('<div class="gallery-wrapper"></div>')
      .css({'overflow': 'hidden',
           'white-space': 'nowrap',
           'position': 'relative'});
   this.title = $('<div class="gallery-title"></div>').insertAfter(this.root)
      .css({'width': '100%',
            'height': '1.2em',
            'font-size': 'smaller',
            'text-align': 'center'});
   $('>.actions', this.root).insertBefore(this.title)
      .css({'float': 'right'});
   var buttons = $('<div class="gallery-buttons"></div>')
      .insertAfter(this.title)
      .css({'width': '100%',
            'height': '30px',
            'text-align': 'center'})
      .mousewheel($.proxy(this.onMouseWheel_, this));
   this.sliders = $('<div></div>').appendTo(buttons)
      .slider({'min': 0, 'max': this.children.length - 1, 'value': 0,
               'change': function() {
                  gallery.onSetCurrent_($(this).slider('value'), true)},
               'slide': function(e, ui) {
                  gallery.onSetCurrent_(ui.value, true)}});
};

/** Mousewheel events handler
 * @param {Event} e  The mouse wheel event.
 * @return {boolean}  Whether to continue processing this event.
 * @private
 */

Gallery.prototype.onMouseWheel_ = function(e) {
   if (e.deltaY < 0) {
      this.setCurrent(this.current - 1, true);
   } else {
      this.setCurrent(this.current + 1, true);
   }
   e.stopPropagation();
   e.preventDefault();
   return false;
};

/** Change the current element
 * @param {number|Element} index   The item to select.
 *   This does not update the slider to reflect the new position.
 */

Gallery.prototype.setCurrent = function(index) {
   if (typeof(index) == 'number') {
      this.sliders.slider({'value': index});
   } else {
      for (var idx = 0; idx < this.children.length; idx++) {
         if (this.children[idx] == index) {
            this.sliders.slider({'value': idx});
            break;
         }
      }
   }
};

/**
 * @return {Element}  The current child.
 */

Gallery.prototype.getCurrent = function() {
   return this.children[this.current];
};

/** Select the previous element, if any */

Gallery.prototype.previous = function() {
   this.setCurrent(this.current - 1);
};

/** Select the next element, if any */

Gallery.prototype.next = function() {
   this.setCurrent(this.current + 1);
};

/** React to changes in the slider.
 * @param {number} index   The item to select.
 *   This does not update the slider to reflect the new position.
 * @param {boolean=} animate  Whether to do animation.
 * @private
 */

Gallery.prototype.onSetCurrent_ = function(index, animate) {
   if (this.current == index) {
      return;
   }
   index = Math.max(0, Math.min(index, this.children.length - 1));
   var old = this.current;
   this.current = index;

   var totalWidth = this.root.width();
   var duration = animate ? this.duration : 0;
   var minSize = this.childSize * Math.pow(this.sizeRatio, this.threshold);

   // Hides all the currently visible items that go off screen
   for (var s = 0; s < this.children.length; s++) {
      $(this.children[s]).stop(true, true);  //  terminate animations
      if (old === undefined || Math.abs(s - this.current) > this.threshold) {
         var left = s < this.current ? 0 : totalWidth;
          $(this.children[s])
             .css({'width': minSize,
                   'left': left}).hide();
      }
   }

   var center = this.children[this.current];
   var ratio = 1;
   var leftX = totalWidth / 2 - this.childSize / 2;

   var title = $(center).attr('title') || '';
   this.title.text(
      title + ' (' +
      (this.current + 1) + ' out of ' + this.children.length + ')');

   $(center)
      .animate({'z-index': 20,
                'width': this.childSize,
                'height': center.height_,
                'left': leftX}, duration)
      .show(duration);

   var currentMargin = this.margin * this.marginRatio;
   var offsetRight = leftX + this.childSize + currentMargin;
   var offsetLeft = leftX;

   for (var offset = 1; offset <= this.threshold; offset++) {
      ratio *= this.sizeRatio;
      var childS = this.childSize * ratio;

      var child = this.children[this.current - offset];
      if (child) {
         var incLeft = childS + currentMargin;
         $(child)
            .animate({'z-index': 20 - offset,
                      'width': childS,
                      'left': offsetLeft - incLeft}, duration)
            .show();
         offsetLeft -= incLeft;
      }

      child = this.children[this.current + offset];
      if (child) {
         var incRight = childS + currentMargin;
         $(child)
            .animate({'z-index': 20 - offset,
                      'width': childS,
                      'left': offsetRight}, duration)
            .show();
         offsetRight += incRight;
      }
      currentMargin *= this.marginRatio;
   }
};

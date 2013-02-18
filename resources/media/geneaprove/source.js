

/** Initialize the source details page
 * @param {window.SuretySchemes} schemes   The necessary surety schemes.
 */

function initSource(schemes) {
   var gallery = new Gallery($('#sourceGallery'), 400);
   var dp = new DragPane($('div.scrollable img')[0]);

   // Support for the gallery and the zoomed-in view for a single media

   $('#sourceCitation .arrow').click(function() {
      var b = $(this);
      if (b.hasClass('open')) {
         b.removeClass('open').siblings('.details').slideUp();
      } else {
         b.addClass('open').siblings('.details').slideDown();
      }
   });

   function toggleZoomed() {
      var w = /** @type {number} */($('#pane1').width());
      var h = /** @type {number} */($('#pane1').height());
      $('.scrollable').width(w).height(h);
      update();
      $('#pane1 > *').toggle();
   }

   function update() {
      var id = $(gallery.getCurrent()).attr('_id');
      dp.setAutoScale(true);
      dp.setsrc('/repr/full/' + id);
   }

   $('#sourceGallery').dblclick(toggleZoomed);
   $('#viewRepr').click(toggleZoomed);
   $('#grayscaleButton').click(function() { dp.grayscale() });
   $('#edgesButton').click(function() { dp.edgeDetect() });
   $('#invertButton').click(function() { dp.invert() });
   $('#noiseButton').click(function() { dp.removeNoise() });
   $('#showAllRepr').click(function() { toggleZoomed() });
   $('#previousRepr').click(function() { gallery.previous(); update() });
   $('#nextRepr').click(function() { gallery.next(); update() });

   // Initialize rating system

   $('.surety').each(function() {
      var $t = $(this);
      var val = $t.attr('_order');
      var s = Number($t.attr('_scheme'));
      $t.empty().raty({
         path: mediaURL + 'raty_img/',
         number: schemes[s].length,
         hintList: schemes[s],
         start: val,
         cancel: true,
         cancelHint: 'Unknown surety',
         readOnly: true
      });
   });

   // Initialize the source citation system
}
window['initSource'] = initSource;

/** Description sent by the server for all the parts of a citation
 * Each element in the array is a (key,value,from_higher) pair.
 * @typedef {Array.<Array.<string>>}
 */
window.CitationParts;

/**
 * Manages the citation for a source, including automatic computation
 * of the title.
 * @param {Element} div   The part of the document to instrument.
 * @param {window.CitationParts} parts   The list of all parts.
 * @constructor
 */

function SourceCitation(div, parts) {
   var _this = this;
   this.div = div;
   this.form = $('#citationForm', div);
   this.sourceId = $('input[name=sourceId]', this.form).val();
   this.csrf = $('input[name=csrfmiddlewaretoken]', this.form).val();
   this.fieldsDiv = $('.citationFields', this.form);

   /** Saves the field values, so that when the user switches source types
    * and goes back to the original, we can restore their values.
    * @dict
    * @private
    */
   this.saved_ = parts;

   $(div).change($.proxy(this.onFieldChange_, this));

   this.restoreFields_(parts);

   $('input[name=save]', div).click(function() {
      $.post('/editCitation/' + _this.sourceId,
             _this.form.serialize(),
             function(data) {
                 $('.details', _this.div).removeClass('edited');
                 _this.restoreFields_(data);
             });
   });
   $('input[name=cancel]', div).click(function() {
      $('.details', _this.div).removeClass('edited');
      _this.saved_ = {};
      $.get('/citationParts/' + _this.sourceId,
            function(data) {
                _this.restoreFields_(data);
            });
   });
}

/**
 * Save the value of the fields, so that we can restore them when the user
 * goes back to the same source type.
 * @private
 */

SourceCitation.prototype.saveFields_ = function() {
   var _this = this;
   $('input', this.form).each(function() {
      var n = this.name;
      var v = $(this).val();
      if (v) {
         _this.saved_[n] = v;
      }
   });
};

/**
 * Restore the value of fields, as saved in the local cache.
 * @param {window.CitationParts} parts   The list of all parts.
 * @private
 */

SourceCitation.prototype.restoreFields_ = function(parts) {
   var _this = this;

   this.fieldsDiv.stop(true, true);  // terminate animations
   var fields = "";
   for (var p = 0; p < parts.length; p++) {
      var k = parts[p][0];
      var v = parts[p][1] || this.saved_[k] || "";
      var from_higher = parts[p][2];
      if (k == '_medium') {
         $('select[name=sourceMediaType] option[value="' + v + '"]', this.div)
            .prop('selected', true);
         $('textarea[name=_title]', this.div).prop("disabled", v != '');
         $('textarea[name=_biblio]', this.div).prop("disabled", v != '');
         $('textarea[name=_abbrev]', this.div).prop("disabled", v != '');
      } else if (k == '_title') {
         $('span.name', this.div).html(v);
         $('textarea[name=_title]', this.div).html(v);
      } else if (k == '_biblio') {
         $('textarea[name=_biblio]', this.div).html(v);
      } else if (k == '_abbrev') {
         $('textarea[name=_abbrev]', this.div).html(v);
      } else if (k == '_notes') {
         $('textarea[name=_notes]', this.div).html(v);
      } else if (k == '_subjectDate') {
         $('input[name=_subjectDate]', this.div).val(v);
      } else if (k[0] != '_') {
         var c = (from_higher ? ' class="disabled"' : '');
         var c2 = (from_higher ? ' disabled' : '');
         fields += '<span' + c + '><label for="' + k + '">' + k +
            '</label><input type="text" id="' + k + '" name="' + k +
            '" value="' + v + '"' + c2 + '/></span>';
      }
   }
   this.fieldsDiv.empty().append(fields).slideDown("fast");
};

/**
 * Called when the value of a field is changed. When we submit a change for
 * the medium type, though, we still have the fields values from the previous
 * medium. So we pass all saved values to the server, which will take care of
 * filtering out the irrelevant parts.
 * @param {Event=} e   The event.
 * @private
 */

SourceCitation.prototype.onFieldChange_ = function(e) {
   var _this = this;
   $(".details", this.div).addClass("edited");

   if (e && e.target.name == 'sourceMediaType') {
      this.saveFields_();
      this.fieldsDiv.slideUp("fast", function() {$(this).empty()});
   
      var medium =
         $('select[name=sourceMediaType] option:selected', this.div)[0].value;
      if (medium != '') {
         $.get('/citationParts/' + medium,
               function(data) {
                  data.push(['_medium', medium]);  // reset title field to r/o
                  _this.restoreFields_(data);
                  _this.onFieldChange_();  //  Recompute full citation
               });
      } else {
         this.restoreFields_([ ['_medium', '']]);
      }
   } else {
      $.post('/fullCitation',
            this.form.serialize(),
            function(data) {
               $('span.name', this.div).html(data['full']);
               $('textarea[name=_title]', this.div).val(data['full']);
               $('textarea[name=_abbrev]', this.div).val(data['short']);
               $('textarea[name=_biblio]', this.div).val(data['biblio']);
            });
   }
};

/** Initialize the source details page
 * @param {window.SuretySchemes} schemes   The necessary surety schemes.
 * @param {window.CitationParts} parts   The list of all parts.
 * @param {Array.<Representation>} images  The representations of the source.
 */

function initSource(schemes, parts, images) {
   var gallery = new Gallery($('#sourceGallery'), 400);
   gallery.addImages(images);
   var dp = new DragPane($('div.scrollable img')[0]);
   var citation = new SourceCitation($('#sourceCitation')[0], parts);

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
      // ??? Should use a Representation instance instead.
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
   $('#viewHighRepr').toggle(function() {
      if (this.checked) {
         $.get('/reprList/' + citation.sourceId,
            function(data) {
               var repr = [];
               for (var d = 0; d < data.length; d++) {
                  repr.push(new Representation(data[d][0], data[d][1]));
               }
               gallery.addImages(repr);
            });

      } else {
         null;
      }
   });

   // Initialize rating system

   $('.surety').each(function() {
      var $t = $(this);
      var val = $t.attr('_order');
      var s = Number($t.attr('_scheme'));
      if (schemes[s]) {
         $t.empty().raty({
            path: mediaURL + 'raty_img/',
            number: schemes[s].length,
            hintList: schemes[s],
            start: val,
            cancel: true,
            cancelHint: 'Unknown surety',
            readOnly: true
         });
      }
   });
}
window['initSource'] = initSource;

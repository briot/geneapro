/** Description sent by the server for all the parts of a citation
 * Each element in the array is a (key,value) pair.
 * @typedef {Array.<Array.<string,string>>}
 * @dict
 */
window.CitationParts;

/**
 * Manages the citation for a source, including automatic computation
 * of the title.
 * @param {Element} div   The part of the document to instrument.
 * @param {window.CitationParts} parts   The list of all parts.
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

   this.fieldsDiv.change($.proxy(this.onFieldChange_, this));

   // Add the required fields which might not have values in the database.
   $('select[name=sourceMediaType]', this.form)
      .change($.proxy(this.onFieldChange_, this));

   this.restoreFields_(parts);
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

   var fields = "";
   for (var p = 0; p < parts.length; p++) {
      var k = parts[p][0];
      var v = parts[p][1] || this.saved_[p] || "";
      if (k == '_medium') {
         $('select[name=sourceMediaType] option[id="' + v + '"]', this.div)
            .prop('selected', true);
      } else if (k == '_title') {
         $('span.name', this.div).text(v);
         $('input[name=_title]', this.div).val(v);
      } else if (k == '_abbrev') {
         $('input[name=_abbrev]', this.div).val(v);
      } else if (k == '_notes') {
         $('input[name=_notes]', this.div).val(v);
      } else if (k == '_subjectDate') {
         $('input[name=_subjectDate]', this.div).val(v);
      } else if (k[0] != '_') {
          fields += '<span class="field"><label for="' + k + '">' + k +
             '</label><input type="text" id="' + k + '" name="' + k +
             '" value="' + v + '"/></span>';
      }
   }
   this.fieldsDiv.empty().append(fields);
};

/**
 * Called when the value of a field is changed. When we submit a change for
 * the medium type, though, we still have the fields values from the previous
 * medium. So we pass all saved values to the server, which will take care of
 * filtering out the irrelevant parts.
 * @param {Event} e   The event.
 * @private
 */

SourceCitation.prototype.onFieldChange_ = function(e) {
   var _this = this;

   if (e && e.target.name == 'sourceMediaType') {
      _this.fieldsDiv.slideUp("fast");
      _this.saveFields_();
   }

   $.post('/editCitation/' + this.sourceId,
          this.form.serialize(),   //  a string
          function(data) {
             _this.restoreFields_(data);

             if (e && e.target.name == 'sourceMediaType') {
                // Report a change in the fields (since we have restored some
                // of them from the cache).
                _this.onFieldChange_();

                _this.fieldsDiv.slideDown("fast");
             }
          });
};

/** Initialize the source details page
 * @param {window.SuretySchemes} schemes   The necessary surety schemes.
 * @param {window.CitationParts} parts   The list of all parts.
 */

function initSource(schemes, parts) {
   var gallery = new Gallery($('#sourceGallery'), 400);
   var dp = new DragPane($('div.scrollable img')[0]);
   new SourceCitation($('#sourceCitation')[0], parts);

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
}
window['initSource'] = initSource;

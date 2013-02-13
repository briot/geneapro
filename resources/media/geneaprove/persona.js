/** @fileoverview  The persona details page. */

/**
 * Describes the surety schemes that the user has defined.
 * Key is the surety scheme index, value is the description of the possible
 * values.
 * @typedef {Object.<number,Array.<string>>}
 */

window.SuretySchemes;

/**
 * Initialize the persona details page
 * @param {window.SuretySchemes} schemes   The necessary surety schemes.
 */

function initPersonaDetails(schemes) {
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

   $('#attrs,#events').dataTable(
      {'bPaginate': false,
      'sDom': '<"top">rt',  // missing "f" (filter) in "top"
      'oLanguage': {
         'sSearch': ''  // No search label
       },
       'aaSorting': [[2, 'asc']], // initial sort on dates
       'aoColumns': [
          null,
          null,
          { 'iDataSort': 3},    //  2: date
          { 'bVisible': false}, //  3: sortDate
          null,
          { 'sWidth': '70px'}
       ]
   });

   $('#p2p_assert').dataTable(
      {'bPaginate': false,
      'sDom': '<"top">rt',
       'aoColumns': [
          null,
          null,
          null,
          { 'sWidth': '70px'}
       ]
   });

   $('#attrs_filter, #events_filter')
      .find('input').attr('placeholder', 'filter');

   // Hide extra information blocks when folding or unfolding lines
   $('#events th, #attrs th').click(function() {
      $('#events td.open, #attrs td.optn')
         .removeClass('open').addClass('closed');
   });

   $('#events td[_url]').addClass('closed')
      .click(toggleExtra).next().click(toggleExtra).css('cursor', 'pointer');
   
   // Highlight events for a given person when clicking on it
   $("#p2p_assert .persona").click(function() {
      var is_selected = $(this).hasClass("highlighted");
      $("[_persona]").removeClass("highlighted");
      if (!is_selected) {
         $("[_persona=" + $(this).text() + "]").addClass("highlighted");
      }
   });
}
window['initPersonaDetails'] = initPersonaDetails;

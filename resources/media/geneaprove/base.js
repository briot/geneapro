/** URL to retrieve media */
var mediaURL;

/**
 * Data sent by the server about a person
 * Generation is the generation number (1 for decujus, negative for children).
 * typedef {{generation:number, givn:string, surn:string,
 *            b:GeneaEvent, d:GeneaEvent, y:Object, sex:string}}
 * @dict
 * @constructor
 */
function ServerPerson() {}

/**
 * The data sent by the server
 * Children is, for each person id, the list of its children.
 * Sosa maps from sosa number to the person id.
 * @constructor
 * @dict
 */
function ServerData() {}
/** @type{Array.<ServerPerson>} */ ServerData.prototype.persons;
/** @type{number} */ ServerData.prototype.generations;
/** @type{number} */ ServerData.prototype.descendants;
/** @type{Object.<number, number>} */ ServerData.prototype.sosa;
/** @type{Object.<number,Array.<number>>} */ ServerData.prototype.children;
/** @type{Object.<DisplayAttr>} */ ServerData.prototype.styles;

/**
 * Detect the rendered font size
 * @param {number=}   tSize   the size to detect.
 * @param {string=}   family  the family for the font.
 * @param {Object=}   options extra CSS options if needed
 */

function detectFontSize(tSize, family, options) {
   var span = $("<span>&nbsp;</span>")
      .css($.extend({'font-family': family || 'monospace',
                     'display': 'block',
                     'padding': 0,
                     'margin': 0,
                     'position': 'absolute',
                     'z-index': -100,
                     'font-size': (tSize || 12) + "px",
                     'left': '-999px'}, options));
   $("body").append(span);
   var actual = span.innerHeight();
   span.remove();
   return actual;
}

/**
 * Simulate class inheritance (child inherits from Parent).
 * @param {Object} childCtor   The child class.
 * @param {Object} parentCtor  The parent class.
 */

function inherits(childCtor, parentCtor) {
   /** @constructor */
   function tempCtor() {};
   tempCtor.prototype = parentCtor.prototype;
   childCtor.superClass_ = parentCtor.prototype;
   childCtor.prototype = new tempCtor();
   /** @override */
   childCtor.prototype.constructor = childCtor;
}

/************************************************
 * Open up an extra row of information in a table.
 * Initial html setup is
 *   <table>
 *     <tr>
 *       <td class="closed" _url="..."></td>
 *       <td>....</td>
 *     </tr>
 * When clicking in the first <td>, an extra row will be
 * added after the current row. The contents of this extra row
 * is given by the _url attribute.
 * @this {Element}    A <td>
 ************************************************/

function toggleExtra() {
  var td = $(this);
  var tr = td.parent();
  var url = /** @type {string} */(td.attr('_url'));

  if (!url) {
     td = td.prev();
     url = /** @type {string} */(td.attr('_url'));
  }

  if (!url)
     return;

  if (td.hasClass('open')) {
     // Fold current extra panel
     tr.next().find('td.extra > div').slideUp(
        200,
        function() {tr.next().hide();
                   td.removeClass('open').addClass('closed');
         });

  } else {
     var n = tr.next();

     if (n.hasClass('extra')) {
        n.show().find('td.extra > div').slideDown(200);

     } else {
        n = $("<tr><td class='extra' colspan='10'>" +
              '<div></div></td></tr>').insertAfter(tr);
        var div = n.find('td.extra > div').hide();
        n.addClass('extra');
        $.get(url, function(data) {div.html(data).slideDown(200)});
     }
     td.removeClass('closed').addClass('open');
  }
}

/**
 * An event description, as sent by the server
 * @typedef {Array.<string>}
 * In this order:   (event, role, assertion)
 */
window.GeneaEvent;

/**
 * Event display
 * The fields of the event depend on the order in json.py
 * @param {window.GeneaEvent} e   The event.
 * @return {string}    The representation of the event.
 */

function event_to_string(e) {
   if (e) {
      var s = e[0] || '';
      if (s) s += (e[2] ? ' \u2713' : ' \u2717');
      return s;
   } else
      return '';
}

/**
 * Open a dialog to import an existing GEDCOM file
 */

function on_import() {
   $('#importDialog').dialog({
      autoOpen: false,
      height: 200,
      width: 400,
      modal: true,
      buttons: {
       'Import': function() {
          $(this).find('form')[0].submit();
          $(this).dialog('close');
       },
       'Cancel': function() {
          $(this).dialog('close');
       }
      }
   }).dialog('open');
}

/** Set the media URL
 * @param {string} url  the {{MEDIA_URL}}.
 */
function setMediaURL(url) {
   mediaURL = url;
}

/**
 * Initialize the default decujus and other common settings
 * @param {number} id   The id of the current decujus.
 * @param {string} name The name of the current decujus.
 */

function initBase(id, name) {
   var p = new ServerPerson();
   p['id'] = id;
   p['givn'] = name;
   new Person(p).select();

   $(window).resize();
   $("#importButton").click(on_import);
}

window['setMediaURL'] = setMediaURL;
window['initBase'] = initBase;

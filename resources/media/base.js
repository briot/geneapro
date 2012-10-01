var data = null;  //  Data from JSON
var decujus = 1;  //  Current decujus

/**
 * Simulate class inheritance (child inherits from Parent).
 * @param {Object} childCtor   The child class.
 * @param {Object} parentCtor  The parent class.
 */

function inherits(childCtor, parentCtor) {
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
}

/**
 * Fast prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix A string to look for at the start of {@code str}.
 * @return {boolean} True if {@code str} begins with {@code prefix}.
 */
startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0;
};

/**
 * Print all its arguments in the console.
 * @param {...}
 */

function log() {
   //  print the arguments in the console, if visible
   if (window.console) {
      console.log(arguments);
   }
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
 * THIS is the first <td>
 ************************************************/

function toggleExtra(td) {
  var td=$(this),
      tr=td.parent(), url=td.attr("_url");

  if (!url) {
     td = td.prev();
     url = td.attr("_url");
  }

  if (!url)
     return;

  if (td.hasClass("open")) {
     // Fold current extra panel
     tr.next().find("td.extra > div").slideUp(
        200,
        function(){tr.next().hide();
                   td.removeClass("open").addClass("closed");
         });
     td.html("<span>&#x25B6;</span>");

  } else {
     var n = tr.next();

     if (n.hasClass("extra")) {
        n.show().find("td.extra > div").slideDown(200);

     } else {
        n = $("<tr><td></td><td class='extra' colspan='10'>"
              + "<div></div></td></tr>").insertAfter(tr);
        var div = n.find("td.extra > div").hide();
        n.addClass("extra");
        $.get(url, function(data){div.html(data).slideDown(200)});
     }
     td.removeClass("closed").addClass("open");
     td.html("<span>&#x25BC;</span>");
  }
}

/************************************************
 * Display a busy image on top of the given element
 ************************************************/
function setBusy (elemt) {
  if (elemt) {
     var pos = elemt.position ();
  } else {
     elemt = $(document.body);
     var pos = {top:0, left:0};
  }
  var mark = $("<div class='throbber'/>")
     .css ({left:elemt.left, top:elemt.top,
            width:elemt.width(), height:elemt.height()});
  elemt.before (mark);
}

function unsetBusy (elemt) {
  $(".throbber", elemt).remove ();
}

/*************************************************
 * Return the current value of a <select> element
 *************************************************/

function getSelectedValue (select) {
  return (select.selectedIndex >= 0)
    ? (select.options[select.selectedIndex].value
       ? select.options [select.selectedIndex].value
       : select.options [select.selectedIndex].text)
    : select.value;
}

/**
 * Compute the display attributes for background or foreground
 */

function getAttr (defaultStyle, person, foreground) {
    var acc = $.extend({}, defaultStyle, data.styles[person.y]);

    if (foreground) {
        acc.fill = acc.color;
        delete acc.stroke;
        delete acc.color;
    }
    return acc;
}

/********************************************************
 * Event display
 * The fields of the event depend on the order in json.py
 ********************************************************/

function event_to_string (e) {
   if (e) {
      var s = e[0] || "";
      if (s) s += (e[2] ? " \u2713":" \u2717");
      return s;
   } else
      return "";
}

var data = null;  //  Data from JSON
var decujus = 1;  //  Current decujus

/************************************************
 * Request JSON data for the pedigree
 ************************************************/

function getPedigree (p) {
  var gen = Number (getSelectedValue ($("select[name=generations]")[0]))+1;
  p = p || {};
  decujus = p.id || decujus;
  $.getJSON (pedigree_data_url,
             {id:decujus, generations:gen, yearonly:p.yearonly},
             function (d, status) {
                unsetBusy ();
                data = d;
                drawSOSA ();
             });
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

/************************************************
 * Compute the SVG attributes for background or foreground
 ************************************************/

function getAttr (svgDefault, person, foreground) {
   var acc = $.extend ({}, svgDefault, data.styles [person.y]);

   if (foreground) {
      acc.fill = acc.color;
      delete acc.stroke;
      delete acc.color;
   } else {
      delete acc["font-weight"];
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

/************************************************
 * Support for pedigree and fanchart
 ************************************************/

function drawBox (svg, person, x, y, sosa, config) {
  if (person) {
     var g = svg.svg (x, y);
     var pId = (sosa < 0 ? "c" + (-sosa) : sosa);
     svg.rect (g, 0, 0, config.boxWidth, config.boxHeight,
               getAttr ({sosa:sosa,
                         onclick:'onClick(evt)',
                         onmouseover:'onMouseOver(evt)',
                         onmouseout:'onMouseOut(evt)'},
                        person, false))
     var clip = svg.other (g, 'clipPath', {id:'p'+pId});
     svg.rect (clip, 0, 0, config.boxWidth, config.boxHeight);

     var birth = event_to_string (person.b),
         death = event_to_string (person.d),
         birthp = person.b ? person.b[1] || "" : "",
         deathp = person.d ? person.d[1] || "" : "";

     svg.text(g, 4, "1em",
          svg.createText().string(person.surn + " " + person.givn)
          .span ("b:", {x:4, dy:"1.2em"})
          .span (birth, {x:16,"font-style":"italic"})
          .span (birthp, {x:16,dy:"1.1em","font-style":"italic"})
          .span ("d:", {x:4, dy:"1.2em"})
          .span (death, {x:16,"font-style":"italic"})
          .span (deathp, {x:16,dy:"1.1em","font-style":"italic"}),
        getAttr ({"clip-path":"url(#p"+pId+")", "pointer-events":"none"},
                 person, true)
         );
    } else {
      svg.rect (x, y, boxWidth, boxHeight,
               {"stroke-dasharray":"3", fill:"white", stroke:"black",
                onmouseover:'onMouseOver(evt)',
                onmouseout:'onMouseOut(evt)'});
  }
}

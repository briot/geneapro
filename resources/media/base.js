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
 * Support for pedigree and fanchart
 ************************************************/

function drawBox (svg, person, x, y, sosa, config) {
  if (person) {
     var g = svg.svg (x, y);
     svg.rect (g, 0, 0, config.boxWidth, config.boxHeight,
              {class:person.sex,
               sosa:sosa,
               onclick:'onClick(evt)',
               onmouseover:'onMouseOver(evt)',
               onmouseout:'onMouseOut(evt)'});
     var clip = svg.other (g, 'clipPath', {id:'p'+sosa});
     svg.rect (clip, 0, 0, config.boxWidth, config.boxHeight);

    if (person.name) {
      var fontweight = (sosa == 1) ? "bold" : "normal";
      svg.text(g, 4, "1em",
          svg.createText().string(person.name)
          .span ("b:", {x:4, dy:"1.2em"})
          .span (person.birth, {x:16,"font-weight":"normal","font-style":"italic"})
          .span (person.birthp, {x:16,dy:"1.1em","font-weight":"normal","font-style":"italic"})
          .span ("d:", {x:4, dy:"1.2em"})
          .span (person.death, {x:16,"font-weight":"normal", "font-style":"italic"})
          .span (person.deathp, {x:16,dy:"1.1em","font-weight":"normal","font-style":"italic"}),
        {"font-weight":fontweight, "clip-path":"url(#p"+sosa+")",
         "pointer-events":"none"});
      }
    } else {
      svg.rect (x, y, boxWidth, boxHeight,
               {"stroke-dasharray":"3",
                onmouseover:'onMouseOver(evt)',
                onmouseout:'onMouseOut(evt)'});
  }
}

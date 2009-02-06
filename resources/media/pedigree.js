var boxWidth = 200;
var horizPadding = 20;
var boxHeight = 60;
var vertPadding = 20; //  vertical padding at last gen
var sosa=null;
var generations=null;
var children=null;

var tops=null;

function onMouseOver (evt) {
  var box = evt.target;
  box.setAttribute ('oldstroke', box.getAttribute ('stroke'));
  box.setAttribute ('stroke', '#555');
  box.setAttribute ('filter','');
}
function onMouseOut (evt) {
  var box = evt.target;
  box.setAttribute ('stroke', box.getAttribute ('oldstroke'));
  box.setAttribute ('filter','url(#shadow)');
}
function ongetJSON (data, status) {
  unsetBusy ();
  sosa = data.sosa;
  generations = data.generations;
  children = data.children;
  drawSOSA ();
}
function getPedigree (id) {
  //setBusy ($("#pedigreeSVG"));
  $.getJSON (pedigree_data_url, {id:id, generations:generations}, ongetJSON);
}
function onClick (evt) {
  var box = evt.target;
  if (box.getAttribute ("sosa") != 1) {
     var num = box.getAttribute ("sosa");
     var id = (num < 0) ? children[-1 - num].id : sosa[num].id;
     var startX = (children ? boxWidth + horizPadding : 0) + 1;
     //var svg = $('#pedigreeSVG').svg('get');
     //svg.root().setAttribute ("opacity",0.2);
     var delay = 200;
     $(box.parentNode).animate ({'svg-x':startX, 'svg-y':tops[0]}, delay);
     setTimeout (function() {getPedigree (id);return false}, delay);
  }
}
function onTxtMouseOver (evt) {
  var box = evt.target;
  box.setAttribute ('oldstroke', box.getAttribute ('stroke'));
  box.setAttribute ('stroke', '#888');
  box.setAttribute ('stroke-width', '1');
}
function onTxtMouseOut (evt) {
  var box = evt.target;
  box.setAttribute ('stroke', box.getAttribute ('oldstroke'));
  box.setAttribute ('stroke-width', '0');
}
function drawSOSA() {
   var svg = $('#pedigreeSVG').height ("100%").svg('get');
   svg.clear ();
   var maxBoxes = Math.pow (2,generations-1);// max boxes at last generation
   var totalBoxes = Math.pow (2,generations) - 1; // geometrical summation

   var startX = (children ? boxWidth + horizPadding : 0) + 1;
   var maxWidth = (boxWidth + horizPadding) * generations + startX;
   var maxHeight = boxHeight * maxBoxes + vertPadding * (maxBoxes - 1);

   svg.configure({viewBox:'0 0 ' + maxWidth + " " + maxHeight,
                  preserveAspectRatio:"xMinYMid"},true);
   var filter = svg.filter (svg.defs(), 'shadow', 0, 0);
   svg.filters.gaussianBlur (filter, 'myBlur', /*'SourceAlpha'*/'', 2);
   svg.filters.offset (filter, 'finalBlur', 'myBlur', 3, 3);
   svg.filters.merge (filter, '', ['finalBlur', 'SourceGraphic']);

   tops = new Array(totalBoxes);

   // Compute the positions for the last generation

   var y = 0;
   for (var index=totalBoxes - maxBoxes; index < totalBoxes; index++) {
      tops[index] = y;
      y += boxHeight + vertPadding;
   }

   // For the other generations, the boxes are centered relatively to their
   // ancestors in the next gen

   for (index = totalBoxes - maxBoxes - 1; index >= 0; index--) {
      tops[index] = (tops [2 * index + 1] + tops [2 * index + 2]) / 2;
   }

   drawBox = function (person, x, y, sosa) {
      if (person && person.sex == "M") {
         var bg = '#D6E0EA';
         var fg = '#9CA3D4';
      } else if (person && person.sex == "F") {
         var bg = '#E9DAF1';
         var fg = '#FF2080';
      } else {
         var bg = '#FFF';
         var fg = '#9CA3D4';
      }
      if (person) {
         var g = svg.svg (x, y);
         svg.rect (g, 0, 0, boxWidth, boxHeight,
                  {stroke:fg, fill:bg, filter:"url(#shadow)",
                   sosa:sosa,
                   onclick:'onClick(evt)',
                   onmouseover:'onMouseOver(evt)',
                   onmouseout:'onMouseOut(evt)'});
         var clip = svg.other (g, 'clipPath', {id:'p'+sosa});
         svg.rect (clip, 0, 0, boxWidth, boxHeight);

        if (person.name) {
          var fontweight = (sosa == 1) ? "bold" : "normal";
          svg.text(g, 4, 16,
               svg.createText().string(person.name)
               .span ("b:", {x:4, dy:"1.4em"})
               .span (person.birth, {"font-weight":"normal",
                                     "font-style":"italic"})
               .span ("d:", {x:4, dy:"1.2em"})
               .span (person.death, {"font-weight":"normal",
                                     "font-style":"italic"}),
               {"font-weight":fontweight, "clip-path":"url(#p"+sosa+")",
                "pointer-events":"none"});
        }
      } else {
         svg.rect (x, y, boxWidth, boxHeight,
                  {stroke:fg, fill:bg, "stroke-dasharray":"3",
                   onmouseover:'onMouseOver(evt)',
                   onmouseout:'onMouseOut(evt)'});
      }
   }

   index = 0;
   for (var gen = 0; gen < generations; gen++) {
      var x = (boxWidth + horizPadding) * gen + startX;
      for (var box = Math.pow (2, gen); box >= 1; box--) {
         if (gen < generations - 1) {
            var x2 = x + boxWidth + horizPadding;
            var y1 = tops[2 * index + 1] + boxHeight / 2;
            var y2 = tops[2 * index + 2] + boxHeight / 2;
            svg.path (svg.createPath()
                      .moveTo (x2, y1)
                      .horizTo (x + boxWidth * 0.9)
                      .vertTo (y2)
                      .horizTo (x2),
                      {stroke:'black', fill:'none'});
            if (gen < generations - 1) {
              svg.text (x2, (y1 + y2) / 2 + 4,
                        svg.createText().string ("marriage ?"),
                        {stroke:"black", "stroke-width":0,
                         onmouseover:'onTxtMouseOver(evt)',
                         onmouseout:'onTxtMouseOut(evt)'});
            }
         }
         drawBox (sosa [index + 1], x, tops[index], index + 1);
         index ++;
      }
   }

   // draw children
   if (children) {
      var space = (maxHeight - children.length * boxHeight)
         / (children.length + 1);
      var y = space;
      for (var c=0; c < children.length; c++) {
         var x2 = x + boxWidth + horizPadding;
         var y2 = tops[2 * index + 2] + boxHeight / 2;
         svg.path (svg.createPath()
                   .moveTo (startX, tops[0] + boxHeight / 2)
                   .horizTo (startX - horizPadding / 2)
                   .vertTo (y + boxHeight / 2)
                   .horizTo (1 + boxWidth),
                   {stroke:'black', fill:'none'});
         drawBox (children [c], 1, y, -1 - c);
         y += boxHeight + space;
      }
   }
}

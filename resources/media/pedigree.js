// Needs the variable "pedigree_data_url" to be defined
var boxWidth = 200;
var horizPadding = 20;
var boxHeight = 75;
var vertPadding = 20; //  vertical padding at last gen
var sosa=null;
var generations=null;
var children=null;
var decujus=1;
var tops=null;

stylesheet = "rect {filter:url(#shadow)} rect.selected {fill:#CCC}";

function onMouseOver (evt) {
  var box = evt.target;
  box.setAttribute ('oldclass', box.getAttribute ('class'));
  box.setAttribute ("class", "selected");
}
function onMouseOut (evt) {
  var box = evt.target;
  box.setAttribute ('class', box.getAttribute ('oldclass'));
}
function onGetJSON (data, status) {
  unsetBusy ();
  sosa = data.sosa;
  generations = data.generations;
  children = data.children;
  marriage = data.marriage;
  drawSOSA ();
}
function getPedigree (id) {
  decujus=id || decujus;
  generations = getSelectedValue ($("select[name=generations]")[0]);
  $.getJSON (pedigree_data_url,
             {id:decujus, generations:generations}, onGetJSON);
}
function onClick (evt) {
  var box = evt.target;
  if (box.getAttribute ("sosa") != 1) {
     var num = box.getAttribute ("sosa");
     var id = (num < 0) ? children[-1 - num].id : sosa[num].id;
     var startX = (children ? boxWidth + horizPadding : 0) + 1;
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
   var maxHeight = boxHeight * maxBoxes + vertPadding * (maxBoxes - 1) +1;

   svg.configure({viewBox:'0 0 ' + maxWidth + " " + maxHeight,
                  preserveAspectRatio:"xMinYMid"},true);
   svg.style (stylesheet);

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

   config = {
     boxWidth: boxWidth,
     boxHeight: boxHeight
   };

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
            if (gen < generations - 1 
                && marriage[2 * index + 2]) {

              var mar = marriage [2 * index + 2].date || "";
              if (mar)
                 mar += (marriage [2*index + 2].sources ? " \u2713":" \u2717");

              svg.text (x2, (y1 + y2) / 2 + 4,
                        svg.createText().string (mar),
                        {stroke:"black", "stroke-width":0,
                         onmouseover:'onTxtMouseOver(evt)',
                         onmouseout:'onTxtMouseOut(evt)'});
            }
         }
         drawBox (svg, sosa [index + 1], x, tops[index], index + 1, config);
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
         drawBox (svg, children [c], 1, y, -1 - c, config);
         y += boxHeight + space;
      }
   }
}

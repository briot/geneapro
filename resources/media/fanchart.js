// Needs the variable "pedigree_data_url" to be defined

defaultConfig = {
   /* Height of a row in the circle, for one generation */
   rowHeight: 60,

   /* Generation number after which the text is rotated 90 degrees to
      make it more readable */
   genThreshold: 4,

   /* row height for generations >= genThreshold */
   rowHeightAfterThreshold: 120, 

   /* Start and End angles, in degrees, for the pedigree view */
   minAngle : -170,
   maxAngle : 170,

   /* If true, the names on the lower half of the circle are displayed
      so as to be readable. Otherwise they are up-side down */
   readable_names: true,

   /* Size of fonts for each generation. Names will not be displayed if the
      generation has no entry in this table. Index 0 is for the decujus */
   fontsizes: ["30px", "40px", "30px", "20px", "10px", "5px", "5px", "5px"],

   /* Width of boxes for children */
   boxWidth: 200,
   boxHeight: 60,

   /* Horizontal padding between the children and the decujus */
   horizPadding: 30,
   vertPadding: 20,

   /* Separator (in degree) between couples. Setting this to 0.5 or more will
      visually separate the couples at each generation, possibly making the
      fanchart more readable for some users */
   separator: 0,

   /* Animation delay (moving selected box to decujus' position */
   delay: 200,
};

/* Person for whom the fanchart is displayed */
var decujus=1;
var config=null;

function getPedigree (id) {
  decujus=id || decujus;
  var gen = Number (getSelectedValue ($("select[name=generations]")[0]))+1;
  $.getJSON (pedigree_data_url,
             {id:decujus, generations:gen, yearonly:true},
             function (data, status) {
                unsetBusy ();
                sosa = data.sosa;
                generations = data.generations;
                children = data.children;
                marriage = data.marriage;
                drawSOSA ();
             });
}
function onClick (evt) {
  var box = evt.target;
  if (box.getAttribute ("sosa") != 1) {
     var num = box.getAttribute ("sosa");
     var id = (num < 0) ? children[-1 - num].id : sosa[num].id;
     var targetX = config.decujusx + $('#pedigreeSVG').offset().left;
     var targetY = config.decujusy + $('#pedigreeSVG').offset().top;

     var transform = "translate(";
     transform += (targetX - evt.pageX) + ",";
     transform += (targetY - evt.pageY) + ")";
     $(box).animate ({'svg-transform':transform}, config.delay);
     $(box).animate({'svg-opacity':0}, config.delay);
     setTimeout (function() {getPedigree (id);return false}, config.delay);
  }
}
function onMouseOver (evt) {
  var box = evt.target;
  box.setAttribute ('oldfill', box.getAttribute ('fill'));
  box.setAttribute ('fill', '#BBB');
}
function onMouseOut (evt) {
  var box = evt.target;
  box.setAttribute ('fill', box.getAttribute ('oldfill'));
}

/* Draw the fanchart for the global variables sosa, based on the configuration
   This does not draw the decujus or its children */
function drawFan (svg, config, centerx, centery) {

   var minAngleRad = config.minAngle * Math.PI / 180;
   var maxAngleRad = config.maxAngle * Math.PI / 180;
   var margin = config.separator * Math.PI / 180;

   function createPath (minRadius, maxRadius, minAngle, maxAngle,
                        large, clockwise)
   {
      if (clockwise == null)  clockwise = false;
      var p = svg.createPath()
         .moveTo (Math.round (centerx + maxRadius * Math.cos (minAngle)),
                  Math.round (centery - maxRadius * Math.sin (minAngle)))
         .arcTo  (maxRadius, maxRadius, 0, large, clockwise,
                  Math.round (centerx + maxRadius * Math.cos (maxAngle)),
                  Math.round (centery - maxRadius * Math.sin (maxAngle)));

      if (minRadius == maxRadius) return p;

      return p
         .lineTo (Math.round (centerx + minRadius * Math.cos (maxAngle)),
                  Math.round (centery - minRadius * Math.sin (maxAngle)))
         .arcTo  (minRadius, minRadius, 0, false, !clockwise,
                  Math.round (centerx + minRadius * Math.cos (minAngle)),
                  Math.round (centery - minRadius * Math.sin (minAngle)))
         .close ();
   }

   for (var gen=generations - 1; gen >= 1; gen--) {
      if (gen < config.genThreshold) {
         var minRadius = config.rowHeight * (gen - 1) || 10;
         var maxRadius = minRadius + config.rowHeight;
         if (gen == 1) maxRadius -= 10;
      } else {
         var minRadius = config.rowHeight * (config.genThreshold - 1)
            + (gen - config.genThreshold) * config.rowHeightAfterThreshold;;
         var maxRadius = minRadius + config.rowHeightAfterThreshold;
      }

      var minIndex = Math.pow (2, gen); /* first SOSA in that gen, and number
                                           of persons in that gen */
      var angleInc = (maxAngleRad - minAngleRad) / minIndex;
      var medRadius = (minRadius + maxRadius) / 2;

      for (var id=0; id < minIndex; id++) {
         var num = minIndex + id;
         var person = sosa [num];
         var bg = getColors (person).bg;
         var maxAngle = maxAngleRad - id * angleInc;
         var minAngle = maxAngle - angleInc;

         if (id % 2 == 0)
            maxAngle -= margin;
         else
            minAngle += margin;

         var p = createPath (minRadius, maxRadius, minAngle, maxAngle, false);

         if (person) {
            svg.path (p, {"stroke":"gray", "fill":bg,
                          sosa:num,
                          onclick:"onClick(evt,config)",
                          onmouseover:'onMouseOver(evt)',
                          onmouseout:'onMouseOut(evt)'});

            if (gen < config.fontsizes.length) {
               /* Draw person name along the curve, and clipped.
                  For late generations, we rotate the text since there is not
                  enough horizontal space anyway */

               if (gen >= config.genThreshold) {
                 var c = Math.cos (minAngle + (maxAngle - minAngle) / 2);
                 var s = Math.sin (minAngle + (maxAngle - minAngle) / 2);
                 if (config.readable_names
                     && Math.abs (maxAngle) > Math.PI / 2)
                 {
                    var textPath = svg.createPath ()
                    .moveTo (Math.round (centerx + maxRadius * c),
                             Math.round (centery - maxRadius * s))
                    .lineTo (Math.round (centerx + minRadius * c),
                             Math.round (centery - minRadius * s));
                 } else {
                    var textPath = svg.createPath ()
                    .moveTo (Math.round (centerx + minRadius * c),
                             Math.round (centery - minRadius * s))
                    .lineTo (Math.round (centerx + maxRadius * c),
                             Math.round (centery - maxRadius * s));
                 }

               } else {
                 if (minAngle < 0 || !config.readable_names) {
                    var textPath = createPath (medRadius, medRadius, 
                       minAngle, maxAngle, false);
                 } else {
                    var textPath = createPath (medRadius, medRadius, 
                       maxAngle, minAngle, false, true);
                 }
               }
               svg.path (svg.defs(), textPath, {id:"Path"+(minIndex + id)})

               var text = svg.text ("",
                  {"stroke":"black", "font-size": config.fontsizes[gen],
                   "pointer-events":"none",
                   "stroke-width":0, 
                   "font-weight":"normal"});
               svg.textpath(text, "#Path"+(minIndex + id),
                  svg.createText().string(person.name)
                  .span ((person.birth || "?") + "-"
                         + (person.death || "?"),
                         {x:"10",dy:"1.1em"}),
                  {startOffset:5}
                 );
            }
         } else {
            svg.path (p, {"stroke":"gray", "fill":bg,
                          "stroke-dasharray":3,
                          onmouseover:'onMouseOver(evt)',
                          onmouseout:'onMouseOut(evt)'});
         }
      }
    }
}

/********************************************************
 * Compute the dimensions of the chart (returns a record with
 * width and height fields
 ********************************************************/

function chartDimensions (config) {
   if (generations < config.genThreshold) {
      var diameter = generations * config.rowHeight * 2;
   } else {
      var diameter = config.genThreshold * config.rowHeight * 2
          + (generations - config.genThreshold)
          * config.rowHeightAfterThreshold * 2;
   }

   return {width:diameter, height:diameter};
}

function drawSOSA (conf) {
   config = $.extend (true, {}, defaultConfig, conf);

   var childrenHeight = children
       ? children.length * (config.boxHeight + config.vertPadding)
       : 0;
   var dimensions = chartDimensions (config);
   var maxHeight = Math.max (childrenHeight, dimensions.height);
   var maxWidth = config.boxWidth + config.horizPadding + dimensions.width;

   $('#pedigreeSVG').height (maxHeight).width (maxWidth);
   var svg = $('#pedigreeSVG').svg('get');
   svg.clear ();
   svg.configure({viewBox:'0 0 ' + maxWidth + " " + maxHeight,
                  preserveAspectRatio:"xMinYMid"},true);

   var centerx = maxWidth - dimensions.width / 2;
   var centery = maxHeight / 2;
   config.decujusx = config.boxWidth + config.horizPadding;
   config.decujusy = centery - 5;

   var person = sosa [1];
   svg.text(config.decujusx, config.decujusy,
            svg.createText().string(person.name)
               .span ("b:", {x:config.decujusx, dy:"1.4em"})
               .span (person.birth, {"font-weight":"normal",
                                     "font-style":"italic"})
               .span ("d:", {x:config.decujusx, dy:"1.2em"})
               .span (person.death, {"font-weight":"normal",
                                     "font-style":"italic"}),
            {"font-weight":"bold", "text-anchor":"start",
             "font-size":config.fontsizes[0]});

   drawFan (svg, config, centerx, centery);

    /* Draw children */

   if (children) {
      var y = (maxHeight 
         - children.length * (config.boxHeight + config.vertPadding)) / 2;
      for (var c=0; c < children.length; c++) {
         drawBox (svg, children [c], 1, y, -1 - c, config);
         y += config.boxHeight + config.vertPadding;
      }
   }
}


// Needs the variable "pedigree_data_url" to be defined

defaultConfig = {
   /* Height of a row in the circle, for one generation */
   rowHeight: 60,

   /* Generation number after which the text is rotated 90 degrees to
      make it more readable */
   genThreshold: 4,

   /* Extra blank spaces between layers rings. This is used to display
      marriage information (if 0, no marriage info is displayed) */
   sepBetweenGens: 20,

   /* row height for generations >= genThreshold */
   rowHeightAfterThreshold: 120, 

   /* Height of the inner (white) circle. This height is substracted from
      rowHeight for the parent's row */
   innerCircle: 10,

   /* Start and End angles, in degrees, for the pedigree view */
   minAngle : -170,
   maxAngle : 170,

   /* If true, the names on the lower half of the circle are displayed
      so as to be readable. Otherwise they are up-side down */
   readable_names: true,

   /* Generation at which we stop displaying names */
   textThreshold: 10,

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

stylesheet =
 "text.decujus {font-size:12px; font-weight:bold} "
  +"text{stroke-width:0; pointer-events:none}"
  +" textpath.gen1, textpath.gen1 tspan {font-size:12px}"
  +" textpath.gen2, textpath.gen2 tspan {font-size:12px}"
  +" textpath.gen3, textpath.gen3 tspan {font-size:11px}"
  +" textpath.gen4, textpath.gen4 tspan {font-size:10px}"
  +" textpath.gen5, textpath.gen5 tspan {font-size:9px}"
  +" textpath.gen6, textpath.gen6 tspan {font-size:9px}"
  +" textpath.gen7, textpath.gen7 tspan {font-size:9px}"
  +" textpath.gen8, textpath.gen8 tspan {font-size:9px}"
  +" textpath.gen9, textpath.gen9 tspan {font-size:8px}"
  +" textpath.gen10, textpath.gen10 tspan {font-size:8px}"
  +" textpath.gen11, textpath.gen11 tspan {font-size:8px}"
  +" textpath.gen12, textpath.gen12 tspan {font-size:8px}"
  +" path {stroke:gray}"
  +" path.selected {fill:gray}"
  +" rect {stroke:#9CA3DA}"
  +" path.u {fill:white; stroke-dasharray:3}"; // person unknown

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
  box.setAttribute ('oldclass', box.getAttribute ('class'));
  box.setAttribute ("class", "selected");
}
function onMouseOut (evt) {
  var box = evt.target;
  box.setAttribute ('class', box.getAttribute ('oldclass'));
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
         var minRadius = config.rowHeight * (gen - 1) || config.innerCircle;
         var maxRadius = minRadius + config.rowHeight;
         if (gen == 1) maxRadius -= config.innerCircle;
      } else {
         var minRadius = config.rowHeight * (config.genThreshold - 1)
            + (gen - config.genThreshold) * config.rowHeightAfterThreshold;;
         var maxRadius = minRadius + config.rowHeightAfterThreshold;
      }

      if (gen <= 7) 
         minRadius += config.sepBetweenGens;

      var minIndex = Math.pow (2, gen); /* first SOSA in that gen, and number
                                           of persons in that gen */
      var angleInc = (maxAngleRad - minAngleRad) / minIndex;
      var medRadius = (minRadius + maxRadius) / 2;

      for (var id=0; id < minIndex; id++) {
         var num = minIndex + id;
         var person = sosa [num];
         var maxAngle = maxAngleRad - id * angleInc;
         var minAngle = maxAngle - angleInc;

         if (id % 2 == 0)
            maxAngle -= margin;
         else
            minAngle += margin;

         var p = createPath (minRadius, maxRadius, minAngle, maxAngle, false);

         if (person) {
            svg.path (p, getAttr ({sosa:num,
                                    onclick:"onClick(evt,config)",
                                    onmouseover:'onMouseOver(evt)',
                                    onmouseout:'onMouseOut(evt)'},
                                   person, false));

            if (gen < config.textThreshold) {
               /* Draw person name along the curve, and clipped.
                  For late generations, we rotate the text since there is not
                  enough horizontal space anyway */

               if (gen >= config.genThreshold) {
                 var c = Math.cos (minAngle + (maxAngle - minAngle) / 2);
                 var s = Math.sin (minAngle + (maxAngle - minAngle) / 2);
                 if (config.readable_names
                     && Math.abs (minAngle + (maxAngle - minAngle)/2) >= Math.PI / 2)
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
               svg.path (svg.defs(), textPath, {id:"Path"+num})

               var birth = person.birth;
               if (birth)
                  birth += (person.births ? " \u2713" : " \u2717");
               var death = person.death;
               if (death)
                  death += (person.deaths ? " \u2713" : " \u2717");

               var text = svg.text ("");
               svg.textpath(text, "#Path"+num,
                  svg.createText().string("")
                  .span (person.surn.toUpperCase())
                  .span (person.givn, {dx:5})
                  .span ((birth || "?") + "-" + (death || "?"),
                         {x:"10",dy:"1.1em"}),
                  getAttr ({class:"gen" + gen, startOffset:5},
                           person, true));

               if (num % 2 == 0 && config.sepBetweenGens > 10
                   && marriage[num] && gen <= 7)
               {
                 if (gen == 1) {
                    var textPath = svg.createPath ()
                       .moveTo (centerx - config.rowHeight, centery - 10)
                       .lineTo (centerx + config.rowHeight, centery - 10);

                 } else if (minAngle < 0 || !config.readable_names) {
                    var textPath = createPath (
                          minRadius - config.sepBetweenGens,
                          minRadius - config.sepBetweenGens, 
                          minAngle - angleInc, maxAngle, false);
                 } else {
                    var textPath = createPath (minRadius, minRadius, 
                          maxAngle, minAngle - angleInc, false, true);
                 }
                 svg.path (svg.defs(), textPath, {id:"PathM"+num})

                 var mar = marriage [num].date || "";
                 if (mar)
                    mar += (marriage [num].sources ? " \u2713":" \u2717");

                 svg.textpath (text, "#PathM"+num,
                    svg.createText ().string (mar),
                    {stroke:"black", "stroke-width":0,
                     startOffset:"50%", "text-anchor":"middle"});

               }
            }
         } else {
            svg.path (p, {class:"u",
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
      var radius = generations * config.rowHeight;
   } else {
      var radius = (config.genThreshold - 1) * config.rowHeight
          + (generations - config.genThreshold)
          * config.rowHeightAfterThreshold;
   }

   if (config.maxAngle - config.minAngle >= 360)
       // A full circle ?
       return {width:diameter, height:diameter};
   else {
       var minA = (config.minAngle + 3600) % 360;  // 0 to 360
       var maxA = minA + (config.maxAngle - config.minAngle); // 0 to 719
       var min = -1;
       var max = 1;

       // If going from min to max includes 0, the max is 1, otherwise it is
       // the max of the two cosine

       if (maxA < 360)
          max = Math.max (Math.cos (minA * Math.PI / 180),
                          Math.cos (maxA * Math.PI / 180));

       // If going from min to max includes 180 the min is -1, otherwise it is
       // the min of the two cosine

       if ((minA <= 180 && maxA >= 180)
           || (minA >= 180 && maxA < 540))
          min = Math.min (Math.cos (minA * Math.PI / 180),
                          Math.cos (maxA * Math.PI / 180));

       var width = radius * (max - min);
       var centerX = -min * radius;

       // same for height
       max = 1;
       min = -1;

       if ((minA > 90 && maxA < 450)
           || (minA < 90 && maxA < 90))
          max = Math.max (Math.sin (minA * Math.PI / 180),
                          Math.sin (maxA * Math.PI / 180));
       if ((minA < 270 && maxA < 270)
           || (minA > 270 && maxA < 270 + 360))
          min = Math.min (Math.sin (minA * Math.PI / 180),
                          Math.sin (maxA * Math.PI / 180));

       var height = radius * (max - min);
       return {width:width, height:height, centerX:centerX,
               centerY:height+min*radius};
   }
}

function drawSOSA (conf) {
   config = $.extend (true, {}, defaultConfig, conf);

   config.rowHeight += config.sepBetweenGens;

   var childrenHeight = children
       ? children.length * (config.boxHeight + config.vertPadding)
       : 0;
   var dimensions = chartDimensions (config);
   var maxHeight = Math.max (childrenHeight, dimensions.height);
   var maxWidth = config.boxWidth + config.horizPadding + dimensions.width;

   var svg = $("#pedigreeSVG").height (maxHeight).width (maxWidth).svg('get');
   svg.clear ();
   svg.configure({viewBox:'0 0 ' + maxWidth + " " + maxHeight,
                  preserveAspectRatio:"xMinYMid"},true);
   svg.style (stylesheet);

   config.decujusx = config.boxWidth + config.horizPadding;
   var centerx = config.decujusx + dimensions.centerX;
   var centery = dimensions.centerY;
   config.decujusy = centery - 5;

   var person = sosa [1];
   var birth = person.birth;
   if (birth)
      birth += (person.births ? " \u2713" : " \u2717");
   var death = person.death;
   if (death)
      death += (person.deaths ? " \u2713" : " \u2717");

   drawBox (svg, person, config.decujusx,
            config.decujusy - config.boxHeight / 2, 1, config);

   /* Draw children */

   if (children) {
      var y = (maxHeight - childrenHeight) / 2;
      for (var c=0, len=children.length; c < len; c++) {
         drawBox (svg, children [c], 1, y, -1 - c, config);
         y += config.boxHeight + config.vertPadding;
      }
   }

   drawFan (svg, config, centerx, centery);

   /* Generation information */

   $("#stats").empty()

   for (var gen=1; gen < generations; gen++) {
      var minIndex = Math.pow (2, gen); /* first SOSA in that gen, and number
                                           of persons in that gen */
      var count = 0;
      var earliest = "9999-99-99";
      var latest = "0000-00-00";
      for (var p=minIndex; p < 2 * minIndex; p++) {
         var person = sosa [p];
         if (person) {
            count ++;
            if (person.birth && person.birth < earliest)
               earliest = person.birth;
            if (person.death && person.death < earliest)
               earliest = person.death;
            if (person.birth && person.birth > latest)
               latest = person.birth;
            if (person.death && person.death > latest)
               latest = person.death;
         } 
      }
      if (earliest == "9999-99-99")
         earliest = "";
      if (latest == "0000-00-00")
         latest = "";

      $("#stats")
         .append ("<li><b>Generation " + gen + "</b><br>"
                  + count + "/" + minIndex + " individuals ("
                  + (count / minIndex * 100) + "%)<br>"
                  + " from " + earliest + " to " + latest
                  + "</li>");
   }
}


// Needs the variable "pedigree_data_url" to be defined

defaultConfig = {
   /* Height of a row in the circle, for one generation */
   rowHeight: 80,

   /* Half the aperture on the left where the decujus is written,
      in degrees */
   halfAperture: 10,

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

   /* Animation delay (moving selected box to decujus' position */
   delay: 200
};

/* Person for whom the fanchart is displayed */
var decujus=1;
var config=null;

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
  var gen = Number (getSelectedValue ($("select[name=generations]")[0]))+1;
  $.getJSON (pedigree_data_url,
             {id:decujus, generations:gen, yearonly:true}, onGetJSON);
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

function drawSOSA (conf) {
   config = $.extend (true, {}, defaultConfig, conf);

   var svg = $('#pedigreeSVG').height ("100%").svg('get');
   svg.clear ();

   /* Margin, in radians, on each end of the text path for the names */
   var margin = 2 * Math.PI / 180;

   var childrenHeight = children
       ? children.length * (config.boxHeight + config.vertPadding)
       : 0;
   var diameter = generations * config.rowHeight * 2;
   var maxHeight = Math.max (childrenHeight, diameter);
   var maxWidth = config.boxWidth + config.horizPadding + diameter;
   svg.configure({viewBox:'0 0 ' + maxWidth + " " + maxHeight,
                  preserveAspectRatio:"xMinYMid"},true);

   var centerx = maxWidth - diameter / 2;
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

   var minAngleRad = (-180 + config.halfAperture) * Math.PI / 180;
   var maxAngleRad = (180 - config.halfAperture) * Math.PI / 180;

   function createPath (minRadius, maxRadius, minAngle, maxAngle,
                        large, clockwise)
   {
      if (clockwise == null)  clockwise = true;
      var p = svg.createPath()
         .moveTo (Math.round (centerx + maxRadius * Math.cos (minAngle)),
                  Math.round (centery + maxRadius * Math.sin (minAngle)))
         .arcTo  (maxRadius, maxRadius, 0, large, clockwise,
                  Math.round (centerx + maxRadius * Math.cos (maxAngle)),
                  Math.round (centery + maxRadius * Math.sin (maxAngle)));

      if (minRadius == maxRadius)
         return p;

      return p
         .lineTo (Math.round (centerx + minRadius * Math.cos (maxAngle)),
                  Math.round (centery + minRadius * Math.sin (maxAngle)))
         .arcTo  (minRadius, minRadius, 0, false, !clockwise,
                  Math.round (centerx + minRadius * Math.cos (minAngle)),
                  Math.round (centery + minRadius * Math.sin (minAngle)))
         .close ();
   }

   for (var gen=generations - 1; gen >= 1; gen--) {
      var minRadius = config.rowHeight * (gen - 1) || 10;
      var maxRadius = config.rowHeight * gen;
      var minIndex = Math.pow (2, gen); /* first SOSA in that gen, and number
                                           of persons in that gen */
      var angleInc = (maxAngleRad - minAngleRad) / minIndex;
      var medRadius = (minRadius + maxRadius) / 2;

      for (var id=0; id < minIndex; id++) {
         var num = minIndex + id;
         var person = sosa [num];
         if (person && person.sex == "M") {
            var bg = '#D6E0EA';
         } else if (person && person.sex == "F") {
            var bg = '#E9DAF1';
         } else {
           var bg = '#FFF';
         }

         /* Draw cell */
         var minAngle = minAngleRad + id * angleInc;
         var p = createPath
            (minRadius, maxRadius, minAngle, minAngle + angleInc, false);

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

               if (gen >= 5) {
                 var c = Math.cos (minAngle + angleInc / 2);
                 var s = Math.sin (minAngle + angleInc / 2);
                 if (config.readable_names
                     && Math.abs (minAngle) > Math.PI / 2)
                 {
                    var textPath = svg.createPath ()
                    .moveTo (Math.round (centerx + maxRadius * c),
                             Math.round (centery + maxRadius * s))
                    .lineTo (Math.round (centerx + minRadius * c),
                             Math.round (centery + minRadius * s));
                 } else {
                    var textPath = svg.createPath ()
                    .moveTo (Math.round (centerx + minRadius * c),
                             Math.round (centery + minRadius * s))
                    .lineTo (Math.round (centerx + maxRadius * c),
                             Math.round (centery + maxRadius * s));
                 }

               } else {
                 if (minAngle < 0 || !config.readable_names) {
                    var textPath = createPath (medRadius, medRadius, 
                       minAngle + margin, minAngle + angleInc - margin, false);
                 } else {
                    var textPath = createPath (medRadius, medRadius, 
                       minAngle + angleInc - margin, minAngle + margin,
                       false, false);
                 }
               }
               svg.path (svg.defs(), textPath, {id:"Path"+(minIndex + id)})

               var text = svg.text ("",
                  {"stroke":"black", "font-size": config.fontsizes[gen],
                   "pointer-events":"none",
                   "stroke-width":0,
                   "font-weight":"normal"});
               svg.textpath(text, "#Path"+(minIndex + id),
                  svg.createText().string(num + " " + person.name)
                  .span ((person.birth || "?") + "-"
                         + (person.death || "?"),
                         {x:"10",dy:"1.1em"})
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

   function drawBox (svg, person, x, y, sosa, config) {
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
         svg.rect (g, 0, 0, config.boxWidth, config.boxHeight,
                  {stroke:fg, fill:bg,
                   sosa:sosa,
                   onclick:'onClick(evt)',
                   onmouseover:'onMouseOver(evt)',
                   onmouseout:'onMouseOut(evt)'});
         var clip = svg.other (g, 'clipPath', {id:'p'+sosa});
         svg.rect (clip, 0, 0, config.boxWidth, config.boxHeight);

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



// Needs the variable "pedigree_data_url" to be defined

defaultConfig = {
   /* Height of a row in the circle, for one generation */
   rowHeight: 60,

   /* Half the aperture on the left where the decujus is written,
      in degrees */
   halfAperture: 17,

   /* If true, the names on the lower half of the circle are displayed
      so as to be readable. Otherwise they are up-side down */
   readable_names: false,

   /* Size of fonts for each generation. Names will not be displayed if the
      generation has no entry in this table. Index 0 is for the decujus */
   fontsizes: ["50", "40", "30", "20", "10", "5"],

   /* Width of boxes for children */
   boxWidth: 100,

   /* Horizontal padding between the children and the decujus */
   horizPadding: 30,

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
             {id:decujus, generations:gen}, onGetJSON);
}
function onClick (evt) {
  var box = evt.target;
  if (box.getAttribute ("sosa") != 1) {
     var num = box.getAttribute ("sosa");
     var id = (num < 0) ? children[-1 - num].id : sosa[num].id;
     $(box.parentNode).animate ({'svg-x':config.decujusx,
                                 'svg-y':config.decujusy}, config.delay);
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

   var maxHeight = generations * config.rowHeight * 2;
   var maxWidth  = Math.max
      (1000, maxHeight + config.boxWidth + config.horizPadding + 300);
   svg.configure({viewBox:'0 0 ' + maxWidth + " " + maxHeight,
                  preserveAspectRatio:"xMinYMid"},true);

   var centerx = maxWidth - maxHeight / 2;
   var centery = maxHeight / 2;

   config.centerx = centerx;
   config.centery = centery;
   config.decujusx = centerx - 300;
   config.decujusy = centery - 20;

   var person = sosa [1];
   svg.text(config.decujusx, config.decujusy,
            svg.createText().string(person.name)
               .span ("b:", {x:config.decujusx, dy:"1.4em"})
               .span (person.birth, {"font-weight":"normal",
                                     "font-style":"italic"})
               .span ("d:", {x:config.decujusx, dy:"1.2em"})
               .span (person.death, {"font-weight":"normal",
                                     "font-style":"italic"}),
            {"font-weight":"bold",
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
         var person = sosa [minIndex + id];
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
                          sosa:minIndex + id,
                          onclick:"onClick(evt,config)",
                          onmouseover:'onMouseOver(evt)',
                          onmouseout:'onMouseOut(evt)'});

            if (gen < config.fontsizes.length) {
               /* Draw person name along the curve, and clipped */
   
               if (minAngle < 0 || !config.readable_names) {
                  var textPath = createPath (medRadius, medRadius, 
                       minAngle, minAngle + angleInc, false);
               } else {
                  var textPath = createPath (medRadius, medRadius, 
                       minAngle + angleInc, minAngle, false, false);
               }
               svg.path (svg.defs(), textPath, {id:"Path"+(minIndex + id)})

               var text = svg.text ("",
                  {"stroke":"black", "font-size": config.fontsizes[gen],
                   "pointer-events":"none",
                   "font-weight":"normal"});
               svg.textpath(text, "#Path"+(minIndex + id),
                  svg.createText().string(person.name));
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


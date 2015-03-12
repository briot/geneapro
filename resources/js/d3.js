/**
 * Various utilities to support d3 and SVG
 */
app.factory('gpd3', function() {

   function gpd3() {}

   /**
    * @enum {number}
    */
   gpd3.layoutScheme = {
      EXPANDED: 0,
      COMPACT: 1
   };

   /**
    * @enum {number}
    */

   gpd3.colorScheme = {
      RULES: 0,
      //  color of a person's box is computed on the server, depending on the
      //  highlighting rules defined by the user

      PEDIGREE: 1,
      //  The color of a person's box depends on its location in the pedigree

      GENERATION: 2,
      //  The color depends on the generation

      WHITE: 3,
      //  No border or background for boxes

      TRANSPARENT: 4,
      //  No background, black stroke

      QUARTILE: 5,
      //  Base color depends on the grand-parent of the decujus
   };

   /**
    * Describes how the boxes are displayed.
    * @enum {number}
    */

   gpd3.appearance = {
      FLAT: 0,
      GRADIENT: 1
   };

   /**
    * How to draw links
    * @enum {number}
    */

   gpd3.linkStyle = {
      STRAIGHT: 0,
      ORTHOGONAL: 1,
      CURVE: 2
   };

   /**
    * Prepare the svg element. It is setup for zooming and scrolling
    * with the mouse. An optional callback might be called, for instance
    * if you need to update the display to display more or less
    * information.
    * @param {jqlite} element.
    * @param {function=} onzoom.
    */
   gpd3.svg = function(element, onzoom) {
      var currentScale = 1;
      var currentTranslate = [0, 0];
      var zoom = d3.behavior.zoom().scaleExtent([1 / 15, 15])
         .on('zoom', function() {
            currentScale = d3.event.scale;
            currentTranslate = d3.event.translate;
            g.applyScale()});
      zoom.scale(currentScale).translate(currentTranslate);
      var g = d3.select(element[0])
         .append("svg")
         .attr('preserveAspectRatio', 'xMinYMin meet')
         .call(zoom)
         .on('dblclick.zoom', null)  // disable double-click
         .append('g')

      g.applyScale = function() {
         g.transition()
          .duration(500)
          .attr(
            'transform',
            'translate(' + currentTranslate +
               ')scale(' + currentScale + ')');
         if (onzoom) {
            onzoom.call(g, currentScale);
         }
      }
      return g;
   };

   /**
    * Set the viewbox of the svg element, based on the layout's extents
    * @param {jqlist} element
    * @param {{x,y,width,height}} layout  provides the extents of the graph
    * @param {bool=} preventZoomIn  If true, never zoom in by default (i.e.
    *   a length of 1 in the svg matches at most 1 pixel on screen)
    * @param {Number=} margin  The margin around each side
    */
   gpd3.setViewBox = function(element, layout, preventZoomIn, margin) {
      margin = margin === undefined ? 10 : margin;
      var x = layout.x - margin;
      var y = layout.y - margin;
      var w = (preventZoomIn ? element[0].clientWidth : 0);
      var h = (preventZoomIn ? element[0].clientHeight : 0);
      w = Math.max(w, layout.width + 2 * margin);
      h = Math.max(h, layout.height + 2 * margin);
      d3.select(element[0]).select('svg')
         .transition()
         .attr('viewBox', x + ' ' + y + ' ' + w + ' ' + h);
   };

   /** 
    * Return the function to compute the paths for links,
    * based on user preferences.
    * These function are all similar to d3.svg.dialog.
    * They operate on a [sourceperson, targetperson] array,
    * and return the path to use for the link.
    *    svg.selectAll('path.link')
    *       .data(...).enter().append('path')
    *       .attr('d', linksDraw(style))
    *
    * @param {gpd3.linkStyle}  style.
    */

   gpd3.linksDraw = function(style) {
      var link_y = function(person) {
         return person.y + person.h / 2;
      };
      function link_source(d) {  // return a {x,y} object
         return {y: d[0].x + d[0].w, x: link_y(d[0])};
      }
      function link_target(d) { // return a {x,y} object
         return {y: d[1].x, x: link_y(d[1])};
      }
      function link_project(d) { // map source or target to an array
         return [d.y, d.x];
      }
      switch (style) {
         case gpd3.linkStyle.STRAIGHT:
            var drawer = function(d) {
               var source = link_project(link_source(d));
               var target = link_project(link_target(d));
               return 'M' + source + 'L' + target;
            }
            break;
         case gpd3.linkStyle.ORTHOGONAL:
            drawer = function(d) {
               var source = link_project(link_source(d));
               var target = link_project(link_target(d));
               return 'M' + source + 'H' + (target[0] - 5) +
                    'V' + target[1] + 'H' + target[0];
            };
            break;
         case gpd3.linkStyle.CURVE:
            drawer = d3.svg.diagonal()
                  .projection(link_project)
                  .source(link_source).target(link_target);
            break;
      }

      function draw(d) {
         return drawer(d);
      }

      // Set the function that returns the y coordinates for links attached
      // to a box representing a person.
      // @param {function(person)->y} ypos.
      draw.linky = function(ypos) {
         link_y = ypos;
         return draw;
      };

      return draw;
   };

   /**
    * Support for HSB colors.
    * This is similar to d3.hsl
    */
   gpd3.hsb = function(h, s, v) {
      var ll = (2.0 - s) * v;
      var ss = (s * v) / (ll <= 1 ? ll : 2.0 - ll);
      return d3.hsl(h, ss, ll / 2);
   };

   /**
    * Prepare the gradients to use when highlighting persons based on
    * their generation.
    * @param {Element} group   svg element to add <defs> to.
    * @param {Number} maxGen   The highest generation number.
    * @return {function}   Given a person, returns its fill style.
    */
   gpd3.gradientForEachGeneration = function(group, maxGen) {
      var g = group.append("defs")
         .selectAll('linearGradient')
         .data(d3.range(0, maxGen))
         .enter()
         .append("linearGradient")
         .attr("id", function(gen) {return "gengradient" + gen})
         .attr("x2", 0)
         .attr("y2", "100%");
      g.append("stop")
         .attr("offset", 0).attr("stop-color", function(gen) {
            return gpd3.hsb(180 + 360 * (gen - 1) / 12, 0.4, 1.0);
         });
      g.append("stop")
         .attr("offset", "100%").attr("stop-color", function(gen) {
            return gpd3.hsb(180 + 360 * (gen - 1) / 12, 0.4, 0.8);
         });
      return function(p) {
         return 'url(#gengradient' + Math.abs(p.generation) + ')';
      };
   };

   /**
    * Prepare the gradients to use when highlighting persons based on their
    * position within each generation.
    * @param {Element} group   svg element to add <defs> to.
    * @param {Array} nodes     list of all persons.
    * @param {function} color0  first color to use (given a node).
    * @param {function} color1  second color to use (given a node).
    *    If it returns 'undefined', no gradient is applied for that person.
    * @return {function}       Given a person, returns its fill style.
    */
   gpd3.gradientForEachAngle = function(group, nodes, color0, color1, isRadial) {
      angular.forEach(nodes, function(d) {
         if (color1(d) === undefined) {
            d.$fill = color0(d);
            d.$fillGradient = false;
         } else {
            d.$fill = 'url(#gradient' + d.id + ')';
            d.$fillGradient = true;
         }
      });

      if (isRadial) {
         var g = group.append("defs").selectAll('radialGradient')
            .data(nodes.filter(function(d) { return d.$fillGradient }),
                  function(d) {return d.id})
            .enter()
            .append("radialGradient")
            .attr('id', function(p) {return "gradient" + p.id })
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('cx', 0.5)
            .attr('cy', 0.5)
            .attr('r', function(d) {return d.maxRadius});
         var offset1 = function(d) {
            if (d.maxRadius) {
               return (1 + (d.minRadius / d.maxRadius)) / 2;
            } else {
               return '0%'
            }};
      } else {
         var g = group.append("defs").selectAll('linearGradient')
            .data(nodes.filter(function(d) { return d.$fillGradient }),
                  function(d) {return d.id})
            .enter()
            .append("linearGradient")
            .attr("id", function(p) {return "gradient" + p.id })
            .attr("x2", 0)
            .attr("y2", "100%");
         var offset1 = 0;
      }
      g.append("stop").attr("offset", offset1).attr("stop-color", color0);
      g.append("stop").attr("offset", "100%").attr("stop-color", color1);
      return function(d) { return d.$fill };
   };

   /**
    * Return the styles to use for each person.
    * @param {Element} group   svg element to add <defs> to.
    * @param (Array} nodes     list of all persons to display.
    * @param {Object} settings the settings to use (colorScheme,...).
    * @param {PedigreeData} data  the data download from the server, to
    *    find the user's custom styles.
    * @param {bool} preserve  Whether to clear previous styles.
    * @param {bool} isRadial  Whether we should create radial gradients.
    * @return {Object}  the styles.
    * The object has several fields, each of which is either a static
    * string that specifies a constant color, or a function that takes
    * a person and returns its color.
    * In addition, this function creates the necessary <def> for SVG.
    */

   gpd3.getStyles = function(group, nodes, settings, data, preserve, isRadial) {
      var maxGen = Math.max(settings.gens, settings.descendant_gens || 1);
      var result = {
         fillStyle: 'none',
         strokeStyle: '#222',
         textStyle: 'black',
         separatorStyle: null   //  for fanchart
      };

      if (!preserve) {
         group.selectAll('defs').remove();
      }

      switch(settings.colorScheme) {
         case gpd3.colorScheme.GENERATION:
            if (settings.appearance == gpd3.appearance.GRADIENT) {
                result.fillStyle =
                   gpd3.gradientForEachGeneration(group, maxGen);
            } else {
               result.fillStyle = function(p) {
                  var gen = Math.abs(p.generation);
                  return gpd3.hsb(180 + 360 * (gen - 1) / 12, 0.4, 1.0);
               };
            }
            break;

         case gpd3.colorScheme.PEDIGREE:
            // Avoid overly saturated colors when displaying only few
            // generations (i.e. when boxes are big)
            var m = Math.max(12, maxGen);
            result.fillStyle = function(p) {
               var gen = Math.abs(p.generation);
               return gpd3.hsb(p.angle * 360, gen / m, 1.0);
            };
            if (settings.appearance == gpd3.appearance.GRADIENT) {
                result.fillStyle = gpd3.gradientForEachAngle(
                   group, nodes,
                   result.fillStyle,
                   function(d) {
                      var gen = Math.abs(d.generation);
                      return gpd3.hsb(d.angle * 360, gen / m, 0.8);
                   }, isRadial);
            }
            break;

         case gpd3.colorScheme.RULES:
             result.fillStyle = function(p) {
                var st = data.getStyle(p);
                return st['fill'];
             };
             result.strokeStyle = function(p) {
                var st = data.getStyle(p);
                return st['stroke'];
             };
             result.textStyle = function(p) {
                var st = data.getStyle(p);
                return st['color'];
             };
             // Disable gradients for custom colors
             if (settings.appearance == gpd3.appearance.GRADIENT) {
                result.fillStyle = gpd3.gradientForEachAngle(
                   group,
                   nodes,
                   result.fillStyle,
                   function(p) {
                      var st = data.getStyle(p);
                      if (st['fill'] == 'none' || st['fill'] == 'white' ) {
                         // disable gradient
                         return undefined;
                      } else {
                         return d3.rgb(st['fill']).darker();
                      }
                   }, isRadial);
             }
             break;

         case gpd3.colorScheme.WHITE:
            // No need for gradients
            result.strokeStyle = 'none';
            break;

         case gpd3.colorScheme.TRANSPARENT:
            // No need for gradients
            result.strokeStyle = '#000';
            break;

         case gpd3.colorScheme.QUARTILE:
            // Only applies to fanchart

            var base = ['rgb(236,250,253)',
                        'rgb(242,250,235)',
                        'rgb(255,235,234)',
                        'rgb(255,253,238)'];
            var border = ['rgb(93,183,217)',
                          'rgb(148,194,95)',
                          'rgb(243,96,80)',
                          'rgb(240,223,55)'];

            angular.forEach(nodes, function(d) {
               var m = Math.pow(2, d.generation);
               d.quartile = Math.floor((d.sosa - m) / (m / 4)) % 4;
            });

            result.strokeStyle = '#ccc';
            result.separatorStyle = function(d) {
               return border[d.quartile];
            };
            result.fillStyle = function(d) {
               if (d.generation >= 0) {
                  return base[d.quartile];
               } else {
                  return 'none';
               }
            };
            if (settings.appearance == gpd3.appearance.GRADIENT) {
               var fillStyle = gpd3.gradientForEachAngle(
                  group,
                  nodes,
                  result.fillStyle,
                  function(d) { return border[d.quartile]},
                  isRadial);
               result.fillStyle = function(d) {
                  if (d.generation < 0) {
                     return 'none';
                  } else {
                     return fillStyle(d);
                  }
               };
            }

            break;
      }
      return result;
   };

   return gpd3;
});

var PI_HALF = Math.PI / 2;
var PI_TWO = Math.PI * 2;

app.
config(function($stateProvider) {
   $stateProvider.
   state('fanchart', {
      url: '/fanchart?id',
      templateUrl: 'geneaprove/fanchart.html',
      reloadOnSearch: false,  // See pedigree.js
      controller: 'fanchartCtrl'
   });
}).

controller('fanchartCtrl', function($scope, Pedigree, $location, $stateParams, $state, contextMenu) {
   $scope.$on('$locationChangeSuccess', function() {
      $scope.decujus = $location.search().id || $scope.decujus;
   });
   $scope.decujus = $stateParams.id !== undefined ?
       Number($stateParams.id) : Pedigree.decujus() || 1;

   /**
    * Support for the contextual menu. The contextual menu data is set via the
    * gpFanchart directive.
    */
   $scope.$on('contextMenuOpen', function() {
      $scope.contextual = contextMenu.data;
      $scope.$apply();
   });
   $scope.expandPerson = function() {
      var mdata = contextMenu.data;
      var d = mdata.d;
      if (!d.$expand) {
         // the partner (wife/husband) cannot also be expanded
         function _reset(p) {
            angular.forEach(p.parents, function(pa) {
               if (pa) {
                  _reset(pa);
                  if (pa == d) {
                     angular.forEach(p.parents, function(pa2) {
                        pa2.$expand = false;
                     });
                  }
               }
            });
         }
         _reset(Pedigree.main);
      }
      d.$expand = !d.$expand;
      mdata.render(mdata.data);  // redo the drawing
   };
   $scope.focusPerson = function() {
      var mdata = contextMenu.data;
      var id = mdata.d.id;  // capture since menu will be destroyed
      d3.select(mdata.element).transition()
         .attr('transform', 'scale(1.5)')
         .each('end', function() {
            $location.search('id', id);
            $scope.$apply();
         });
   };
   $scope.showPerson = function() {
      $state.go('person', {id: contextMenu.data.d.id});
   };

}).

directive('gpFanchart', function(Pedigree, FanchartLayout, $rootScope, gpd3, $location, contextMenu) {
   return {
      scope: {
         decujus: '=gpFanchart',
      },
      link: function(scope, element) {
         var set = $rootScope.settings.fanchart;
         var group = gpd3.svg(element).append('g');

         // Generation at which we stop displaying names
         var textThreshold = 8;

         scope.$watch(
            function() { return [scope.decujus, $rootScope.settings]},
            function() {
               $rootScope.cleanupSettings();
               Pedigree.select(scope.decujus);
               Pedigree.get(set.gens, 1).then(function(data) {
                  if (set.showMissing) {
                     data.addUnknown(set.gens - 1);
                  } else {
                     data.removeUnknown();
                  }
                  render(data);
               });
            },
            true);

         function render(data) {
            // Width of the separator between generations, when it has a
            // specific color.
            // ??? Should be set depending on whether the styles set a
            // separatorStyle, but computing the style needs the layout and
            // the layout needs the separator width...
            var separator =
               (set.colorScheme == gpd3.colorScheme.QUARTILE) ?
                FanchartLayout.SEPARATOR_WIDTH : 0;

            var layout = FanchartLayout(data, separator);
            var styles = gpd3.getStyles(
                  group, layout.nodes, set, data,
                  false /* preserve */,
                  true /* isRadial */);

            group.attr('class', 'fanchart color-' + set.colorScheme)
               .attr('transform',
                     'translate(' + layout.centerX + ',' + layout.centerY + ')');

            // The paths for the names
            var paths = group.append('defs')
               .selectAll('path')
               .data(layout.nodes.filter(function(d) {
                    return d.generation < FanchartLayout.genThreshold()}));
            paths.exit().remove();
            paths.enter()
               .append('path')
               .attr('id', function(d) {return 'text' + d.id});
            paths
               .transition()
               .attr('d', function(d) {
                  var r = (d.minRadius + d.maxRadius) / 2;
                  var m = d.minAngle - PI_HALF;
                  var M = d.maxAngle - PI_HALF;
                  var sweep = 1;
                  if (set.readableNames && m >= 0 && m <= Math.PI) {
                     var t = m;
                     m = M;
                     M = t;
                     sweep = 0
                  }
                  return 'M' + r * Math.cos(m) + ' ' + r * Math.sin(m) +
                     'A' + r + ',' + r +   /* rx ry */
                     ' 0 0 ' +  // x-axis-rotation large-arc-flag sweep-flag
                     sweep + ' ' +
                     r * Math.cos(M) + ' ' + r * Math.sin(M);
               });

            var persons = group
               .selectAll('g.person')
               .data(layout.nodes, function(d) { return d.id });
            persons.exit().remove();
            persons.enter()
               .append('g')
               .attr('class', 'person')
               .on('contextmenu', contextmenu)
               .append('path');

            persons.selectAll('text').remove();

            var arc = d3.svg.arc()
               .startAngle(function(d) { return d.minAngle })
               .endAngle(function(d) { return d.maxAngle })
               .innerRadius(function(d) { return d.minRadius })
               .outerRadius(function(d) { return d.maxRadius });
            persons.selectAll('path')
               .attr('stroke', styles.strokeStyle)  // immediate
               .attr('fill', styles.fillStyle)      // immediate
               .transition()
               .duration(800)
               .attr('d', arc);
            if (separator && styles.separatorStyle) {
               var arc2 = d3.svg.arc()
                  .startAngle(function(d) { return d.minAngle })
                  .endAngle(function(d) { return d.maxAngle })
                  .innerRadius(function(d) { return d.maxRadius })
                  .outerRadius(function(d) {
                     return d.maxRadius + separator;
                  });
               persons.append('path')
                  .attr('stroke', '#ccc')
                  .attr('fill', styles.separatorStyle)
                  .attr('d', arc2);
            }

            // Handling of contextual menu
            function contextmenu(d) {
               contextMenu.create(
                     scope, '#contextMenu', d3.event,
                     {element: this,
                      d: d,       // info on specific person
                      data: data, // full pedigree info
                      render: render});  // function to redraw
            }

            function drawText(txt) {
               txt
                  .attr('text-anchor', 'middle')
                  .text(function(d) { return d.surn})

                  .filter(function(d) { return d.generation <= 6 })

                  .append('tspan')
                  .attr('class', 'name')
                  .attr('dy', '1em')
                  .attr('x', 0)
                  .text(function(d) { return d.givn })

                  .append('tspan')
                  .attr('class', 'details')
                  .attr('dy', '1em')
                  .attr('x', 0)
                  .text(function(d) {
                     var birth = data.event_to_string(d.birth);
                     var death = data.event_to_string(d.death);
                     return (birth || '') + ' - ' + (death || '')});
            }
 
            // text along curve for generations < genThreshold
            drawText(persons
               .filter(function(d) { return d.generation < FanchartLayout.genThreshold()})
               .append('text')
               .attr('class', 'name')
               .append('textPath')
               .attr('startOffset', '50%')
               .attr('xlink:href', function(d) { return '#text' + d.id}));

            // Rotated text for middle generations
            drawText(persons
               .filter(function(d) { return d.generation >= FanchartLayout.genThreshold() &&
                                            d.generation < textThreshold})
               .append('text')
               .attr('transform',
                  function(d) {
                     var c = arc.centroid(d);
                     var a = (d.minAngle + d.maxAngle) * 90 / Math.PI - 90;
                     if (set.readableNames && (a < -90 || a > 90)) {
                        a -= 180;

                     }
                     return 'rotate(' + a + ',' + c + ')translate(' + c + ')';
                  }));

            // Show the marriages
            if (set.showMarriages) {
               group.append('defs')
                  .selectAll('path')
                  .data(layout.nodes.filter(function(d) {
                       return d.generation < textThreshold - 1;
                  }))
                  .enter()
                  .append('path')
                  .attr('id', function(d) {return 'textMarriage' + d.id})
                  .attr('d', function(d) {
                     var r = d.maxRadius - 2;
                     var m = d.minAngle - PI_HALF;
                     var M = d.maxAngle - PI_HALF;
                     var sweep = 1;
                     if (set.readableNames && m >= 0 && m <= Math.PI) {
                        var t = m;
                        m = M;
                        M = t;
                        sweep = 0
                     }
                     return 'M' + r * Math.cos(m) + ' ' + r * Math.sin(m) +
                        'A' + r + ',' + r +   /* rx ry */
                        ' 0 0 ' +  // x-axis-rotation large-arc-flag sweep-flag
                        sweep + ' ' +
                        r * Math.cos(M) + ' ' + r * Math.sin(M);
                  });

               persons
                  .filter(function(d) {
                     return d.generation < set.gens && d.generation < textThreshold - 1
                  })
                  .append('text')
                  .attr('class', 'marriage')
                  .append('textPath')
                  .attr('startOffset', '50%')
                  .attr('text-anchor', 'middle')
                  .text(function(d) { return data.event_to_string(d.marriage)})
                  .attr('xlink:href', function(d) { return '#textMarriage' + d.id});
            }

            // Show the children
            var styles2 = gpd3.getStyles(
                  group, layout.childnodes, set, data, true /* preserve */);
            var children = group
               .selectAll('g.child')
               .data(layout.childnodes, function(d) { return d.id });
            children.exit().remove();
            var g = children.enter()
               .append('g')
               .attr('class', 'child');
            g.append('rect')
               .attr('rx', '6px')
               .attr('ry', '6px')
               .attr('width', function(d) { return d.w})
               .attr('height', function(d) { return d.h});
            children.selectAll('rect')
               .attr('fill', styles2.fillStyle)
               .attr('stroke', styles2.strokeStyle);
            g.append('text')
               .attr('x', 5)
               .attr('y', '1em')
               .text(data.displayName);
            children
               .attr('transform', function(d) {
                  return 'translate(' + d.x + ',' + d.y + ')';
               })
               .on('contextmenu', contextmenu);
             
            gpd3.setViewBox(element, layout);
         }
      }
   };
}).

/**
 * A fanchart layout algorithm
 * @param {PedigreeData} data    to display.
 * @return {{nodes}}
 *    nodes is an array of all the nodes to display. These are the same
 *    person instances given in data, augmented with layout information:
 *        minAngle, maxAngle:   start and end angle
 *        minRadius, maxRadius: inner and outer radius
 *        fs:                   text sizes
 */

factory('FanchartLayout', function($rootScope) {
   // Generation after which the text is rotated 90 degrees to make it
   // more readable.
   var genThreshold = 4;

   /**
    * Compute a fanchart layout.
    * @param (Number) extraSep  extra amount of separation between generations
    */
   function layout(data, extraSep) {
      var settings = $rootScope.settings.fanchart;
      var rowHeight = 60;  //  height for a generation in the fanchart

      // row height for generations after genThreshold
      var rowHeightAfterThreshold = 100;

      // Extra blank space between layer rings. This is used to display
      // marriage information.
      var sepBetweenGens = Math.max(
         extraSep || 0,
         settings.showMarriages ? layout.SEPARATOR_WIDTH : 0);

      // Height of the inner white circle
      var innerCircle = 20;

      // Start and end angles in radians. Clockwise starting from the usual
      // 0 angle
      var maxAngle = settings.angle * PI_HALF / 180 - Math.PI / 2;
      var minAngle = -maxAngle - Math.PI;

      // Separator (in radians) between couples. Setting this to 0.5 or more
      // will visually separate the couples at each generation.
      var separator = settings.space * PI_HALF / 900;

      // Size of boxes for children
      var boxWidth = 100;
      var boxHeight = 30;

      // Base size for the text
      var textHeight = 20;

      // Compute the radius for each generation
      var minRadius = [0];
      var maxRadius = [innerCircle];
      var fs = [textHeight];
      for (var gen = 1; gen <= settings.gens; gen++) {
         var m = maxRadius[gen - 1] + ((gen == 1) ? 0 : sepBetweenGens);
         fs.push(fs[gen - 1] * 0.9);
         minRadius.push(m);
         maxRadius.push(
            m + (gen < genThreshold ?  rowHeight : rowHeightAfterThreshold));
      }

      var addedToNodes = {};
      var nodes = [];
      var childnodes = [];
      function addToNodes(p) {
         if (p.sosa != 1 && !addedToNodes[p.id]) {
            addedToNodes[p.id] = true;
            nodes.push(p);
         }
      }
  
      // Compute the bounding box for the fan itself, as if it was
      // centered on (0, 0).
      var minX = 0;
      var minY = 0;
      var maxX = 0;
      var maxY = 0;
  
      /** Register the layout information for a given individual
       *  ??? We should also check at each of the North,West,South,East
       *  points, since these can also intersect the bounding box. We
       *  need to check whether any of these is within the arc though.
       *  @param {Person} indiv   The person.
       *  @param {number} minAngle   start angle.
       *  @param {number} maxAngle   end angle.
       */
      function setupIndivBox(indiv, minAngle, maxAngle) {
         var maxR = maxRadius[indiv.generation];
         var x1 = maxR * Math.cos(minAngle);
         var y1 = maxR * Math.sin(minAngle);
         var x2 = maxR * Math.cos(maxAngle);
         var y2 = maxR * Math.sin(maxAngle);
         minX = Math.min(minX, x1, x2);
         maxX = Math.max(maxX, x1, x2);
         minY = Math.min(minY, y1, y2);
         maxY = Math.max(maxY, y1, y2);
         indiv.minAngle = minAngle + PI_HALF;
         indiv.maxAngle = maxAngle + PI_HALF;
         indiv.minRadius = minRadius[indiv.generation];
         indiv.maxRadius = maxR;
         indiv.fs = fs[indiv.generation];
         addToNodes(indiv);
      }

      function doLayout(indiv, minAngle, maxAngle, separator) {
         setupIndivBox(indiv, minAngle, maxAngle);
  
         if (indiv.generation < settings.gens && indiv.parents) {
            var father = indiv.parents[0];
            var mother = indiv.parents[1];

            if (father && mother) {
               if (father.$expand) {
                  var half = minAngle + (maxAngle - minAngle) * 0.95;
               } else if (mother.$expand) {
                  var half = minAngle + (maxAngle - minAngle) * 0.05;
               } else {
                  var half = (minAngle + maxAngle) / 2;
               }
               doLayout(
                  father, minAngle, half - separator / 2, separator / 2);
               doLayout(
                  mother, half + separator / 2, maxAngle, separator / 2);
            } else if (father) {
               var tenth = minAngle + maxAngle * 0.95;
               doLayout(
                     father, minAngle, tenth - separator / 2, separator / 2);
            } else if (mother) {
               var tenth = minAngle + maxAngle * 0.05;
               doLayout(
                     mother, tenth + separator / 2, maxAngle, separator / 2);
            }
         }
      }
      doLayout(data.main, minAngle + separator / 2,
               maxAngle - separator / 2, separator);

      var height = maxY - minY;

      // The space there should be below centerYx so that the fanchart
      // does not hide the decujus box partially.
  
      var angle = PI_TWO - (maxAngle - minAngle);
      var minDist;  // distance between left side of decujus box and fan center
      if (angle >= Math.PI) {
         // Fanchart occupies less than a half circle
         minDist = 0;
      } else if (angle <= Math.PI / 6) {
         minDist = height / 2; // fullCircle
      } else {
         minDist = boxWidth / 2 / Math.tan(angle / 2);
      }
      var box = {
         x: minX,
         y: minY,
         centerX: 0,
         centerY: 0,
         width: maxX - minX,
         height: height,
         childnodes: childnodes,
         nodes: nodes};
  
      // Compute the position for the children and decujus
  
      var decujus = data.main;
      childnodes.push(decujus);
      decujus.x = - boxWidth / 2;   // relative to centerX
      decujus.y = minDist + 5;      // relative to centerY
      decujus.w = boxWidth;
      decujus.h = boxHeight;
      decujus.fs = textHeight;
  
      var children = data.main.children;
      if (children && children.length) {
         var y = decujus.y;
         for (var c = 0; c < children.length; c++) {
            y += boxHeight + 5;
            childnodes.push(children[c]);
            children[c].x = decujus.x + 30;
            children[c].y = y;
            children[c].w = boxWidth;
            children[c].h = boxHeight;
            children[c].fs = textHeight;
         }
         box.height = Math.max(
               box.y + box.height,
               box.centerY + children[children.length - 1].y +
                  children[children.length - 1].h)
            - box.y;
      }
      return box;
   }

   // Size of separator between generations, when enabled
   layout.SEPARATOR_WIDTH = 8;

   layout.genThreshold = function() {
      return genThreshold;
   };

   return layout;
});

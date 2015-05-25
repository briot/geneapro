app.
config(function($stateProvider) {
   $stateProvider.
   state('pedigree', {
      url: '/pedigree?id',
      templateUrl: 'geneaprove/pedigree.html',

      // So that when we click on a person, we change the URL (and still had
      // it to the history), but not reload the controller, since otherwise
      // any animation in SVG would not occur. See $location.search(...)
      reloadOnSearch: false,
      controller: 'pedigreeCtrl'
   });
}).

controller('pedigreeCtrl', function($scope,  Pedigree, $state, $stateParams, contextMenu, $location, $rootScope) {
   // When the search parameter (id) changes, angularjs-ui-router will not
   // reload the page and create a new controller, so we monitor these
   // instead (that's on purpose so that we can have animation in the SVG).
   // This page might also be loaded without specifying an explicit person, in
   // which case we must reuse the current decujus.
   // We need to monitor the location, not the state, to handle Back and Forward
   $scope.$on('$locationChangeSuccess', function() {
      $scope.decujus = $location.search().id || $scope.decujus;
   });
   if ($stateParams.id !== undefined) {
       $scope.decujus = Number($stateParams.id);
   }

   /**
    * Support for the contextual menu
    */
   $scope.$on('contextMenuOpen', function() {
      $scope.contextual = contextMenu.data;
      $scope.$apply();  // update contents of the contextual menu
   });
   $scope.focusPerson = function() {
      var id = contextMenu.data.d.id;  // capture since menu will be destroyed
      $location.search('id', id);
   };
   $scope.showPerson = function() {
      $state.go('person', {id: contextMenu.data.d.id});
   };
  
}).

directive('gpPedigree', function(Pedigree, PedigreeLayout, $rootScope, gpd3, $location, contextMenu) {
   return {
      scope: {
         decujus: '=gpPedigree'
      },
      link: function(scope, element) {
         var set = $rootScope.settings.pedigree;

         // Watch the settings (in case we want to draw differently) and the
         // decujus (in case we want to display a different person).

         scope.$watch(
            function() { return [scope.decujus, $rootScope.settings]},
            function() {
               $rootScope.cleanupSettings();
               Pedigree.select(scope.decujus);
               Pedigree.get(set.gens, set.descendant_gens).then(function(data) {
                  render(data);
               });
            },
            true);

         var drawTexts = function() {};
         var group = gpd3.svg(
            element,
            function(currentScale) {  // onzoom
               // Use a maximal size for text, after which we start
               // displaying more information. Since we are adding and
               // removing elements, this makes the zoom slower though
               if (set.showDetails) {
                  drawTexts(currentScale);
               }
            });

         function linkY_(person) {
            if (set.colorScheme == gpd3.colorScheme.WHITE) {
               return person.y + person.fs;
            } else {
               return person.y + person.h / 2;
            }
         }

         /**
          * Assuming the data is fully loaded, draw the graphics
          * @param {Object}  data    as loaded from the server.
          */
         function render(data) {
            if (!data || !data.persons) {
               return;
            }

            group.attr('class', 'pedigree color-' + set.colorScheme);
            var layout = PedigreeLayout(data);
            var styles = gpd3.getStyles(group, layout.nodes, set, data);

            gpd3.setViewBox(element, layout);

            var durationForExit = 200;  // duration for exit() animation

            // Draw the lines
            var drawLinks = gpd3.linksDraw(set.linkStyle).linky(linkY_);
            var links = group.selectAll('path.link')
               .data(layout.links, function(d) { return d ? d[0].id + '-' + d[1].id : ''});
            links.exit()
               .transition()
               .duration(durationForExit)
               .style('opacity', 0)
               .remove();
            links.enter().append('path').classed('link', true)
               .style('opacity', 0)
            links
               .classed('link-' + set.linkStyle, true)
               .transition()
               .delay(durationForExit)
               .style('opacity', 1)
               .attr('d', drawLinks);

            if (set.colorScheme == gpd3.colorScheme.WHITE) {
               var selflines = '';
               angular.forEach(layout.nodes, function(node) {
                  selflines += 'M' + node.x + ' ' + linkY_(node) +
                               'h' + node.w;
               });
               group.append('path').attr('class', 'link').attr('d', selflines);
            }

            function contextmenu(d) {
               contextMenu.create(scope, '#contextMenu', d3.event, {d: d, element: this});
            }

            // Create the box for each person
            var persons = group
               .selectAll('g.person')
               .data(layout.nodes, function(d) { return d.id});
            var decujusbox = data.sosa[1];
            persons.exit()
               .transition()
               .duration(durationForExit)
               .style('opacity', 0)
               .remove(); // remove no-longer needed boxes
            var enter_g = persons.enter()          // add new boxes at correct position
               .append('g')
               .attr('class', 'person')
               .attr('transform', 'translate(' + decujusbox.x + ',' + decujusbox.y + ')')
               .on('contextmenu', contextmenu);
            enter_g.append('rect')
               .attr('width', 0)
               .attr('height', 0)
               .attr('rx', '6px')  // rounded rectangle
               .attr('ry', '6px');
            enter_g.append('clipPath')
               .attr('id', function(d) { return 'clip' + d.id})
               .append('rect')
               .attr('rx', '6px')  // rounded rectangle
               .attr('ry', '6px');

            persons.selectAll('g rect')
               .style('stroke', styles.strokeStyle)   // immediate change
               .style('fill', styles.fillStyle);      // immediate change

            persons
               .transition()
               .delay(durationForExit)
               .attr('transform',
                   function(d) {return 'translate(' + d.x + ',' + d.y + ')'});
            persons.selectAll('rect')  // including clipPath>rect
               .transition()
               .delay(durationForExit)
               .attr('width', function(d) {return d.w})
               .attr('height', function(d) {return d.h});

            drawTexts = function(currentScale) {
               // Prepare the lines of text for each person, depending on the size
               // allocated for that person. With the newly created text field,
               // we can then use d3's data() to easily create one <tspan> node
               // for each child.

               persons.selectAll('text').remove();

               angular.forEach(layout.nodes, function(node) {
                  var p = node;
                  node.text = [];
                  node.absFontSize = Math.min(node.fs, 20 / currentScale);
                  var linesCount = Math.floor(node.h / node.absFontSize);
                  if (linesCount < 1) {
                     return;
                  }

                  node.text.push(p.displayName());

                  var birth = p.event_to_string(p.birth);
                  var death = p.event_to_string(p.death);

                  if (!set.showDetails || linesCount < 4) {
                     node.text.push(birth + ' - ' + death);
                  } else {
                     if (birth) {
                        var place = p.birth ? p.birth.place : '';
                        node.text.push('b: ' + birth + (place ? ' - ' + place : ''));
                     }
                     if (death) {
                        var place = p.death ? p.death.place : '';
                        node.text.push('d: ' + death + (place ? ' - ' + place : ''));
                     }
                     if (node.text.length <= linesCount) {
                        var d = p.getDetails();
                        if (d) {
                           d.then(group.applyScale);
                        } else {
                           angular.forEach(p.details, function(d) {
                              if (node.text.length < linesCount) {
                                 node.text.push(d);
                              }
                           });
                        }
                     }
                  }
               });

               // Draw the text
               var tspan = persons.append('text')
                  .attr('clip-path', function(d) { return 'url(#clip' + d.id + ')'})
                  .attr('font-size', function(d) { return d.absFontSize; })
                  .attr('fill', styles.textStyle)
                  .selectAll('tspan')
                  .data(function(d) {return d.text})
                  .enter()
                  .append('tspan')
                  .attr('class', function(d, i) {return i == 0 ? 'name' : 'details'})
                  .attr('font-size', function(d, i) { return i == 0 ? '1em' : '0.8em'})
                  .attr('x', 5)
                  .text(function(line) { return line });
               if (set.colorScheme == gpd3.colorScheme.WHITE) {
                  tspan.attr('dy', function(d, i) {
                     return i == 0 ? '0.8em' : i == 1 ? '1.2em' : '1em'});
               } else {
                  tspan.attr('dy', function(d, i) { return i == 1 ? '1.2em' : '1em'});
               }

               // The marriage date for the parents
               if (set.showMarriages) {
                  var m = group.selectAll('text.marriage')
                     .data(layout.nodes, function(d) {return d.id});
                  m.exit().remove();
                  m.enter().append('text')
                     .attr('class', 'marriage')
                     .attr('dy', '0.4em');
                  m.text(function(d) {
                        return d.event_to_string(
                           data.marriage[2 * d.sosa])
                     })
                     .transition()
                     .delay(durationForExit)
                     .attr('font-size', function(d) { return d.parentsMarriageFS; })
                     .attr('x', function(d) { return d.parentsMarriageX})
                     .attr('y', function(d) { return linkY_(d)});
               } else {
                  group.selectAll('text.marriage').remove();
               }
            }

            group.applyScale(); // draw texts
            if (!set.showDetails) {
               drawTexts(1);
            }
         }
      }
   };
}).


/**
 * This function is a layout algorithm to display the PedigreeData as a
 * tree.
 */

factory('PedigreeLayout', function($rootScope, gpd3) {
   /**
    * @param {PedigreeData}  data    the data to display.
    * @return {{nodes,links}}
    *
    * On exit, nodes is an array of all the nodes to display. Such nodes are
    * the records for the persons (as found in the data parameter), augmented
    * with layout information. This layout information is:
    *     - x, y:     topleft corner for the box
    *     - w, h:     size of the rectangular box
    *     - fs:       size of the font in the box
    *     - parentsMarriageX:  position of the label for the parent's marriage
    *     - parentsMarriageFS: font size for that label
    */

   return function(data) {
      var settings = $rootScope.settings.pedigree;
      var nodes = [];  // list of node information
      var same = settings.sameSize;

      // Size ratio from generation n to n+1, until maxGenForRatio
      var ratio = (same ? 1.0 : 0.75);

      // Width ratio from generation n to n+1, until maxGenForRatio
      var wratio = ratio;

      // size of the boxes at generation 1
      var boxWidth = (same ? 200 : 300);
      var boxHeight = 60;

      // Maximum fontSize (in pixels). After this, we start displaying more
      // information, rather than increase the font size
      var maxFontSize = 20;

      // Actual height of a line of text at generation 1
      var textHeight = 20;

      // Maximum generation for which we apply ratios. Later generations will
      // all have the same size.
      // Keep reducing until we reach 10% of the original size
      var maxGenForRatio = (same ? 0 : Math.log(0.1) / Math.log(ratio));

      var addedToNodes = {}; // which items were added to the nodes array

      /** Store display info for a person
       * @param {Person} indiv  The person.
       * @param {number} y      Her vertical coordinate.
       * @param {number=} h     The size of the box.
       */
      function setupIndivBox(indiv, y, h) {
         if (indiv) {
            var g = Math.abs(indiv.generation);
            h = h || heights[g];

            if (!addedToNodes[indiv.id]) {
               nodes.push(indiv);
               addedToNodes[indiv.id] = true;
            }

            indiv.x = left[indiv.generation];
            indiv.y = y;
            indiv.w = widths[g];
            indiv.h = h;
            indiv.fs = fs[g];
            indiv.parentsMarriageX = left[g + 1] - 4;
            indiv.parentsMarriageFS =
               (g + 1 == maxgen - 1 ?
                  Math.min(fs[g + 1], settings.vertPadding) : fs[g + 1]);
         }
      }

      var left = [];    //  left coordinate for each generation
      var heights = []; //  box height for each generation
      var widths = [];  //  box width for each generation
      var fs = [];      //  fontSize for each generation

      // Compute sizes for each generation
      heights[0] = heights[-1] = boxHeight;
      fs[0] = fs[-1] = textHeight * ratio;
      widths[0] = widths[-1] = boxWidth;

      var padding = settings.horizPadding;
      var paddings = [];
      paddings[0] = padding;
      var maxgen = Math.max(settings.gens, settings.descendant_gens);
      for (var gen = 1; gen <= maxgen + 1; gen++) {
         if (gen <= maxGenForRatio) {
            heights[gen] = heights[gen - 1] * ratio;
            widths[gen] = widths[gen - 1] * wratio;
            fs[gen] = Math.round(
                Math.min(maxFontSize, fs[gen - 1] * ratio));
            if (gen < maxGenForRatio) {
                padding = padding * wratio;
            }
            paddings[gen] = padding;
         } else {
            heights[gen] = heights[gen - 1];
            widths[gen] = widths[gen - 1];
            fs[gen] = fs[gen - 1];
            paddings[gen] = paddings[gen - 1];
         }
      }

      // X coordinates are computed once we know the sizes. Left-most coordinate
      // is always 0
      left[-settings.descendant_gens] = 0;
      for (var gen = -settings.descendant_gens + 1; gen <= settings.gens + 1; gen++) {
         left[gen] = left[gen - 1] +
            widths[Math.abs(gen - 1)] + paddings[Math.abs(gen)];
      }

      var minX = left[0];
      var minY = 0;
      var maxY = 0;

      switch (settings.layoutScheme) {
      case gpd3.layoutScheme.EXPANDED:
         function doLayoutExpand(gen, sosa) {
            if (gen < settings.gens) {
               var fy = doLayoutExpand(gen + 1, 2 * sosa);
               var my = doLayoutExpand(gen + 1, 2 * sosa + 1);
               var y = (fy + my + heights[gen + 1] - heights[gen]) / 2;
            } else {
               y = maxY + settings.vertPadding;
            }
            maxY = Math.max(maxY, y + heights[gen]);
            if (data.sosa[sosa]) {
               setupIndivBox(data.sosa[sosa], y);
            }
            return y;
         }
         doLayoutExpand(0, 1);
         break;

      case gpd3.layoutScheme.COMPACT:
         // For the last generation, place each boxes as close as possible.
         // Then when we add the previous generation, we might move some of
         // the boxes from the previous generation downward to make space for
         // persons with no ancestors.

         function doLayoutCompact(indiv) {
            var gen = indiv.generation;
            if (gen < settings.gens) {
               var father = data.sosa[2 * indiv.sosa];
               var mother = data.sosa[2 * indiv.sosa + 1];
            } else {
               father = mother = undefined;
            }
            if (father && mother) {
               doLayoutCompact(father);
               doLayoutCompact(mother);
               // center the box on its parents
               var y = (father.y + mother.y + heights[gen + 1] -
                  heights[gen]) / 2;
               var h =
                  (settings.colorScheme == gpd3.colorScheme.WHITE) ?
                  mother.y + heights[gen + 1] - y : undefined;
               setupIndivBox(indiv, y, h);

            } else if (father || mother) {
               // center on the existing parent
               var p = (father || mother);
               doLayoutCompact(p);
               var y = p.y + (heights[gen + 1] - heights[gen]) / 2;
               var h =
                   (settings.colorScheme == gpd3.colorScheme.WHITE) ?
                   p.y + heights[gen + 1] - y : undefined;
               setupIndivBox(indiv, y, h);

            } else {
               var y = maxY + settings.vertPadding;
               setupIndivBox(indiv, y, heights[gen]);
            }
            maxY = Math.max(maxY, y + indiv.h);
         }
         doLayoutCompact(data.sosa[1]);
         break;
      }

      // For children, the COMPACT and EXPANDED modes are the same since we
      // can't know the theoritical number of children.

      function doLayoutChildren(indiv) {
         var gen = Math.abs(indiv.generation);

         if (gen < settings.descendant_gens) {
            var nextGen = indiv.children || [];
         } else {
            nextGen = [];
         }

         if (nextGen.length == 0) {
            var y = maxChildY + settings.vertPadding;
            setupIndivBox(indiv, y, heights[gen]);
         } else {
            var first = undefined;
            var last = undefined;
            for (var n = 0; n < nextGen.length; n++) {
               if (nextGen[n]) {
                  doLayoutChildren(nextGen[n]);
                  if (first === undefined) {
                     first = n;
                  }
                  last = n;
               }
            }
            // Center the box on the next gen's boxes
            var y = (nextGen[first].y +
                     nextGen[last].y + nextGen[last].h -
                     heights[gen]) / 2;

            // In some modes, we leave as much height as possible to the box
            var h = (settings.colorScheme == gpd3.colorScheme.WHITE) ?
               nextGen[last].y + nextGen[last].h - y : undefined;
            setupIndivBox(indiv, y, h);
         }
         maxChildY = Math.max(maxChildY, y + indiv.h);
         minX = Math.min(minX, indiv.x);
      }

      // We'll need to adjust the offsets so that the coordinates of decujus
      // computed after parent and children layouts match
      var yAfterParent = data.sosa[1].y;
      var maxChildY = 0;
      doLayoutChildren(data.sosa[1]);

      // Apply the offset (to the children, since in general we will have more
      // ancestors displayed). At this point, we know the parents extend from
      // minY..maxY, so we adjust minY and maxY as needed
      var offset = yAfterParent - data.sosa[1].y;
      function doOffsetChildren(indiv) {
         indiv.y += offset;
         minY = Math.min(minY, indiv.y);
         maxY = Math.max(maxY, indiv.y + indiv.h);
         if (Math.abs(indiv.generation) < settings.descendant_gens) {
            var children = indiv.children || [];
            for (var n = 0; n < children.length; n++) {
               if (children[n]) {
                  doOffsetChildren(children[n]);
               }
            }
         }
      }
      doOffsetChildren(data.sosa[1]);

      // Compute the links
      var links = [];
      angular.forEach(nodes, function(node) {
         if (node.sosa <= 0) {
            links.push([node, node.parent_]);
         } else {
            var father = data.sosa[2 * node.sosa];
            if (father) {
               links.push([node, father]);
            }
            var mother = data.sosa[2 * node.sosa + 1];
            if (mother) {
               links.push([node, mother]);
            }
         }
      });

      return {
         nodes: nodes,
         links: links,
         x: minX,
         y: minY,
         width: left[settings.gens + 1] - minX,
         height: maxY - minY
      };
   };
});

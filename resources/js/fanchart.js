const PI_HALF = Math.PI / 2;
const PI_TWO = Math.PI * 2;

app.
config(function($stateProvider) {
   $stateProvider.
   state('fanchart', {
      url: '/fanchart?id',
      templateUrl: 'geneaprove/fanchart.html',
      reloadOnSearch: false,  // See pedigree.js
      controller: 'fanchartCtrl',
      data: {
         pageTitle: '[Genaprove] Fanchar for person {{id}}'
      }
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
      const mdata = contextMenu.data;
      const d = mdata.d;
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
      const mdata = contextMenu.data;
      const id = mdata.d.id;  // capture since menu will be destroyed
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
         const set = $rootScope.settings.fanchart;
         const group = gpd3.svg(element).append('g');

         // Generation at which we stop displaying names
         const textThreshold = 8;
         let spaceBetweenGenerations = 0;

         //  The paths for the sectors (with background colors)
         const arc = d3.svg.arc()
            .startAngle(d => d.minAngle)
            .endAngle(d => d.maxAngle)
            .innerRadius(d => d.minRadius)
            .outerRadius(d => d.maxRadius);

         //  The paths for the names of persons
         function arcText(d) {
            // Along an arc
            if (d.generation < FanchartLayout.genThreshold()) {
               // minAngle are set such that
               //                0
               //   -pi/2                  pi/2
               //
               // So we convert it (in m and M) to the usual math notations:
               //    mathAngle = PI/2 - minAngle
               // Since the screen is oriented upside-down compared to the
               // usual math notation, we take the opposite:
               //    angle = minAngle - PI/2

               const r = (d.minRadius + d.maxRadius) / 2;
               let m = d.minAngle - PI_HALF;
               let M = d.maxAngle - PI_HALF;
               const med = math.standardAngle((m + M) / 2);
               let sweep = 1;
               if (set.readableNames && med >= 0 && med <= Math.PI) {
                  [m, M] = [M, m];
                  sweep = 0
               }
               return 'M' + r * Math.cos(m) + ' ' + r * Math.sin(m) +
                  'A' + r + ',' + r +   /* rx ry */
                  ' 0 0 ' +  // x-axis-rotation large-arc-flag sweep-flag
                  sweep + ' ' +
                  r * Math.cos(M) + ' ' + r * Math.sin(M);

            // rotated
            } else {
               const a = math.standardAngle((d.minAngle + d.maxAngle) / 2 - PI_HALF);
               let r = d.minRadius;
               let R = d.maxRadius;
               if (set.readableNames && (a < -PI_HALF || a > PI_HALF)) {
                  r = d.maxRadius;
                  R = d.minRadius;
               }
               const ca = Math.cos(a);
               const sa = Math.sin(a);
               return 'M' + r * ca + ' ' + r * sa +
                      'L' + R * ca + ' ' + R * sa;
            }
         }

         //  The paths for the separators between generations
         const arcSeparator = d3.svg.arc()
            .startAngle(d => d.minAngle)
            .endAngle(d => d.maxAngle)
            .innerRadius(d => d.maxRadius)
            .outerRadius(d => d.maxRadius + spaceBetweenGenerations);

         //  The paths for the marriages
         function arcMarriage(d) {
            if (d.generation >= set.gens || d.generation >= textThreshold - 1) {
               return '';
            }
            let r = d.maxRadius + spaceBetweenGenerations / 2;
            let m = d.minAngle - PI_HALF;
            let M = d.maxAngle - PI_HALF;
            const med = math.standardAngle((m + M) / 2);
            let sweep = 1;
            if (set.readableNames && med >= 0 && med <= Math.PI) {
               [m ,M] = [M, m];
               sweep = 0;
               r = r + 2;
            } else {
               r = r - 2;
            }
            return 'M' + r * Math.cos(m) + ' ' + r * Math.sin(m) +
               'A' + r + ',' + r +   /* rx ry */
               ' 0 0 ' +  // x-axis-rotation large-arc-flag sweep-flag
               sweep + ' ' +
               r * Math.cos(M) + ' ' + r * Math.sin(M);
         }

         scope.$watch(
            function() { return [scope.decujus, $rootScope.settings]},
            function() {
               $rootScope.cleanupSettings();
               Pedigree.select(scope.decujus);
               Pedigree.get(set.gens, 1, true /* year_only */).then(function(data) {
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
            spaceBetweenGenerations =
               (set.colorScheme == gpd3.colorScheme.QUARTILE ||
                set.showMarriages) ?
                FanchartLayout.SEPARATOR_WIDTH : 0;

            const layout = FanchartLayout(data, spaceBetweenGenerations);
            const styles = gpd3.getStyles(
                  group, layout.nodes, set, data,
                  false /* preserve */,
                  true /* isRadial */);

            group.attr({
               class: `fanchart color-${set.colorScheme}`,
               transform: `translate(${layout.centerX},${layout.centerY})`});

            // Handling of contextual menu
            function contextmenu(d) {
               contextMenu.create(
                     scope, '#contextMenu', d3.event,
                     {element: this,
                      d: d,       // info on specific person
                      data: data, // full pedigree info
                      render: render});  // function to redraw
            }

            // Add new groups for the persons

            const persons = group
               .selectAll('g.person')
               .data(layout.nodes, d => d.id);
            persons.exit().remove();
            const persons_enter_g = persons.enter()
               .append('g')
               .attr('class', 'person')
               .on('contextmenu', contextmenu);

            //  Draw the background for persons

            persons_enter_g  // enter
               .append('path')
               .attr('class', 'background');
            persons         // enter+update
               .selectAll('path.background')
               .attr({
                  stroke: styles.strokeStyle,
                  fill:   styles.fillStyle})
               .transition()
                  .duration(800)
                  .attr('d', arc);

            //  Draw the names for persons
            //  We must add a new text/textPath/tspan for each element if we
            //  want them all to be horizontally centered, since setting a 'x'
            //  property on a <tspan> makes it ignore its 'text-anchor'

            function setText(selection, dy, className, text) {
               selection
                  .append('text')
                  .append('textPath')
                  .attr({
                     'startOffset': '50%',
                     'text-anchor': 'middle',
                     'xlink:href': d => `#text${d.id}`})
                  .append('tspan')
                  .attr({dy: dy, 'class': className})
                  .text(text);
            }

            const p = persons_enter_g.filter(d => d.generation < textThreshold)
            p.append('path')   // subset of enter
               .attr({
                  class: 'name',
                  fill: 'none',
                  id: d => `text${d.id}`});
            persons.selectAll('path.name')   // enter+update
               .transition()
               .duration(800)
               .attr('d', arcText);
            setText(p, '-0.5em', 'name', d => d.surn);
            setText(p, '0.5em', 'name', d => d.givn);
            setText(p, '1.5em', 'details', null);

            // Always update events text to show the source info (or not)
            persons.selectAll('tspan.details')  // enter+update
               .text(p => {
                   const b = data.event_to_string(p.birth, true /* use_date_sort */);
                   const d = data.event_to_string(p.death, true /* use_date_sort */);
                   return `${b} - ${d}`});

            // The space between generations might be displays specially in
            // some cases (as a gradient in the Quartile case, for instance)

            persons.selectAll('path.separator').remove();
            if (spaceBetweenGenerations && styles.separatorStyle) {
               persons.append('path')
                  .attr({
                     class: 'separator',
                     stroke: '#ccc',
                     fill: styles.separatorStyle,
                     d: arcSeparator});
            }

            // Show the marriages

            if (set.showMarriages) {
               persons_enter_g  // enter
                  .filter(d => d.generation < textThreshold - 1)
                  .append('path')
                  .attr({
                     class: 'marriagePath',
                     fill: 'none',
                     id: d => `textMarriage${d.id}`});

               persons.selectAll('path.marriagePath')  // enter + update
                  .transition()
                  .duration(800)
                  .attr('d', arcMarriage)

               persons_enter_g  // enter
                  .filter(d => d.generation < set.gens && d.generation < textThreshold - 1)
                  .append('text')
                  .attr('class', 'marriage')
                  .append('textPath')
                  .attr({
                     startOffset: '50%',
                     'text-anchor': 'middle',
                     'xlink:href': d => `#textMarriage${d.id}`})
                  .text(d => data.event_to_string(d.marriage));
            }

            // Show the children
            const styles2 = gpd3.getStyles(
                  group, layout.childnodes, set, data, true /* preserve */);
            const children = group
               .selectAll('g.child')
               .data(layout.childnodes, d => d.id);
            children.exit().remove();
            const g = children.enter()
               .append('g')
               .attr('class', 'child');
            g.append('rect')
               .attr('rx', '6px')
               .attr('ry', '6px')
               .attr('width', d => d.w)
               .attr('height', d => d.h);
            children.selectAll('rect')
               .attr('fill', styles2.fillStyle)
               .attr('stroke', styles2.strokeStyle);
            g.append('text')
               .attr('x', 5)
               .attr('y', '1em')
               .text(data.displayName);
            children
               .attr('transform', d => `translate(${d.x},${d.y})`)
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
   const genThreshold = 4;

   /**
    * Compute a fanchart layout.
    * @param (Number) extraSep  extra amount of separation between generations
    */
   function layout(data, extraSep) {
      const settings = $rootScope.settings.fanchart;
      const rowHeight = 60;  //  height for a generation in the fanchart

      // row height for generations after genThreshold
      const rowHeightAfterThreshold = 100;

      // Extra blank space between layer rings. This is used to display
      // marriage information.
      const sepBetweenGens = Math.max(
         extraSep || 0,
         settings.showMarriages ? layout.SEPARATOR_WIDTH : 0);

      // Height of the inner white circle
      const innerCircle = 20;

      // Start and end angles in radians. Clockwise starting from the usual
      // 0 angle
      const maxAngle = settings.angle * PI_HALF / 180 - Math.PI / 2;
      const minAngle = -maxAngle - Math.PI;

      // Separator (in radians) between couples. Setting this to 0.5 or more
      // will visually separate the couples at each generation.
      const separator = settings.space * PI_HALF / 900;

      // Size of boxes for children
      const boxWidth = 100;
      const boxHeight = 30;

      // Base size for the text
      const textHeight = 20;

      // Compute the radius for each generation
      let minRadius = [0];
      let maxRadius = [innerCircle];
      let fs = [textHeight];
      for (let gen = 1; gen <= settings.gens; gen++) {
         const m = maxRadius[gen - 1] + ((gen == 1) ? 0 : sepBetweenGens);
         fs.push(fs[gen - 1] * 0.9);
         minRadius.push(m);
         maxRadius.push(
            m + (gen < genThreshold ?  rowHeight : rowHeightAfterThreshold));
      }

      let addedToNodes = {};
      let nodes = [];
      let childnodes = [];
      function addToNodes(p) {
         if (p.sosa != 1 && !addedToNodes[p.id]) {
            addedToNodes[p.id] = true;
            nodes.push(p);
         }
      }

      // Compute the bounding box for the fan itself, as if it was
      // centered on (0, 0).
      let minX = 0;
      let minY = 0;
      let maxX = 0;
      let maxY = 0;

      /** Register the layout information for a given individual
       *  ??? We should also check at each of the North,West,South,East
       *  points, since these can also intersect the bounding box. We
       *  need to check whether any of these is within the arc though.
       *  @param {Person} indiv   The person.
       *  @param {number} minAngle   start angle.
       *  @param {number} maxAngle   end angle.
       */
      function setupIndivBox(indiv, minAngle, maxAngle) {
         const maxR = maxRadius[indiv.generation];
         const x1 = maxR * Math.cos(minAngle);
         const y1 = maxR * Math.sin(minAngle);
         const x2 = maxR * Math.cos(maxAngle);
         const y2 = maxR * Math.sin(maxAngle);
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
            const father = indiv.parents[0];
            const mother = indiv.parents[1];
            let half;

            if (father && mother) {
               if (father.$expand) {
                  half = minAngle + (maxAngle - minAngle) * 0.95;
               } else if (mother.$expand) {
                  half = minAngle + (maxAngle - minAngle) * 0.05;
               } else {
                  half = (minAngle + maxAngle) / 2;
               }
               doLayout(
                  father, minAngle, half - separator / 2, separator / 2);
               doLayout(
                  mother, half + separator / 2, maxAngle, separator / 2);
            } else if (father) {
               const tenth = minAngle + maxAngle * 0.95;
               doLayout(
                     father, minAngle, tenth - separator / 2, separator / 2);
            } else if (mother) {
               const tenth = minAngle + maxAngle * 0.05;
               doLayout(
                     mother, tenth + separator / 2, maxAngle, separator / 2);
            }
         }
      }
      doLayout(data.main, minAngle + separator / 2,
               maxAngle - separator / 2, separator);

      const height = maxY - minY;

      // The space there should be below centerY so that the fanchart
      // does not hide the decujus box partially.

      const angle = PI_TWO - (maxAngle - minAngle);
      let minDist;  // distance between left side of decujus box and fan center
      if (angle >= Math.PI) {
         // Fanchart occupies less than a half circle
         minDist = 0;
      } else if (angle <= Math.PI / 6) {
         minDist = height / 2; // fullCircle
      } else {
         minDist = boxWidth / 2 / Math.tan(angle / 2);
      }
      const box = {
         x: minX,
         y: minY,
         centerX: 0,
         centerY: 0,
         width: maxX - minX,
         height: height,
         childnodes: childnodes,
         nodes: nodes};

      // Compute the position for the children and decujus

      const decujus = data.main;
      childnodes.push(decujus);
      decujus.x = - boxWidth / 2;   // relative to centerX
      decujus.y = minDist + 5;      // relative to centerY
      decujus.w = boxWidth;
      decujus.h = boxHeight;
      decujus.fs = textHeight;

      const children = data.main.children;
      if (children && children.length) {
         let y = decujus.y;
         for (let c = 0; c < children.length; c++) {
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

app.
config(function($stateProvider) {
   $stateProvider.
   state('radial', {
      url: '/radial?id',
      templateUrl: 'geneaprove/radial.html',

      // So that when we click on a person, we change the URL (and still had
      // it to the history), but not reload the controller, since otherwise
      // any animation in SVG would not occur. See $location.search(...)
      reloadOnSearch: false,
      controller: 'radialCtrl',
      data: {
         pageTitle: '[Genaprove] Fan chart for person {{id}}'
      }
   });
}).

controller('radialCtrl', function($scope,  Pedigree, $state, $stateParams, contextMenu, $location, $rootScope) {
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
      const id = contextMenu.data.d.id;  // capture since menu will be destroyed
      $location.search('id', id);
   };
   $scope.showPerson = function() {
      $state.go('person', {id: contextMenu.data.d.id});
   };

}).

directive('gpRadial', function(Pedigree, $rootScope, gpd3, $location, contextMenu) {
   return {
      scope: {
         decujus: '=gpRadial'
      },
      link: function(scope, element) {
         const set = $rootScope.settings.radial;

         // Watch the settings (in case we want to draw differently) and the
         // decujus (in case we want to display a different person).

         scope.$watch(
            function() { return [scope.decujus, $rootScope.settings]},
            function() {
               $rootScope.cleanupSettings();
               Pedigree.select(scope.decujus);
               Pedigree.get(set.gens > 0 ? set.gens : 0,
                            set.gens < 0 ? -set.gens : 0).then(render);
            },
            true);

         const group = gpd3.svg(element);

         /**
          * Assuming the data is fully loaded, draw the graphics
          * @param {Object}  data    as loaded from the server.
          */
         function render(data) {
            if (!data) {
               return;
            }
            group.attr('class', 'radial color-' + set.colorScheme);

            const circleSize = 10;  // diameter of the circles
            // We are displaying gens*2+1 generations, and leave space
            // between two circles equal to 5 times the size of a circle.
            const diameter = (Math.abs(set.gens) * 2 + 1) * (circleSize * 6);

            gpd3.setViewBox(element, {x: 0, y: 0, width: diameter, height: diameter});

            const tree = d3.layout.tree()
                .size([360, diameter / 2 - 120])
                .children(d => {
                   let result = [];
                   let base;

                   if (set.gens > 0) {
                      // Ancestor tree
                      if (d.generation > set.gens) {
                         return result;
                      }
                      base = d.parents;
                   } else {
                      // Descendants tree
                      if (d.generation < set.gens) {
                         return result;
                      }
                      base = d.children;
                   }

                   angular.forEach(base, function(p) {
                      if (p) {
                         result.push(p);
                      }
                   });
                   return result;
                })
                .separation(function(p1, p2) {
                   return (p1.parent == p2.parent ? 1 : 2) /* / p1.depth */ });

            const diagonal = d3.svg.diagonal.radial()
                .projection(function(d) { return [d.y, d.x / 180 * Math.PI]});

            d3.select(element[0]).select('svg')
                .attr("width", diameter)
                .attr("height", diameter - 150);

            const nodes = tree.nodes(data.main);
            const links = tree.links(nodes);
            const styles = gpd3.getStyles(group, nodes, set, data);

            const link = group.selectAll(".link").data(links);
            link.exit().remove();
            link.enter().insert("path", ':first-child').attr("class", "link");
            link.attr("d", diagonal);

            group.selectAll('.node').remove();

            const node = group.selectAll(".node")
               // There can be multiple nodes with the same id (implex)
               .data(nodes);

            const n = node.enter().append("g").attr("class", "node")
               .on('contextmenu', function(d) {
                  contextMenu.create(
                     scope, '#contextMenu', d3.event, {d: d, element: this});
               });
            node.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; });

            node.select('circle').remove();
            node.append("circle").attr("r", circleSize)
               .style('stroke', styles.strokeStyle)
               .style('fill', styles.fillStyle)
               .attr('title', function(p) { return data.displayName(p)});

            node.select('text').remove();
            if (set.showText) {
               node.append("text")
                .attr("dy", ".31em")
                .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
                .attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })
                .text(function(d) { return d.surn; });
            }

            group.setTranslate(diameter / 2, diameter / 2).applyScale(1);
         }
      }
   };
});

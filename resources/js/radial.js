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
      controller: 'radialCtrl'
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
      var id = contextMenu.data.d.id;  // capture since menu will be destroyed
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
         var set = $rootScope.settings.radial;

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

         var group = gpd3.svg(element);

         /**
          * Assuming the data is fully loaded, draw the graphics
          * @param {Object}  data    as loaded from the server.
          */
         function render(data) {
            if (!data) {
               return;
            }
            group.attr('class', 'radial color-' + set.colorScheme);

            var diameter = 960;
            var tree = d3.layout.tree()
                .size([360, diameter / 2 - 120])
                .children(function(d) {
                   var result = [];

                   if (set.gens > 0) {
                      // Ancestor tree
                      if (d.generation > set.gens) {
                         return result;
                      }
                      var base = d.parents;
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
                   return (p1.parent == p2.parent ? 1 : 2) / p1.depth });
            
            var diagonal = d3.svg.diagonal.radial()
                .projection(function(d) { return [d.y, d.x / 180 * Math.PI]});
            
            d3.select(element[0]).select('svg')
                .attr("width", diameter)
                .attr("height", diameter - 150);

            var nodes = tree.nodes(data.main);
            var links = tree.links(nodes);
            var styles = gpd3.getStyles(group, nodes, set, data);

            var link = group.selectAll(".link").data(links);
            link.exit().remove();
            link.enter().append("path").attr("class", "link");
            link.attr("d", diagonal);
            
            var node = group.selectAll(".node")
               .data(nodes, function(p) { return p.id});
            node.exit().remove();

            var n = node.enter().append("g").attr("class", "node");
            node.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; });

            node.select('circle').remove();
            node.append("circle").attr("r", 4.5)
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
            
            group.setTranslate(diameter / 2, diameter / 2).applyScale();
         }
      }
   };
});

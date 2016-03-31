import {} from 'angular';
import {} from 'angular-ui-router';
import * as d3 from 'd3';
import {app} from './app';
import {IPerson, IRectangle, colorScheme, layoutScheme,
   IGPRootScope} from './basetypes';
import {GPd3Service, LayoutInfo} from './gpd3';
import {PedigreeService} from './pedigree.service';
import {ContextMenu} from './contextmenu';

const html = require('geneaprove/pedigree.html');

app.config(($stateProvider : angular.ui.IStateProvider) => {
   $stateProvider.
   state('pedigree', {
      url: '/pedigree?id',
      templateUrl: html,

      // So that when we click on a person, we change the URL (and still had
      // it to the history), but not reload the controller, since otherwise
      // any animation in SVG would not occur. See $location.search(...)
      reloadOnSearch: false,
      controller: 'pedigreeCtrl',
      data: {
         pageTitle: '[Genaprove] Pedigree for person {{id}}'
      }
   });
});

interface IPedigreePersonLayout extends LayoutInfo {
   p : IPerson;

   x ?: number;
   y ?: number;
   w ?: number;
   h ?: number;
   fs ?: number;  // font siez
   parentsMarriageX  ?: number;  // where to display parent's marriage
   parentsMarriageFS ?: number;  // font size for parent's marriage

   absFontSize ?: number;
   text ?: string[];   // lines of text to display
}

type IPedigreePersonPair = [IPedigreePersonLayout, IPedigreePersonLayout];
interface IPedigreeLayout extends IRectangle {
   x      : number;
   y      : number;
   width  : number;
   height : number;
   nodes  : IPedigreePersonLayout[];  // list of node information
   pnodes : { [id: number]: IPedigreePersonLayout};  // map a person to its layout
   links  : IPedigreePersonPair[];
}


/**
 * This function is a layout algorithm to display the PedigreeData as a
 * tree.
 */

class PedigreeLayoutService {

   // size of the boxes at generation 1
   boxHeight = 60;

   // Maximum fontSize (in pixels). After this, we start displaying more
   // information, rather than increase the font size
   maxFontSize = 20;

   // Actual height of a line of text at generation 1
   textHeight = 20;

   $inject = ['$rootScope', 'GPd3'];
   constructor(public $rootScope : IGPRootScope, private GPd3 : GPd3Service) {
   }

   /**
    * On exit, nodes is an array of all the nodes to display. Such nodes are
    * the records for the persons (as found in the data parameter), augmented
    * with layout information. This layout information is:
    *     - x, y:     topleft corner for the box
    *     - w, h:     size of the rectangular box
    *     - fs:       size of the font in the box
    *     - parentsMarriageX:  position of the label for the parent's marriage
    *     - parentsMarriageFS: font size for that label
    */
   compute(data : PedigreeService) {
      const settings = this.$rootScope.settings.pedigree;
      const same = settings.sameSize;
      const boxWidth = (same ? 200 : 300);

       // Size ratio from generation n to n+1, until maxGenForRatio
      const ratio = (same ? 1.0 : 0.75);

      // Width ratio from generation n to n+1, until maxGenForRatio
      const wratio = ratio;

      // Maximum generation for which we apply ratios. Later generations will
      // all have the same size.
      // Keep reducing until we reach 10% of the original size
      const maxGenForRatio = (same ? 0 : Math.log(0.1) / Math.log(ratio));

      let result : IPedigreeLayout = {
         x : 0,
         y : 0,
         width: 0,
         height: 0,
         nodes: [],
         pnodes: {},
         links: []
      };

      /** Store display info for a person
       * @param indiv  The person.
       * @param y      Her vertical coordinate.
       * @param h      The size of the box.
       */
      function setupIndivBox(p : IPerson, y : number, h : number = 0) {
         if (!p) {
            return undefined;
         }
         const g = Math.abs(p.generation);
         let l = result.pnodes[p.id]
         if (!l) {
            l = {
               p  : p,
               x  : left[p.generation],
               w  : widths[g],
               fs : fs[g],
               parentsMarriageX  : left[g + 1] - 4,
               parentsMarriageFS :
                  (g + 1 == maxgen - 1 ?
                     Math.min(fs[g + 1], settings.vertPadding) : fs[g + 1])
            };
            result.nodes.push(l);
            result.pnodes[p.id] = l;
         }

         // Always change coordinates
         l.y  = y;
         l.h  = h || heights[g];

         return l;
      }

      let left = <number[]> [];    //  left coordinate for each generation
      let heights = <number[]> []; //  box height for each generation
      let widths = <number[]> [];  //  box width for each generation
      let fs = <number[]> [];      //  fontSize for each generation

      // Compute sizes for each generation
      heights[0] = heights[-1] = this.boxHeight;
      fs[0] = fs[-1] = this.textHeight * ratio;
      widths[0] = widths[-1] = boxWidth;

      let padding = settings.horizPadding;
      let paddings = <number[]> [];
      paddings[0] = padding;
      const maxgen = Math.max(settings.gens, settings.descendant_gens);
      for (let gen = 1; gen <= maxgen + 1; gen++) {
         if (gen <= maxGenForRatio) {
            heights[gen] = heights[gen - 1] * ratio;
            widths[gen] = widths[gen - 1] * wratio;
            fs[gen] = Math.round(
                Math.min(this.maxFontSize, fs[gen - 1] * ratio));
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

      // X coordinates are computed once we know the sizes. Left-most
      // coordinate is always 0
      left[-settings.descendant_gens] = 0;
      for (let gen = -settings.descendant_gens + 1;
               gen <= settings.gens + 1; gen++)
      {
         left[gen] = left[gen - 1] +
            widths[Math.abs(gen - 1)] + paddings[Math.abs(gen)];
      }

      let minX = left[0];
      let minY = 0;
      let maxY = 0;
      let main_layout : IPedigreePersonLayout;  // layout for decujus

      switch (settings.layoutScheme) {
      case layoutScheme.EXPANDED:
         function doLayoutExpand(gen : number, p : IPerson) {
            let y : number;
            if (gen < settings.gens && p.parents) {
               const fy = doLayoutExpand(gen + 1, p.parents[0]).y;
               const my = doLayoutExpand(gen + 1, p.parents[1]).y;
               y = (fy + my + heights[gen + 1] - heights[gen]) / 2;
            } else {
               y = maxY + settings.vertPadding;
            }
            maxY = Math.max(maxY, y + heights[gen]);
            return setupIndivBox(p, y);
         }
         main_layout = doLayoutExpand(0, data.main);
         break;

      case layoutScheme.COMPACT:
         // For the last generation, place each boxes as close as possible.
         // Then when we add the previous generation, we might move some of
         // the boxes from the previous generation downward to make space for
         // persons with no ancestors.

         function doLayoutCompact(indiv : IPerson) {
            const gen = indiv.generation;
            let father : IPerson;
            let mother : IPerson;
            let y : number;
            let indiv_layout : IPedigreePersonLayout;

            if (gen < settings.gens) {
               father = indiv.parents[0];
               mother = indiv.parents[1];
            } else {
               father = mother = undefined;
            }
            if (father && mother) {
               let f = doLayoutCompact(father);
               let m = doLayoutCompact(mother);

               // center the box on its parents
               y = (f.y + m.y + heights[gen + 1] - heights[gen]) / 2;
               const h =
                  (settings.colorScheme == colorScheme.WHITE) ?
                  m.y + heights[gen + 1] - y : undefined;
               indiv_layout = setupIndivBox(indiv, y, h);

            } else if (father || mother) {
               // center on the existing parent
               const p = (father || mother);
               doLayoutCompact(p);
               const m = result.pnodes[p.id];
               y = m.y + (heights[gen + 1] - heights[gen]) / 2;
               const h =
                   (settings.colorScheme == colorScheme.WHITE) ?
                   m.y + heights[gen + 1] - y : undefined;
               indiv_layout = setupIndivBox(indiv, y, h);

            } else {
               y = maxY + settings.vertPadding;
               indiv_layout = setupIndivBox(indiv, y, heights[gen]);
            }
            maxY = Math.max(maxY, y + indiv_layout.h);
            return indiv_layout;
         }
         main_layout = doLayoutCompact(data.main);
         break;
      }

      // For children, the COMPACT and EXPANDED modes are the same since we
      // can't know the theoritical number of children.

      function doLayoutChildren(indiv : IPerson) {
         const gen = Math.abs(indiv.generation);
         const nextGen = (
            gen < settings.descendant_gens
            ? indiv.children || []
            : []);
         let y : number;
         let indiv_layout : IPedigreePersonLayout;

         if (nextGen.length == 0) {
            y = maxChildY + settings.vertPadding;
            indiv_layout = setupIndivBox(indiv, y, heights[gen]);
         } else {
            let first = <number> undefined;
            let last = <number> undefined;
            for (let n = 0; n < nextGen.length; n++) {
               if (nextGen[n]) {
                  doLayoutChildren(nextGen[n]);
                  if (first === undefined) {
                     first = n;
                  }
                  last = n;
               }
            }
            // Center the box on the next gen's boxes
            var first_parent_layout = result.pnodes[nextGen[first].id];
            var last_parent_layout = result.pnodes[nextGen[last].id];

            y = (first_parent_layout.y +
                 last_parent_layout.y + last_parent_layout.h -
                 heights[gen]) / 2;

            // In some modes, we leave as much height as possible to the box
            const h = (settings.colorScheme == colorScheme.WHITE) ?
               last_parent_layout.y + last_parent_layout.h - y : undefined;
            indiv_layout = setupIndivBox(indiv, y, h);
         }
         maxChildY = Math.max(maxChildY, y + indiv_layout.h);
         minX = Math.min(minX, indiv_layout.x);
      }

      // We'll need to adjust the offsets so that the coordinates of decujus
      // computed after parent and children layouts match
      const yAfterParent = main_layout.y;
      let maxChildY = 0;
      doLayoutChildren(data.main);

      // Apply the offset (to the children, since in general we will have more
      // ancestors displayed). At this point, we know the parents extend from
      // minY..maxY, so we adjust minY and maxY as needed
      const offset = yAfterParent - main_layout.y;
      function doOffsetChildren(indiv : IPedigreePersonLayout) {
         indiv.y += offset;
         minY = Math.min(minY, indiv.y);
         maxY = Math.max(maxY, indiv.y + indiv.h);
         if (Math.abs(indiv.p.generation) < settings.descendant_gens) {
            const children = indiv.p.children || [];
            for (let n = 0; n < children.length; n++) {
               if (children[n]) {
                  doOffsetChildren(result.pnodes[children[n].id]);
               }
            }
         }
      }
      doOffsetChildren(main_layout);

      // Compute the links
      angular.forEach(result.nodes, node => {
         if (node.p.sosa <= 0) {
            result.links.push([node, result.pnodes[node.p.parent_.id]]);
         } if (node.p.generation < settings.gens && node.p.parents) {
            const father = node.p.parents[0];
            if (father) {
               result.links.push([node, result.pnodes[father.id]]);
            }
            const mother = node.p.parents[1];
            if (mother) {
               result.links.push([node, result.pnodes[mother.id]]);
            }
         }
      });

      result.x = minX;
      result.y = minY;
      result.width = left[settings.gens + 1] - minX;
      result.height = maxY - minY;
      return result;
   }
}

app.service('PedigreeLayout', PedigreeLayoutService);

interface PedigreeControllerScope extends angular.IScope {
   decujus     : number;
   contextual  : any;  // data for the contextual menu
   focusPerson : Function;
   showPerson  : Function;
}

app.controller(
   'pedigreeCtrl',
   ($scope       : PedigreeControllerScope,
    Pedigree     : PedigreeService,
    $state       : angular.ui.IStateService,
    $stateParams : angular.ui.IStateParamsService,
    contextMenu  : ContextMenu,
    $location    : angular.ILocationService,
    $rootScope   : IGPRootScope) =>
{
   // When the search parameter (id) changes, angularjs-ui-router will not
   // reload the page and create a new controller, so we monitor these
   // instead (that's on purpose so that we can have animation in the SVG).
   // This page might also be loaded without specifying an explicit person, in
   // which case we must reuse the current decujus.
   // We need to monitor the location, not the state, to handle Back and
   // Forward
   $scope.$on('$locationChangeSuccess', function() {
      $scope.decujus = $location.search().id || $scope.decujus;
   });
   if ($stateParams['id'] !== undefined) {
       $scope.decujus = +$stateParams['id'];
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

});

interface IPedigreeDirectiveScope extends angular.IScope {
   decujus : number;
}

app.directive(
   'gpPedigree',
   (Pedigree       : PedigreeService,
    PedigreeLayout : PedigreeLayoutService,
    $rootScope     : IGPRootScope,
    GPd3           : GPd3Service,
    $location      : angular.ILocationService,
    contextMenu    : ContextMenu) =>
{
   return {
      scope: {
         decujus: '=gpPedigree'
      },
      link: (scope   : IPedigreeDirectiveScope,
             element : angular.IAugmentedJQuery) =>
      {
         const set = $rootScope.settings.pedigree;

         // Watch the settings (in case we want to draw differently) and the
         // decujus (in case we want to display a different person).

         scope.$watch(
            function() { return [scope.decujus, $rootScope.settings]},
            function() {
               Pedigree.select(scope.decujus);
               Pedigree.get(set.gens, set.descendant_gens).then(
                  function(data) { render(data)});
            },
            true);

         let drawTexts = function(scale : number) {};

         const scalable = GPd3.svg(
            element,
            function(currentScale) {  // onzoom
               // Use a maximal size for text, after which we start
               // displaying more information. Since we are adding and
               // removing elements, this makes the zoom slower though
               if (set.showDetails) {
                  drawTexts(currentScale);
               }
            });
         const group = scalable.selection;

         function linkY_(p : IPedigreePersonLayout) {
            if (set.colorScheme == colorScheme.WHITE) {
               return p.y + p.fs;
            } else {
               return p.y + p.h / 2;
            }
         }

         /**
          * Assuming the data is fully loaded, draw the graphics
          * @param {Object}  data    as loaded from the server.
          */
         function render(data : PedigreeService) {
            if (!data) {
               return;
            }

            group.attr('class', 'pedigree color-' + set.colorScheme);
            const layout = PedigreeLayout.compute(data);
            const styles = GPd3.getStyles(group, layout.nodes, set, data);

            GPd3.setViewBox(element, layout);

            const durationForExit = 200;  // duration for exit() animation

            // Draw the lines
            const drawLinks = GPd3.linksDraw(set.linkStyle, linkY_);
            const links = group.selectAll('path.link')
               .data(layout.links, d => d ? d[0].p.id + '-' + d[1].p.id : '');
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

            if (set.colorScheme == colorScheme.WHITE) {
               let selflines = '';
               angular.forEach(layout.nodes, node => {
                  selflines += 'M' + node.x + ' ' + linkY_(node) +
                               'h' + node.w;
               });
               group.append('path').attr('class', 'link').attr('d', selflines);
            }

            function contextmenu(d : IPedigreePersonLayout) {
               contextMenu.create(
                  '#contextMenu', <MouseEvent>d3.event,
                  {d: d.p, element: this});
            }

            // Create the box for each person
            const persons = group
               .selectAll('g.person')
               .data(layout.nodes, d => d.p.id.toString());
            const decujusbox = layout.pnodes[data.main.id];
            persons.exit()
               .transition()
               .duration(durationForExit)
               .style('opacity', 0)
               .remove(); // remove no-longer needed boxes
            const enter_g = persons.enter()          // add new boxes at correct position
               .append('g')
               .attr('class', 'person')
               .attr('transform', `translate(${decujusbox.x},${decujusbox.y})`)
               .on('contextmenu', contextmenu);
            enter_g.append('rect')
               .attr('width', 0)
               .attr('height', 0)
               .attr('rx', '6px')  // rounded rectangle
               .attr('ry', '6px');
            enter_g.append('clipPath')
               .attr('id', d => 'clip' + d.p.id)
               .append('rect')
               .attr('rx', '6px')  // rounded rectangle
               .attr('ry', '6px');

            persons.selectAll('g rect')
               .each(function(d) {
                  d3.select(this).attr(<any>styles.style(d))
               })

            persons
               .transition()
               .delay(durationForExit)
               .attr('transform', d => `translate(${d.x},${d.y})`);
            persons.selectAll('rect')  // including clipPath>rect
               .transition()
               .delay(durationForExit)
               .attr('width', d => d.w)
               .attr('height', d => d.h);

            drawTexts = function(currentScale) {
               // Prepare the lines of text for each person, depending on the size
               // allocated for that person. With the newly created text field,
               // we can then use d3's data() to easily create one <tspan> node
               // for each child.

               persons.selectAll('text').remove();

               angular.forEach(layout.nodes, p => {
                  p.text = [];
                  p.absFontSize = Math.min(p.fs, 20 / currentScale);
                  const linesCount = Math.floor(p.h / p.absFontSize);
                  if (linesCount < 1) {
                     return;
                  }

                  p.text.push(data.displayName(p.p));

                  const birth = data.event_to_string(p.p.birth);
                  const death = data.event_to_string(p.p.death);

                  if (!set.showDetails || linesCount < 4) {
                     p.text.push(birth + ' - ' + death);
                  } else {
                     if (birth) {
                        const place = p.p.birth ? p.p.birth.place : '';
                        p.text.push('b: ' + birth + (place ? ' - ' + place : ''));
                     }
                     if (death) {
                        const place = p.p.death ? p.p.death.place : '';
                        p.text.push('d: ' + death + (place ? ' - ' + place : ''));
                     }
                     if (p.text.length <= linesCount) {
                        const d = data.getDetails(p.p);
                        if (d) {
                           d.then(<any>scalable.applyScale);
                        } else {
                           angular.forEach(p.p.details, t => {
                              if (p.text.length < linesCount) {
                                 p.text.push(t);
                              }
                           });
                        }
                     }
                  }
               });

               // Draw the text
               const tspan = persons.append('text')
                  .attr({
                     'clip-path': d => `url(#clip${d.p.id})`,
                     'font-size': d => d.absFontSize})
                  .each(function(d) {
                     d3.select(this).attr(<any>styles.text(d));
                  })
                  .selectAll('tspan')
                  .data<string>(d => d.text)
                  .enter()
                  .append('tspan')
                  .attr({
                     class: (d, i) => i == 0 ? 'name' : 'details',
                     'font-size': (d, i) => i == 0 ? '1em' : '0.8em',
                     x: 5})
                  .text(d => d);  // the data is 'd.text'
               if (set.colorScheme == colorScheme.WHITE) {
                  tspan.attr('dy', (d, i) => i == 0 ? '0.8em' : i == 1 ? '1.2em' : '1em');
               } else {
                  tspan.attr('dy', (d, i) => i == 1 ? '1.2em' : '1em');
               }

               // The marriage date for the parents
               if (set.showMarriages) {
                  const m = group.selectAll('text.marriage')
                     .data(layout.nodes, d => d.p.id.toString());
                  m.exit().remove();
                  m.enter().append('text')
                     .attr('class', 'marriage')
                     .attr('dy', '0.4em');
                  m.text((d) => data.event_to_string(d.p.marriage))
                     .transition()
                     .delay(durationForExit)
                     .attr({
                        'font-size': d => d.parentsMarriageFS,
                        x: d => d.parentsMarriageX,
                        y: d => linkY_(d)});
               } else {
                  group.selectAll('text.marriage').remove();
               }
            }

            scalable.applyScale(); // draw texts
            if (!set.showDetails) {
               drawTexts(1);
            }
         }
      }
   };
});

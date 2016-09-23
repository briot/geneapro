import {Component, ElementRef, Input, Injectable} from '@angular/core';
import {Router, ActivatedRoute, Params} from '@angular/router';
import * as d3 from 'd3';
import {Settings} from './settings.service';
import {GPd3Service, ScalableSelection, d3Styles, LayoutInfo} from './d3.service';
import {IPerson, IRectangle, ColorScheme, LayoutScheme} from './basetypes';
import {PedigreeData, PedigreeService} from './pedigree.service';
import {ContextMenuService, ContextualItem} from './contextmenu';

interface RadialLayout extends LayoutInfo {
   p        : IPerson;

   // Generated by d3.layout.tree
   parent   ?: RadialLayout;
   children ?: RadialLayout[];
   depth    ?: number;
   x        ?: number;
   y        ?: number;
}

@Component({
   selector:  'radial',
   template:  '',
})
export class Radial {
   @Input() id      : number;
   private scalable : ScalableSelection;
   private data     : PedigreeData;

   constructor(
      private element         : ElementRef,
      private pedigreeService : PedigreeService,
      private settings        : Settings,
      private contextService  : ContextMenuService,
      private gpd3            : GPd3Service)
   {
      this.settings.onChange.subscribe(() => this.ngOnChanges(null));
   }

   ngOnChanges(changes : any) {
      const set = this.settings.radial;

      if (!this.scalable) {
         this.scalable = this.gpd3.svg(this.element);
      }

      this.pedigreeService.get(
         this.id,
         set.gens > 0 ? set.gens : 0,
         set.gens < 0 ? -set.gens : 0
      ).subscribe((d : PedigreeData) => this.render(d));
   }

   render(data : PedigreeData) {
      this.data = data;

      const set = this.settings.radial;
      this.scalable.selection.attr('class', 'radial color-' + set.colorScheme);

      const circleSize = 10;  // diameter of circles
      const diameter = (Math.abs(set.gens) * 2 + 1) * (circleSize * 6);
      // We are displaying gens*2+1 generations, and leave space
      // between two circles equal to 5 times the size of a circle.

      this.scalable.setViewBox({x: 0, y: 0, width: diameter, height: diameter});

      const tree = d3.layout.tree<RadialLayout>()
          .size([360, diameter / 2 - 120])
          .children((d : RadialLayout) => {
             let result : RadialLayout[] = [];
             let base : IPerson[];

             if (set.gens > 0) {
                // Ancestor tree
                if (d.p.generation > set.gens) {
                   return result;
                }
                base = d.p.parents;
             } else {
                // Descendants tree
                if (d.p.generation < set.gens) {
                   return result;
                }
                base = d.p.children;
             }

             base.forEach((p : IPerson) => {
                if (p) {
                   result.push(
                      <RadialLayout> {
                         p: p
                      });
                }
             });
             return result;
          })
          .separation((p1 : RadialLayout, p2 : RadialLayout) => (
             (p1.parent == p2.parent ? 1 : 2) /* / p1.depth */));

       const diagonal = d3.svg.diagonal.radial<RadialLayout>()
           .projection((d : RadialLayout) => [d.y, d.x / 180 * Math.PI]);

       const nodes = tree.nodes(<RadialLayout>{p: data.decujus});
       const links = tree.links(nodes);
       const styles = this.gpd3.getStyles(this.scalable.selection, nodes, set, data);

       const link = this.scalable.selection.selectAll(".link").data(links);
       link.exit().remove();
       link.enter().insert("path", ':first-child').attr("class", "link");
       link.attr("d", diagonal);

       this.scalable.selection.selectAll('.node').remove();

       const node = this.scalable.selection.selectAll(".node")
          // There can be multiple nodes with the same id (implex)
          .data(nodes);

       const n = node.enter()
          .append("g")
          .attr("class", "node")
          .on('contextmenu', (d : RadialLayout) => {
             this.contextService.createMenu(<MouseEvent>d3.event, d.p);
          })
          .append('title')  // for tooltips
          .text((d : RadialLayout) => data.displayName(d.p));
       node.attr("transform", (d : RadialLayout) => "rotate(" + (d.x - 90) + ")translate(" + d.y + ")");

       node.select('circle').remove();
       node.append("circle").attr("r", circleSize)
          .each(function(d : RadialLayout) { return d3.select(this).attr(<any>styles.style(d))});

       node.select('text').remove();
       if (set.showText) {
          node.append("text")
           .attr({
              dy: '.31em',
              'text-anchor': (d : RadialLayout) => d.x < 180 ? "start" : "end",
              'transform': (d : RadialLayout) => d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"})
           .text((d : RadialLayout) => d.p.surn);
       }

       this.scalable.setTranslate(diameter / 2, diameter / 2).applyScale(1);
   }
}

@Component({
   templateUrl: './radial.html'
})
export class RadialPage {
   public id : number;

   contextualLinks : ContextualItem[];

   constructor(
      public settings         : Settings,
      private contextService  : ContextMenuService,
      private router          : Router,
      private route           : ActivatedRoute)
   {
      this.contextualLinks = [
         {name: 'Set as reference', func: this.focusPerson.bind(this)},
         {name: 'Show details',     func: this.showPerson.bind(this)}
      ];
   }

   ngOnInit() {
      // Subscribe to changes in the parameters
      this.route.params.forEach((p : Params) => {
         this.id = +p['id'];
         this.settings.decujus = this.id;
         this.settings.setTitle('Radial Tree for person ' + this.id);
      });
   }

   changed() {
      this.settings.reportChange();
   }

   focusPerson(data : IPerson, item : ContextualItem) {
      this.router.navigateByUrl('/radial/' + data.id);
   }

   showPerson(data : IPerson, item : ContextualItem) {
      this.router.navigateByUrl('/persona/' + data.id);
   }

   onBackgroundContextMenu(event : MouseEvent) {
      this.contextService.createMenu(event, null);
   }

}

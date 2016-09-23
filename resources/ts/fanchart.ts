import {Component, ElementRef, Input, Injectable} from '@angular/core';
import {Router, ActivatedRoute, Params} from '@angular/router';
import * as d3 from 'd3';
import {Settings} from './settings.service';
import {GPd3Service, ANIMATION_DURATION, ScalableSelection, d3Styles, LayoutInfo} from './d3.service';
import {IPerson, IRectangle, ColorScheme, LayoutScheme} from './basetypes';
import {PedigreeData, PedigreeService} from './pedigree.service';
import {ContextMenuService, ContextualItem} from './contextmenu';

const HALF_PI = Math.PI / 2;
const TWO_PI = Math.PI * 2;

/**
 * The layout information for one person
 */
interface IPersonFanLayout {
   p         : IPerson;
   minAngle  : number;   // start angle
   maxAngle  : number;   // end angle
   minRadius : number;   // inner radius
   maxRadius : number;   // outer radius
   fs        : number;   // font size
}

/**
 * The layout information for children
 */
interface IChildFanLayout {
   p         : IPerson;
   x         : number;  // relative to centerX of diagram
   y         : number;  // relative to centerY of diagram
   w         : number;
   h         : number;
   fs        : number;  // font size
}

/**
 * The layout information for the whole fanchart
 */
interface IFanLayout extends IRectangle{
   x      : number;
   y      : number;
   width  : number;
   height : number;

   maxX : number;
   maxY : number;
   centerX : number;
   centerY : number;
   nodes : IPersonFanLayout[];
   childnodes : IChildFanLayout[];

   // The layout data for a person
   pLayout : { [id: number]: IPersonFanLayout };

   // The inner and outer radius for each generation
   _minRadius : number[];
   _maxRadius : number[];

   // Size of font per generation
   _fs : number[];
}

/**
 * Standard % has the same size for the modulo as the dividend,
 * as opposed to standard math
 */
function modulo(a : number, b : number) : number {
   const r = a % b;
   return (r * b < 0) ? r + b : r;
}

/**
 * Normalize an angle to be in the range [0-2PI]
 */
function standardAngle(angle : number) : number {
   return modulo(angle, TWO_PI);
};

/**
 * A fanchart layout algorithm
 * @return {{nodes}}
 *    nodes is an array of all the nodes to display. These are the same
 *    person instances given in data, augmented with layout information:
 *        minAngle, maxAngle:   start and end angle
 *        minRadius, maxRadius: inner and outer radius
 *        fs:                   text sizes
 */
@Injectable()
export class FanchartLayoutService {

   rowHeight = 60;                // height for a generation
   rowHeightAfterThreshold = 100; // row height after genThreshold
   innerCircle = 20;              // height of inner white circle
   boxWidth = 100;                // Size of boxes for children
   boxHeight = 30;
   textHeight = 20;               // Base size for the text

    // Size of separator between generations, when enabled
   public SEPARATOR_WIDTH = 8;

   // Generation after which the text is rotated 90 degrees to make it
   // more readable.
   public genThreshold = 4;

   // Extra space between generations
   public spaceBetweenGenerations = 0;

   constructor(private settings : Settings) {
   }

   /** Register the layout information for a given individual
    */
   private registerPerson(
      layout   : IFanLayout,
      indiv    : IPerson,
      minAngle : number,
      maxAngle : number)
   {
      if (indiv.sosa != 1 && !layout.pLayout[indiv.id]) {
         const maxR = layout._maxRadius[indiv.generation];
         const x1 = maxR * Math.cos(minAngle);
         const y1 = maxR * Math.sin(minAngle);
         const x2 = maxR * Math.cos(maxAngle);
         const y2 = maxR * Math.sin(maxAngle);
         layout.x = Math.min(layout.x, x1, x2);
         layout.maxX = Math.max(layout.maxX, x1, x2);
         layout.y = Math.min(layout.y, y1, y2);
         layout.maxY = Math.max(layout.maxY, y1, y2);
         var l : IPersonFanLayout = {
            p         : indiv,
            minAngle  : minAngle + HALF_PI,
            maxAngle  : maxAngle + HALF_PI,
            minRadius : layout._minRadius[indiv.generation],
            maxRadius : maxR,
            fs        : layout._fs[indiv.generation]};

         layout.pLayout[indiv.id] = l;
         layout.nodes.push(l);
      }
   }

   /**
    * Compute the layout
    */
   compute(data: PedigreeData) : IFanLayout {

      const settings = this.settings.fanchart;

      // Extra blank space between layer rings. This is used to display
      // marriage information.
      const sepBetweenGens = Math.max(
         this.spaceBetweenGenerations,
         settings.showMarriages ? this.SEPARATOR_WIDTH : 0);

      // Start and end angles in radians. Clockwise starting from the usual
      // 0 angle
      const maxAngle = settings.angle * HALF_PI / 180 - Math.PI / 2;
      const minAngle = -maxAngle - Math.PI;

      // Separator (in radians) between couples. Setting this to 0.5 or more
      // will visually separate the couples at each generation.
      const separator = settings.space * HALF_PI / 900;

      // The result of computing the layout.
      let layout : IFanLayout = {
         nodes: [],
         pLayout: {},
         childnodes: [],
         _minRadius : [],
         _maxRadius : [],
         _fs : [],
         x: 0,
         y: 0,
         maxX: 0,
         maxY: 0,
         width: 0,
         height: 0,
         centerX: 0,
         centerY: 0};

      // Compute the radius for each generation
      // ??? Could keep previous values in most cases
      layout._minRadius = [0];
      layout._maxRadius = [this.innerCircle];
      layout._fs = [this.textHeight];
      for (let gen = 1; gen <= settings.gens; gen++) {
         const m = layout._maxRadius[gen - 1] + ((gen == 1) ? 0 : sepBetweenGens);
         layout._fs.push(layout._fs[gen - 1] * 0.9);
         layout._minRadius.push(m);
         layout._maxRadius.push(
            m + (gen < this.genThreshold
                 ?  this.rowHeight
                 : this.rowHeightAfterThreshold));
      }

      const doLayout = (indiv : IPerson,
                        minAngle : number,
                        maxAngle : number,
                        separator : number) =>
      {
         this.registerPerson(layout, indiv, minAngle, maxAngle);

         if (indiv.generation < settings.gens && indiv.parents) {
            const father = indiv.parents[0];
            const mother = indiv.parents[1];
            let half : number;

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
      doLayout(data.decujus, minAngle + separator / 2,
               maxAngle - separator / 2, separator);

      layout.width = layout.maxX - layout.x;
      layout.height = layout.maxY - layout.y;

      // The space there should be below centerY so that the fanchart
      // does not hide the decujus box partially.

      const angle = TWO_PI - (maxAngle - minAngle);
      let minDist = 0;  // distance between left side of decujus box and fan center
      if (angle >= Math.PI) {
         // Fanchart occupies less than a half circle
      } else if (angle <= Math.PI / 6) {
         minDist = layout.height / 2; // fullCircle
      } else {
         minDist = this.boxWidth / 2 / Math.tan(angle / 2);
      }

      // Compute the position for the children and decujus

      var decujusBox = {
         p: data.decujus,
         x:  - this.boxWidth / 2,
         y: minDist + 5,
         w: this.boxWidth,
         h: this.boxHeight,
         fs: this.textHeight};
      layout.childnodes.push(decujusBox);

      const children = data.decujus.children;
      if (children && children.length) {
         let child : IChildFanLayout;
         let y = decujusBox.y;
         for (let c = 0; c < children.length; c++) {
            y += this.boxHeight + 5;
            child = {
               p: children[c],
               x: decujusBox.x + 30,
               y: y,
               w: this.boxWidth,
               h: this.boxHeight,
               fs: this.textHeight};
            layout.childnodes.push(child);
         }
         layout.height = Math.max(
            layout.y + layout.height,
            layout.centerY + child.y + child.h) - layout.y;
      }

      return layout;
   }
}

interface ContextualData {
   p : IPerson;
   render : () => void;   //  called to refresh the drawing
}

@Component({
   selector:  'fanchart',
   template:  ''
})
export class Fanchart {
   @Input() id      : number;
   private scalable : ScalableSelection;
   private data     : PedigreeData;

   constructor(
      private element         : ElementRef,
      private pedigreeService : PedigreeService,
      private settings        : Settings,
      private layoutService   : FanchartLayoutService,
      private contextService  : ContextMenuService,
      private gpd3            : GPd3Service)
   {
      this.settings.onChange.subscribe(() => this.ngOnChanges(null));
   }

   ngOnChanges(changes : any) {
      // Called before ngOnInit, so might not have scalable
      if (!this.scalable) {
         this.scalable = this.gpd3.svg(this.element);
      }

      const set = this.settings.fanchart;
      this.pedigreeService.get(this.id, set.gens, 1, true /* year_only */)
         .subscribe((d : PedigreeData) => {
            this.data = d;
            this.render();
         });
   }

   render() {
      const data = this.data;
      const set = this.settings.fanchart;
      this.scalable.selection.attr('class', 'fanchart color-' + set.colorScheme);

      if (set.showMissing) {
         data.addMissingPersons();
      } else {
         data.removeMissing();
      }

      // Width of the separator between generations, when it has a
      // specific color.
      // ??? Should be set depending on whether the styles set a
      // separatorStyle, but computing the style needs the layout and
      // the layout needs the separator width...
      this.layoutService.spaceBetweenGenerations =
         (set.colorScheme == ColorScheme.QUARTILE ||
          set.showMarriages) ?
          this.layoutService.SEPARATOR_WIDTH : 0;

      const layout   : IFanLayout = this.layoutService.compute(data);

      const group = this.scalable.selection;

      // Generation at which we stop displaying names
      const textThreshold = 8;

      //  The paths for the sectors (with background colors)
      const arc = d3.svg.arc<IPersonFanLayout>()
         .startAngle(d => d.minAngle)
         .endAngle(d => d.maxAngle)
         .innerRadius(d => d.minRadius)
         .outerRadius(d => d.maxRadius);

      //  The paths for the separators between generations
      const arcSeparator = d3.svg.arc<IPersonFanLayout>()
         .startAngle(d => d.minAngle)
         .endAngle(d => d.maxAngle)
         .innerRadius(d => d.maxRadius)
         .outerRadius(d => d.maxRadius + this.layoutService.spaceBetweenGenerations);

      const styles = this.gpd3.getStyles(
            group, layout.nodes, set, data,
            false /* preserve */,
            true /* isRadial */);

      group.attr({
         class: `fanchart color-${set.colorScheme}`,
         transform: `translate(${layout.centerX},${layout.centerY})`});

      // Add new groups for the persons

      const persons = group
         .selectAll('g.person')
         .data(layout.nodes, (d : IPersonFanLayout) => <any>d.p.id);
      persons.exit().remove();
      const persons_enter_g = persons.enter()
         .append('g')
         .attr('class', 'person')
         .on('contextmenu', (d : IPersonFanLayout) => {
            const data : ContextualData = {p: d.p, render: this.render.bind(this)};
            this.contextService.createMenu(<MouseEvent>d3.event, data);
         });

      //  Draw the background for persons

      persons_enter_g  // enter
         .append('path')
         .attr('class', 'background');
      persons         // enter+update
         .select('path.background')

         // Must use a function here to change 'this'
         .each(function(d) {
            return d3.select(this).attr(<any>styles.style(d));
         })
         .transition()
            .duration(ANIMATION_DURATION)
            .attr('d', arc);

      //  Draw the names for persons
      //  We must add a new text/textPath/tspan for each element if we
      //  want them all to be horizontally centered, since setting a 'x'
      //  property on a <tspan> makes it ignore its 'text-anchor'

      function setText(
         selection : d3.Selection<IPersonFanLayout>,
         dy        : string,
         className : string,
         text      : (d : IPersonFanLayout) => string)
      {
         selection
            .append('text')
            .append('textPath')
            .attr({
               'startOffset': '50%',
               'text-anchor': 'middle',
               'xlink:href': d => `#text${d.p.id}`})
            .append('tspan')
            .attr({dy: dy, 'class': className})
            .text(text);
      }

      //  The paths for the names of persons
      const arcText = (d : IPersonFanLayout) => {
         // Along an arc
         if (d.p.generation < this.layoutService.genThreshold) {
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
            let m = d.minAngle - HALF_PI;
            let M = d.maxAngle - HALF_PI;
            const med = standardAngle((m + M) / 2);
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
            const a = standardAngle((d.minAngle + d.maxAngle) / 2) - HALF_PI;
            let r = d.minRadius;
            let R = d.maxRadius;
            if (set.readableNames && (a < -HALF_PI || a > HALF_PI)) {
               r = d.maxRadius;
               R = d.minRadius;
            }
            const ca = Math.cos(a);
            const sa = Math.sin(a);
            return 'M' + r * ca + ' ' + r * sa +
                   'L' + R * ca + ' ' + R * sa;
         }
      }

      //  The paths for the marriages
      const arcMarriage = (d : IPersonFanLayout) => {
         if (d.p.generation >= set.gens ||
             d.p.generation >= textThreshold - 1)
         {
            return '';
         }
         let r = d.maxRadius + this.layoutService.spaceBetweenGenerations / 2;
         let m = d.minAngle - HALF_PI;
         let M = d.maxAngle - HALF_PI;
         const med = standardAngle((m + M) / 2);
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

      const p = persons_enter_g.filter(
         (d : IPersonFanLayout) => d.p.generation < textThreshold)
      p.append('path')   // subset of enter
         .attr({
            class: 'name',
            fill: 'none',
            id: (d : IPersonFanLayout) => `text${d.p.id}`});
      persons
         .select('path.name')   // enter+update
         .attr('d', arcText);
      setText(p, '-0.5em', 'name', (d : IPersonFanLayout) => d.p.surn);
      setText(p, '0.5em', 'name', (d : IPersonFanLayout) => d.p.givn);
      setText(p, '1.5em', 'details', null);

      // Always update events text to show the source info (or not)
      persons.select('tspan.details')  // enter+update
         .text((p : IPersonFanLayout) => {
             const b = data.event_to_string(p.p.birth, true /* use_date_sort */);
             const d = data.event_to_string(p.p.death, true /* use_date_sort */);
             return `${b} - ${d}`});

      // The space between generations might be displays specially in
      // some cases (as a gradient in the Quartile case, for instance)

      persons.select('path.separator').remove();
      if (this.layoutService.spaceBetweenGenerations && styles.separator) {
         persons.append('path')
            .attr({
               class: 'separator',
               d: arcSeparator})
            .each(function(d) {
               return d3.select(this).attr(<any>styles.separator(d));
            });
      }

      // Show the marriages

      if (set.showMarriages) {
         persons_enter_g  // enter
            .filter((d : IPersonFanLayout) => d.p.generation < textThreshold - 1)
            .append('path')
            .attr({
               class: 'marriagePath',
               fill: 'none',
               id: (d : IPersonFanLayout) => `textMarriage${d.p.id}`});

         persons.select('path.marriagePath')  // enter + update
            .transition()
            .duration(ANIMATION_DURATION)
            .attr('d', arcMarriage)

         persons_enter_g  // enter
            .filter((d : IPersonFanLayout) =>
                       d.p.generation < set.gens &&
                       d.p.generation < textThreshold - 1)
            .append('text')
            .attr('class', 'marriage')
            .append('textPath')
            .attr({
               startOffset: '50%',
               'text-anchor': 'middle',
               'xlink:href': (d : IPersonFanLayout) => `#textMarriage${d.p.id}`})
            .text((d : IPersonFanLayout) => data.event_to_string(d.p.marriage));
      }

      // Show the children
      const styles2 = this.gpd3.getStyles(
            group, layout.childnodes, set, data,
            true /* preserve */);
      const childnodes = group
         .selectAll('g.child')
         .data(layout.childnodes, (d : IChildFanLayout) => <any>d.p.id);
      childnodes.exit().remove();
      const g = childnodes.enter()
         .append('g')
         .attr('class', 'child');
      g.append('rect')
         .attr('rx', '6px')
         .attr('ry', '6px')
         .attr('width', (d : IChildFanLayout) => d.w)
         .attr('height', (d : IChildFanLayout) => d.h);
      childnodes.select('rect')
         .each(function(d) {
            return d3.select(this).attr(<any>styles2.style(d));
         });
      g.append('text')
         .attr('x', 5)
         .attr('y', '1em')
         .text(d => data.displayName(d.p));
      childnodes
         .attr('transform', (d : IChildFanLayout) => `translate(${d.x},${d.y})`)
         .on('contextmenu', (d : IChildFanLayout) => {
            const data : ContextualData = {p: d.p, render: this.render.bind(this)};
            this.contextService.createMenu(<MouseEvent>d3.event, data);
         });

      this.scalable.setViewBox(layout);
   }

}

@Component({
   template: require('./fanchart.html')
})
export class FanchartPage {
   public id : number;

   contextualLinks : ContextualItem[];

   constructor(
      public settings         : Settings,
      private contextService  : ContextMenuService,
      private pedigreeService : PedigreeService,
      private router          : Router,
      private route           : ActivatedRoute)
   {
      this.contextualLinks = [
         {name: 'Set as reference', func: this.focusPerson.bind(this)},
         {name: 'Expand/Unexpand',  func: this.expandPerson.bind(this)},
         {name: 'Show details',     func: this.showPerson.bind(this)}
      ];
   }

   ngOnInit() {
      // Subscribe to changes in the parameters
      this.route.params.forEach((p : Params) => {
         this.id = +p['id'];
         this.settings.decujus = this.id;
         this.settings.setTitle('Fanchart for person ' + this.id);
      });
   }

   changed() {
      this.settings.reportChange();
   }

   focusPerson(data : ContextualData, item : ContextualItem) {
      this.router.navigateByUrl('/fanchart/' + data.p.id);
   }

   showPerson(data : ContextualData, item : ContextualItem) {
      this.router.navigateByUrl('/persona/' + data.p.id);
   }

   /**
    * Reset the expanded status for a person and its ancestors
    */
   private _resetPersonExpansion(p : IPerson, data : ContextualData) {
      p.parents.forEach(pa => {
         if (pa) {
            this._resetPersonExpansion(pa, data);
            if (pa == data.p) {
               p.parents.forEach(pa2 => pa2.$expand = false);
            }
         }
      });
   }

   expandPerson(data : ContextualData, item : ContextualItem) {
      if (!data.p.$expand) {
         this._resetPersonExpansion(this.pedigreeService.decujus(), data);
      }

      data.p.$expand = !data.p.$expand;
      data.render();
   }

   onBackgroundContextMenu(event : MouseEvent) {
      this.contextService.createMenu(event, null);
   }

}

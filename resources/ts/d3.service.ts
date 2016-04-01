import * as d3 from 'd3';
import {Injectable, ElementRef} from '@angular/core';
import {IPerson, IStyle, IRectangle, LinkStyle, ColorScheme,
   Appearance} from './basetypes';
import {PedigreeData, PedigreeService} from './pedigree.service';

// Tmp: the layout of the pedigree tree
interface IPersonBox {
   p : IPerson,
   x : number,
   y : number,
   w : number,
   h : number
}

// Minimal info needed to compute person styles
export interface LayoutInfo {
   p          : IPerson;
   minRadius ?: number;   // needed when computed radial gradient
   maxRadius ?: number;
}

// A property setter in d3
// Either a constant string, a function that returns such a string,
// or a function that returns a style object to be used by .attr()
type PropSetterFunc<T> = (d : T) => string;
type PropSetter<T> = (string | PropSetterFunc<T>);
type PropSetterStyle<T> = (d : T) => IStyle;

export type d3Styles<T> = {
   style     : PropSetterStyle<T>,
   text      : PropSetterStyle<T>,
   separator : PropSetterStyle<T>
};

export const ANIMATION_DURATION = 800;

export class ScalableSelection {
   private currentScale = 1;
   private currentTranslate : [number, number] = [0, 0];
   private zoom = d3.behavior.zoom();
   selection : d3.Selection<any>;

   /**
    * Instrument the elements in the selection so that they
    * react to mouse events to zoom and translate.
    * The returned instance can be used to manipulate scale and
    * translation of the selection.
    */
   constructor(
      private element : ElementRef,
      public onzoom ?: (scale ?: number) => void)
   {
      this.zoom.scaleExtent([1 / 15, 15])
         .on('zoom', () => {
            const e = <d3.ZoomEvent> d3.event;
            this.currentScale = e.scale;
            this.currentTranslate = e.translate;
            this.applyScale(1);
         });
      this.zoom.scale(this.currentScale).translate(this.currentTranslate);
      this.selection = d3.select(element.nativeElement)
         .append("svg")
         .attr('preserveAspectRatio', 'xMinYMin meet')
         .call(this.zoom)
         .on('dblclick.zoom', null)  // disable double-click
         .append('g');
   }

   /**
    * Apply the current transformation (scale+translate) to the
    * elements.
    */
   applyScale(delay : number = 500) {
      this.selection.transition()
       .duration(delay)
       .attr(
         'transform',
         'translate(' + this.currentTranslate +
            ') scale(' + this.currentScale + ')');
      if (this.onzoom) {
         this.onzoom.call(this, this.currentScale);
      }
   }

   /**
    * Set the viewbox of the svg element, based on the layout's extents
    * @param element
    * @param layout  provides the extents of the graph
    * @param preventZoomIn  If true, never zoom in by default (i.e.
    *   a length of 1 in the svg matches at most 1 pixel on screen)
    * @param margin  The margin around each side
    */
   setViewBox(
      layout        : IRectangle,
      preventZoomIn : boolean = false,
      margin        : number = 10)
   {
      const x = layout.x - margin;
      const y = layout.y - margin;
      let w = (preventZoomIn ? this.element.nativeElement.clientWidth : 0);
      let h = (preventZoomIn ? this.element.nativeElement.clientHeight : 0);
      w = Math.max(w, layout.width + 2 * margin);
      h = Math.max(h, layout.height + 2 * margin);
      d3.select(this.element.nativeElement).select('svg')
         .transition()
         .duration(ANIMATION_DURATION)
         .attr('viewBox', x + ' ' + y + ' ' + w + ' ' + h);
   }

   /**
    * Apply a specific translation to the selected elements.
    */
   setTranslate(x : number, y : number) {
      this.currentTranslate = [x, y];
      this.zoom.translate(this.currentTranslate);
      return this;
   }
}

@Injectable()
export class GPd3Service {

   /**
    * Prepare the svg element. It is setup for zooming and scrolling
    * with the mouse. An optional callback might be called, for instance
    * if you need to update the display to display more or less
    * information.
    */
   svg(
      element : ElementRef,
      onzoom ?: (scale ?: number) => void) : ScalableSelection
   {
      return new ScalableSelection(element, onzoom);
   }

   /** 
    * Return the function to compute the paths for links,
    * based on user preferences.
    * and return the path to use for the link.
    *    svg.selectAll('path.link')
    *       .data(...).enter().append('path')
    *       .attr('d', linksDraw(style))
    *  @param verticalPos is a function that returns the vertical
    *    coordinate within a person's box where a link should be
    *    attached. The default is to use the middle of the box.
    */
   linksDraw(
      style        : LinkStyle,
      verticalPos ?: (p : IPersonBox) => number
   )
   {
      type Link = [IPersonBox, IPersonBox];   // link between two persons
      type Node = {x : number, y : number};  // a d3js Node

      // Compute the vertical center for a person's box
      if (verticalPos === undefined) {
         verticalPos = (person : IPersonBox) => person.y + person.h / 2;
      }

      // Compute the source and target for a link
      const link_source = (d : Link) : Node => {
         return {y: d[0].x + d[0].w, x: verticalPos(d[0])}};
      const link_target = (d : Link) : Node => {
         return {y: d[1].x, x: verticalPos(d[1])} }

      // Projects some coordinates to other coordinates
      const link_project = (d : Node) : [number, number] => {
         return [d.y, d.x] };

      const drawer : (d : Link) => string    =
         (style == LinkStyle.STRAIGHT
          ? (d : Link) => {
               const source = link_project(link_source(d));
               const target = link_project(link_target(d));
               return 'M' + source + 'L' + target;
            }
          : (style == LinkStyle.ORTHOGONAL)
          ?  (d : Link) => {
               const source = link_project(link_source(d));
               const target = link_project(link_target(d));
               return 'M' + source + 'H' + (target[0] - 5) +
                    'V' + target[1] + 'H' + target[0];
            }
         :   // GP.linkStyle.CURVE
            // For this to compile, typings/modules/d3/index.d.ts must be
            // modified so that calling a Diagonal takes an optional index,
            // as per the documentation:
            // interface Diagonal { (d:Link, i?:number): string }
            d3.svg.diagonal<Link, Node>()
              .projection(link_project)
              .source(link_source)
              .target(link_target));

      return drawer;
   }

   /**
    * Support for HSB colors.
    * This is similar to d3.hsl
    */
   hsb(h : number, s : number, v : number) {
      const ll = (2.0 - s) * v;
      const ss = (s * v) / (ll <= 1 ? ll : 2.0 - ll);
      return d3.hsl(h, ss, ll / 2);
   };

   /**
    * Prepare the gradients to use when highlighting persons based on
    * their generation.
    * T
    * @param group   svg element to add <defs> to.
    * @param maxGen   The highest generation number.
    */
   private _createGradientsForEachGeneration(
      group : d3.Selection<any>,
      maxGen : number)
   {
      const g = group.append("defs")
         .selectAll('linearGradient')
         .data(d3.range(0, maxGen))
         .enter()
         .append("linearGradient")
         .attr("id", gen => {return "gengradient" + gen})
         //.attr("x2", 0)
         .attr("y2", "100%");
      g.append("stop")
         .attr("offset", 0)
         .attr("stop-color", (gen : number) => {
            return this.hsb(180 + 360 * (gen - 1) / 12, 0.4, 1.0).toString();
         });
      g.append("stop")
         .attr("offset", "100%")
         .attr("stop-color", (gen : number) => {
            return this.hsb(180 + 360 * (gen - 1) / 12, 0.4, 0.8).toString();
         });
   }

   /**
    * Prepare the gradients to use when highlighting persons based on their
    * position within each generation.
    * @param group   svg element to add <defs> to.
    * @param nodes     list of all persons.
    * @param color0  first color to use (given a node).
    * @param color1  second color to use (given a node).
    *    If it returns 'undefined', no gradient is applied for that person.
    */
   private _createGradientsForEachAngle(
      group    : d3.Selection<any>,
      nodes    : LayoutInfo[],
      color0   : PropSetterFunc<LayoutInfo>,
      color1   : PropSetterFunc<LayoutInfo>,
      isRadial : boolean)
   {
      nodes.forEach(d => {
         if (color1(d) === undefined) {
            d.p.$fill = color0(d);
            d.p.$fillGradient = false;
         } else {
            d.p.$fill = 'url(#gradient' + d.p.id + ')';
            d.p.$fillGradient = true;
         }
      });

      let g : d3.Selection<LayoutInfo>;

      // ??? Should automatically use this if d.maxRadius is defined
      if (isRadial) {
         g = group.append("defs")
            .selectAll('radialGradient')
            .data<LayoutInfo>(
               nodes.filter(d => d.p.$fillGradient),
               // ??? toString is imposed by typescript ???
               d => d.p.id.toString())
            .enter()
            .append("radialGradient")
            .attr({
               id: d => "gradient" + d.p.id,
               gradientUnits: 'userSpaceOnUse',
               cx: 0.5,
               cy: 0.5,
               r: d => d.maxRadius});
         g.append('stop').attr({
            'stop-color': color0,
            offset: (d : LayoutInfo) => (
               d.maxRadius
               ? (1 + (d.minRadius / d.maxRadius)) / 2
               : 0)});
      } else {
         g = group.append("defs").selectAll('linearGradient')
            .data(nodes.filter(d => d.p.$fillGradient),
                  d => d.p.id.toString())
            .enter()
            .append("linearGradient")
            .attr({
               id: d => "gradient" + d.p.id,
               //x2: 0,
               y2: '100%'});
         g.append('stop').attr({'stop-color': color0, offset: 0});
      }
      g.append("stop").attr({
         offset: '100%',
         'stop-color': color1});
   }

   /**
    * Return the styles to use for each person.
    * @param group   svg element to add <defs> to.
    * @param nodes     list of all persons to display.
    * @param settings the settings to use (colorScheme,...).
    * @param data  the data download from the server, to
    *    find the user's custom styles.
    * @param preserve  Whether to clear previous styles.
    * @param isRadial  Whether we should create radial gradients.
    * @return {Object}  the styles.
    * The object has several fields, each of which is either a static
    * string that specifies a constant color, or a function that takes
    * a person and returns its color.
    * In addition, this function creates the necessary <def> for SVG.
    */
   getStyles<T extends LayoutInfo>(
      group : d3.Selection<any>,
      nodes : T[],
      settings : {gens : number, descendant_gens ?: number,
                  colorScheme : ColorScheme,
                  appearance: Appearance},
      data     : PedigreeData,
      preserve : boolean = false,
      isRadial : boolean = false) : d3Styles<T>
   {
      const maxGen = Math.max(settings.gens, settings.descendant_gens || 1);
      const result : d3Styles<T> = {
         style: <PropSetterStyle<T>> function(d) {
            return {fill: 'none', stroke: '#222'}},
         text: <PropSetterStyle<T>> function(d) {
            return {fill: '#222', stroke: 'none'}},
         separator: <PropSetterStyle<T>> function(d) {  // for fanchart
            return {fill: 'none'}}
      };

      if (!preserve) {
         group.selectAll('defs').remove();
      }

      switch(settings.colorScheme) {
         case ColorScheme.GENERATION:
            if (settings.appearance == Appearance.GRADIENT) {
                this._createGradientsForEachGeneration(group, maxGen);
                result.style = (d : T) => {
                  const gen = Math.abs(d.p.generation);
                  return {
                     stroke: '#222',
                     fill: `url(#gengradient${gen})`}};

            } else {
               result.style = (d : T) => {
                  const gen = Math.abs(d.p.generation);
                  return {
                     stroke: '#222',
                     fill: this.hsb(
                        180 + 360 * (gen - 1) / 12, 0.4, 1.0).toString()};
               };
            }
            break;

         case ColorScheme.PEDIGREE: {
            // Avoid overly saturated colors when displaying only few
            // generations (i.e. when boxes are big)
            const m = Math.max(12, maxGen);
            if (settings.appearance == Appearance.GRADIENT) {
               this._createGradientsForEachAngle(
                   group, nodes,
                   (d : T) => {
                      const gen = Math.abs(d.p.generation);
                      return this.hsb(d.p.angle * 360, gen / m, 1.0).toString();
                   },
                   (d : T) => {
                      const gen = Math.abs(d.p.generation);
                      return this.hsb(
                         d.p.angle * 360, gen / m, 0.8).toString();
                   },
                   isRadial);
                result.style = (d : T) => (
                   {stroke: '#222', fill: d.p.$fill});

            } else {
               result.style = (d : T) => {
                  const gen = Math.abs(d.p.generation);
                  return {
                     stroke: '#222',
                     fill: this.hsb(d.p.angle * 360, gen / m, 1.0).toString()
                  }};
            }
            break;
         }

         case ColorScheme.RULES: {
             // Disable gradients for custom colors
             if (settings.appearance == Appearance.GRADIENT) {
                this._createGradientsForEachAngle(
                   group, nodes,
                   (p : T) => data.getStyle(p.p)['fill'],
                   (p : T) => {
                      const st = data.getStyle(p.p);
                      if (st['fill'] == 'none' || st['fill'] == 'white' ) {
                         // disable gradient
                         return undefined;
                      } else {
                         return d3.rgb(st['fill']).darker().toString();
                      }
                   },
                   isRadial);
                result.style = (d : T) => {
                   var s = data.getStyle(d.p);
                   return {
                      stroke: s['stroke'],
                      fill: d.p.$fill}};
                result.text = (d : T) => {
                   return {
                      fill: data.getStyle(d.p)['color']
                   }};

             } else {
               result.style = (d : T) => data.getStyle(d.p);
             }
             break;
         }

         case ColorScheme.WHITE:
            // No need for gradients
            result.style = (d : T) => ({stroke: 'none', fill: 'none'});
            break;

         case ColorScheme.TRANSPARENT:
            // No need for gradients
            result.style = (d : T) => ({stroke: '#444', fill: 'none'});
            break;

         case ColorScheme.QUARTILE:
            // Only applies to fanchart

            const base = ['rgb(127,229,252)',
                        'rgb(185,253,130)',
                        'rgb(252,120,118)',
                        'rgb(255,236,88)'];
            const border = ['rgb(93,183,217)',
                          'rgb(148,194,95)',
                          'rgb(243,96,80)',
                          'rgb(240,223,55)'];

            nodes.forEach(d => {
               const m = Math.pow(2, d.p.generation);
               d.p.quartile = Math.floor((d.p.sosa - m) / (m / 4)) % 4;
            });

            result.separator = (d : T) => (
               {stroke: '#ccc',
                fill: border[d.p.quartile]});

            if (settings.appearance == Appearance.GRADIENT) {
               this._createGradientsForEachAngle(
                  group, nodes,
                  (d : T) => (
                      d.p.generation < 0 ? 'none' : base[d.p.quartile]),
                  (d : T) => border[d.p.quartile],
                  isRadial);
               result.style = (d : T) => (
                  {stroke: '#ccc',
                   fill: d.p.generation < 0 ? 'none' : d.p.$fill});

            } else {
               result.style = (d : T) => (
                  {stroke: '#ccc',
                   fill: d.p.generation < 0 ? 'none' : base[d.p.quartile]});
            }

            break;
      }
      return result;
   };
}

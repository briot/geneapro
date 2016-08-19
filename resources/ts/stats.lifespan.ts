import {Component, ElementRef, ViewChild} from '@angular/core';
import * as d3 from 'd3';
import {StatsData, StatsService} from './stats.service';

@Component({
   selector: 'stats-lifespan',
   template: require('./stats.lifespan.html'),
})
export class StatsLifespan {
   @ViewChild('thesvg') svgelement: ElementRef;
   data : StatsData;
   colors : d3.scale.Ordinal<number, string>;

   constructor(private stats : StatsService) {
      this.colors = d3.scale.category10<number>();

   }

   ngAfterViewInit() {
      // Once we found the 'thesvg' element
      this.stats.get().subscribe(data => {
         this.data = data;
         this.lifespan();
      });
   }

   lifespan() {
      const elem = this.svgelement.nativeElement;

      // Our ages data is a 2D array, of the form:
      //    [  [age1, males1, females1, unknown1],
      //       [age2, males2, females2, unknown2], ...]
      // layout.stack excepts input of the type:
      //    [  [{x:0, y:males1},   {x:1, y:males2}],
      //       [{x:0, y:females1}, {x:1, y:females2}], ... ]

      interface ILifeSpan extends d3.layout.stack.Value {
         x : number,   // the age
         y : number,   // count for this age/sex
         category: string,  // male or female or unknown
         value   : number,

         y0 ?: number  // from d3.layout.stack
      }

      const remapped : ILifeSpan[][] = ['males', 'females', 'unknown'].map((sex, sex_i) => {
         return this.data.ages.map((forsex, column) => (
            <ILifeSpan>{
               x: this.data.ages[column][0] /* the age */,
               y: forsex[sex_i + 1]   /* count for this age/sex */,
               category: sex,
               value: forsex[sex_i + 1]}));
      });

      const stacked = <ILifeSpan[][]> d3.layout.stack()(remapped);
      const width = elem.clientWidth;
      const height = elem.clientHeight;
      const margin = 30;
      const x = d3.scale.ordinal<number, number>()
         .domain(this.data.ages.map(d => d[0]))
         .rangePoints([margin, width]);
      const y = d3.scale.linear()
         .domain([0,
                  d3.max(remapped, (d) => d3.max(d, (d) => d.y0 + d.y))])
         .range([height - margin, 0]);

      // Create the svg and toplevel group
      const svg = d3.select(elem).append('svg');

      function make_x_axis() {
         return d3.svg.axis().scale(x).orient("bottom");
      }
      function make_y_axis() {
         return d3.svg.axis().scale(y).orient("left").ticks(5);
      }

      // The grid
      svg.append("g")
         .attr('class', 'grid')
         .attr('transform', 'translate(0,' + (height - margin) + ')')
         .call(make_x_axis().tickSize(-height, 0).tickFormat(''));
      svg.append("g")
         .attr('class', 'grid')
         .attr("transform", 'translate(' + margin + ',0)')
         .call(make_y_axis().tickSize(-width, 0).tickFormat(''));

      // The axis
      svg.append("svg:g")
         .attr('class', 'axis x-axis')
         .attr('transform', 'translate(0,' + (height - margin) + ')')
         .call(make_x_axis());

      svg.append("svg:g")
         .attr('class', 'axis y-axis')
         .attr("transform", 'translate(' + margin + ',0)')
         .call(make_y_axis());

      // Add a group for each layer
      const groups = svg.selectAll("g.layer")
         .data(stacked)
         .enter()
         .append("g")
         .attr("class", "layer")
         .style('fill', (d, i) => this.colors(i))
         .style('stroke', (d, i) => d3.rgb(this.colors(i)).darker().toString());

      // Add a rect for each date.
      groups
         .selectAll('rect')
         .data((d : ILifeSpan[]) => d)
         .enter()
         .append("rect")
         .attr({
            title:  (d : ILifeSpan) => d.category + ': ' + d.value,
            x:      (d : ILifeSpan) => x(d.x),
            y:      (d : ILifeSpan) => y(d.y0) + y(d.y) - height + margin,
            height: (d : ILifeSpan) => height - margin - y(d.y),
            width:  (width - 0) / this.data.ages.length
         });
    }
}

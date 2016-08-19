import {Component, ElementRef, ViewChild} from '@angular/core';
import * as d3 from 'd3';
import {StatsData, StatsService} from './stats.service';

@Component({
   selector: 'stats-generations',
   template: require('./stats.generations.html'),
})
export class StatsGenerations {
   @ViewChild('thesvg') svgelement: ElementRef;
   data : StatsData;
   colors : d3.scale.Ordinal<string, string>;

   constructor(private stats : StatsService) {
      this.colors = d3.scale.category20b();
   }

   ngAfterViewInit() {
      // Once we found the 'thesvg' element
      this.stats.get().subscribe(data => {
         this.data = data;
         this.generations();
      });
   }

   generations() {
      // Our data is a 2D array of the form:
      //   [ [ gen_number, min_date, max_date, legend], ...]
      const elem = this.svgelement.nativeElement;
      const width = elem.clientWidth;
      const height = elem.clientHeight;
      const margin = 30;

      const svg = d3.select(elem).append('svg');

      const x = d3.scale.linear()
         .domain([d3.min(this.data.ranges, d => d[1]),
                  d3.max(this.data.ranges, d => d[2])])
         .range([margin, width]);
      const y = d3.scale.linear()
         .domain([this.data.ranges[0][0],
                  this.data.ranges[this.data.ranges.length - 1][0]])
         .range([height - margin, 0]);

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

      const rect = svg.selectAll("rect")
            .data(this.data.ranges)
            .enter().append("rect")
            .attr({
               fill   : d => this.colors(d[0].toString()),
               title  : d => d[3],
               x      : d => x(d[1]),
               width  : d => x(d[2]) - x(d[1]),
               y      : d => y(d[0] + 1),
               height : height / this.data.ranges.length
            });
   }
}

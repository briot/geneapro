import * as React from 'react';
import { Card } from 'semantic-ui-react';
import * as d3Color from 'd3-color';
import * as d3Selection from 'd3-selection';
import * as d3Scale from 'd3-scale';
import * as d3ScaleChromatic from 'd3-scale-chromatic';
import * as d3Axis from 'd3-axis';
import * as d3Shape from 'd3-shape';
import { JSONAges } from '../Server/Stats';

interface LifeSpan {
   age: number;      // the age
   total: number;
   males: number;
   females: number;
   unknown: number;
}

interface StatsLifespanProps {
   ages: JSONAges[];
}

export default class StatsLifespan extends React.PureComponent<StatsLifespanProps> {

   svg: SVGElement | null;

   componentDidMount() {
      this.draw();
   }

   componentDidUpdate() {
      this.draw();
   }

   color(gen: number) {
      return d3ScaleChromatic.schemeCategory10[gen % 20];
   }

   draw() {
      if (!this.svg) {
         return;
      }

      const remapped: LifeSpan[] = this.props.ages.map(
         (d: JSONAges) => ({
            age: d[0],
            males: d[1],
            females: d[2],
            unknown: d[3],
            total: d[1] + d[2] + d[3]}));

      const keys = ['males', 'females', 'unknown'];
      let stack = d3Shape.stack<LifeSpan>().keys(keys);
      const top = 10;
      const left = 80;
      const bottom = 20;
      const width = this.svg.clientWidth - left;
      const height = this.svg.clientHeight - top - bottom;
      const svg = d3Selection.select(this.svg);
      const g = svg.append('g')
         .attr('transform', `translate(${left},${top})`);

      const maxAge = Math.max.apply(null, remapped.map(d => d.age));
      const x = d3Scale.scaleLinear()
         .range([0, width])
         .domain([0, maxAge])
         .nice();
      const y = d3Scale.scaleLinear()
         .range([height, 0])
         .domain([0, Math.max.apply(null, remapped.map(d => d.total))])
         .nice();

      function make_x_axis() {
         return d3Axis.axisBottom(x).ticks(maxAge / 5);
      }
      function make_y_axis() {
         return d3Axis.axisLeft(y).ticks(5);
      }

      // The grid
      g .append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(make_x_axis().tickSize(-height).tickFormat(_ => ''));
      g .append('g')
        .attr('class', 'grid')
        .call(make_y_axis().tickSize(-width).tickFormat(_ => ''));

      // The axis
      g .append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(make_x_axis());
      g .append('g')
        .attr('class', 'axis y-axis')
        .call(make_y_axis());

      type LifeSpanSeriesPoint = d3Shape.SeriesPoint<LifeSpan>;
          // [0:y0, 1:y1, data:LifeSpan]
      type LifeSpanSeries = d3Shape.Series<LifeSpan, string>;
          // [0:y0, 1:y1, data:LifeSpan, key:String, index:number]

      const stacked: LifeSpanSeries[] = stack(remapped);
      const bandwidth = width / remapped.length - 3;

      g.selectAll('g.layer')
         .data(stacked)
         .enter()
            .append('g')
            .attr('class', 'layer')
            .style('fill', (d: LifeSpanSeries, i) => this.color(i))
            .style('stroke', (d, i) => d3Color.rgb(this.color(i)).darker().toString())
         .selectAll('rect')
         .data((d: LifeSpanSeries) => d)
         .enter()
            .append('rect')
            .attr('title', d => d[1] - d[0])
            .attr('x', (d: LifeSpanSeriesPoint) => x(d.data.age) || 0)
            .attr('y', (d: LifeSpanSeriesPoint) => y(d[1]))
            .attr('width', bandwidth)
            .attr('height', (d: LifeSpanSeriesPoint) => y(d[0]) - y(d[1]));

      const legend = g
         .selectAll('g.legend')
         .data(keys)
         .enter()
            .append('g')
               .attr('class', 'legend')
               .attr('transform', (d, index) => `translate(${width - 100},${(keys.length - 1 - index) * 20})`);

      legend.append('rect')
         .attr('fill', (d, index) => this.color(index))
         .attr('x', 0)
         .attr('width', 18)
         .attr('height', 18);

      legend.append('text')
         .attr('x', 25)
         .attr('y', 10)
         .text(d => d);

   }

   render() {
      return (
         <Card fluid={true} className="Stats">
            <Card.Content>
               <Card.Header>Lifespans timespan (oldest birth - latest death)</Card.Header>
               <Card.Description>
                  <svg ref={input => {this.svg = input; }} height="350" width="100%"/>
               </Card.Description>
            </Card.Content>
         </Card>
      );
   }
}

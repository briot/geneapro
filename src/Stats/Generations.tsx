import * as React from 'react';
import { Card } from 'semantic-ui-react';
import * as d3Selection from 'd3-selection';
import * as d3Scale from 'd3-scale';
import * as d3ScaleChromatic from 'd3-scale-chromatic';
import * as d3Axis from 'd3-axis';
import { JSONGenerationRange } from '../Server/Stats';
import { Person, personDisplay } from '../Store/Person';

interface StatsGenerationProps {
   decujus: Person;
   ranges: JSONGenerationRange[];
}

export default class StatsGeneration extends React.PureComponent<StatsGenerationProps> {

   svg: SVGElement | null = null;

   componentDidMount() {
      this.draw();
   }

   componentDidUpdate() {
      this.draw();
   }

   color(gen: number) {
      return d3ScaleChromatic.schemePastel1[gen % 10];
   }

   draw() {
      if (!this.svg) {
         return;
      }

      const width = this.svg.clientWidth;
      const height = this.svg.clientHeight;
      const margin = 30;
      const barHeight = height / this.props.ranges.length;
      const svg = d3Selection.select(this.svg);

      const x: d3Axis.AxisScale<number> = d3Scale.scaleLinear()
         .domain([Math.min.apply(null, this.props.ranges.map(d => d[1])),
                  Math.max.apply(null, this.props.ranges.map(d => d[2]))])
         .range([margin, width]);
      const y = d3Scale.scaleLinear()
         .domain([this.props.ranges[0][0],
                  this.props.ranges[this.props.ranges.length - 1][0]])
         .range([height - margin, barHeight]);

      function make_y_axis() {
         return d3Axis.axisLeft(y).ticks(5);
      }

      svg.selectAll('g').remove();
      svg.append('g').attr('class', 'grid')
         .attr('transform', `translate(0,${height - margin})`)
         .call(d3Axis.axisBottom(x).tickSize(-height).tickFormat(_ => '') as any);
      svg.append('g').attr('class', 'grid')
         .attr('transform', `translate(${margin})`)
         .call(make_y_axis().tickSize(-width).tickFormat(_ => '') as any);
      svg.append('g').attr('class', 'axis x-axis')
         .attr('transform', `translate(0,${height - margin})`)
         .call(d3Axis.axisBottom(x) as any);
      svg.append('g').attr('class', 'axis y-axis')
         .attr('transform', `translate(${margin},0)`)
         .call(make_y_axis() as any);

      // The bars
      const r = svg.selectAll('rect').data(this.props.ranges);
      r.enter().append('rect')
         .merge(r as any)  // update+enter
         .attr('fill', d => this.color(d[0]))
         .attr('title', d => d[3])
         .attr('x', d => x(d[1])!)
         .attr('y', d => y(d[0] + 1))
         .attr('width', d => x(d[2])! - x(d[1])!)
         .attr('height', barHeight);
   }

   render() {
      const name = personDisplay(this.props.decujus);
      return (
         <Card fluid={true} className="Stats">
            <Card.Content>
               <Card.Header>Generations timespan (oldest birth - latest death), in {name}'s tree</Card.Header>
               <Card.Description>
                  <svg ref={input => {this.svg = input; }} height="350" width="100%"/>
               </Card.Description>
            </Card.Content>
            <Card.Content extra={true} className="generationsLegend">
               {
                  this.props.ranges.slice(0).reverse().map(r => (
                     <div key={r[0]} id={'gen' + r[0]}>
                        <span style={{background: this.color(r[0])}}>&nbsp;</span>
                        {r[3]}
                     </div>
                  ))
               }
            </Card.Content>
         </Card>
      );
   }
}

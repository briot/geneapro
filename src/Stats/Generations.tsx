import * as React from 'react';
import { Card } from 'semantic-ui-react';
import * as d3Selection from 'd3-selection';
import * as d3Scale from 'd3-scale';
import * as d3ScaleChromatic from 'd3-scale-chromatic';
import * as d3Axis from 'd3-axis';
import { JSONGenerationRange } from '../Server/Stats';
import { Person, personDisplay } from '../Store/Person';

function color(gen: number) {
   return d3ScaleChromatic.schemeCategory10[gen % 10];
}

interface StatsGenerationProps {
   decujus: Person;
   ranges: JSONGenerationRange[];
}

const StatsGeneration = React.memo((p: StatsGenerationProps) => {
   const svgElem = React.useRef<SVGSVGElement|null>(null);

   React.useEffect(() => {
      if (!svgElem.current) {
         return;
      }

      const rect = svgElem.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const margin = 30;
      const barHeight = height / p.ranges.length;
      const svg = d3Selection.select(svgElem.current);

      const x: d3Axis.AxisScale<number> = d3Scale.scaleLinear()
         .domain([Math.min.apply(null, p.ranges.map(d => d[1])),
                  Math.max.apply(null, p.ranges.map(d => d[2]))])
         .range([margin, width]);
      const y = d3Scale.scaleLinear()
         .domain([p.ranges[0][0],
                  p.ranges[p.ranges.length - 1][0]])
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
      const r = svg.selectAll('rect').data(p.ranges);
      r.enter().append('rect')
         .merge(r as any)  // update+enter
         .attr('fill', d => color(d[0]))
         .attr('title', d => d[3])
         .attr('x', d => x(d[1])!)
         .attr('y', d => y(d[0] + 1))
         .attr('width', d => x(d[2])! - x(d[1])!)
         .attr('height', barHeight);
   });

   const name = personDisplay(p.decujus);
   return (
      <Card fluid={true} className="Stats">
         <Card.Content>
            <Card.Header>Generations timespan (oldest birth - latest death), in {name}'s tree</Card.Header>
            <Card.Description>
               <svg ref={svgElem} height="350" width="100%"/>
            </Card.Description>
         </Card.Content>
         <Card.Content extra={true} className="generationsLegend">
            {
               p.ranges.slice(0).reverse().map(r => (
                  <div key={r[0]} id={'gen' + r[0]}>
                     <span style={{background: color(r[0])}}>&nbsp;</span>
                     {r[3]}
                  </div>
               ))
            }
         </Card.Content>
      </Card>
   );
});

export default StatsGeneration;

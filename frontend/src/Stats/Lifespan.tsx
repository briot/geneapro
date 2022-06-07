import * as React from "react";
import { Card } from "semantic-ui-react";
import * as d3Color from "d3-color";
import * as d3Selection from "d3-selection";
import * as d3Scale from "d3-scale";
import * as d3ScaleChromatic from "d3-scale-chromatic";
import * as d3Axis from "d3-axis";
import * as d3Shape from "d3-shape";
import { JSONAges } from "../Server/Stats";
import { Person, personDisplay } from "../Store/Person";
import { StatsSettings } from "../Store/Stats";

function color(gen: number) {
   return d3ScaleChromatic.schemeCategory10[gen % 20];
}

interface LifeSpan {
   age: number; // the age
   total: number;
   males: number;
   females: number;
   unknown: number;
}

interface StatsLifespanProps {
   decujus: Person;
   settings: StatsSettings;
   ages: JSONAges[];
}

const StatsLifespan = React.memo((p: StatsLifespanProps) => {
   const svgElem = React.useRef<SVGSVGElement | null>(null);

   React.useEffect(() => {
      if (!svgElem.current) {
         return;
      }

      const remapped: LifeSpan[] = p.ages.map((d: JSONAges) => ({
         age: d[0],
         males: d[1],
         females: d[2],
         unknown: d[3],
         total: d[1] + d[2] + d[3]
      }));

      const keys = ["males", "females", "unknown"];
      const stack = d3Shape.stack<LifeSpan>().keys(keys);
      const top = 10;
      const left = 80;
      const bottom = 20;
      const rect = svgElem.current.getBoundingClientRect();
      const width = rect.width - left;
      const height = rect.height - top - bottom;
      const bar_width = p.settings.bar_width;
      const svg = d3Selection.select(svgElem.current);

      const maxAge = Math.max.apply(null, remapped.map(d => d.age)) + bar_width;

      // Compute where ticks should occur on x axis
      const tickValues: number[] = [];
      const maxTick = Math.floor(maxAge / bar_width) * bar_width;
      for (let a = 0; a <= maxTick; a += bar_width) {
         tickValues.push(a);
      }

      const x = d3Scale
         .scaleLinear()
         .range([0, width])
         .domain([0, maxAge])
         .nice();
      const y = d3Scale
         .scaleLinear()
         .range([height, 0])
         .domain([0, Math.max.apply(null, remapped.map(d => d.total))])
         .nice();

      const make_x_axis = () => d3Axis.axisBottom(x).tickValues(tickValues);
      const make_y_axis = () => d3Axis.axisLeft(y).ticks(5);

      svg.selectAll("g.forgrid").remove();
      svg.append("g")
         .attr("class", "grid forgrid")
         .attr("transform", `translate(${left},${top + height})`)
         .call(
            make_x_axis()
               .tickSize(-height)
               .tickFormat(() => "")
         );
      svg.append("g")
         .attr("class", "grid forgrid")
         .attr("transform", `translate(${left},${top})`)
         .call(
            make_y_axis()
               .tickSize(-width)
               .tickFormat(() => "")
         );
      svg.append("g")
         .attr("class", "axis x-axis forgrid")
         .attr("transform", `translate(${left},${top + height})`)
         .call(make_x_axis());
      svg.append("g")
         .attr("class", "axis y-axis forgrid")
         .attr("transform", `translate(${left},${top})`)
         .call(make_y_axis());

      svg.selectAll("g.bars").remove();
      const g = svg
         .append("g")
         .attr("class", "bars")
         .attr("transform", `translate(${left},${top})`);
      type LifeSpanSeriesPoint = d3Shape.SeriesPoint<LifeSpan>;
      // [0:y0, 1:y1, data:LifeSpan]
      type LifeSpanSeries = d3Shape.Series<LifeSpan, string>;
      // [0:y0, 1:y1, data:LifeSpan, key:String, index:number]

      const stacked: LifeSpanSeries[] = stack(remapped);
      const bandwidth = x(bar_width) - x(0);
      g.selectAll("g.layer")
         .data(stacked)
         .enter()
         .append("g")
         .attr("class", "layer")
         .style("fill", (d: LifeSpanSeries, i) => color(i))
         .style("stroke", (d, i) =>
            d3Color
               .rgb(color(i))
               .darker()
               .toString()
         )
         .selectAll("rect")
         .data((d: LifeSpanSeries) => d)
         .enter()
         .append("rect")
         .attr("title", d => d[1] - d[0])
         .attr("x", (d: LifeSpanSeriesPoint) => x(d.data.age) || 0)
         .attr("y", (d: LifeSpanSeriesPoint) => y(d[1]))
         .attr("width", bandwidth)
         .attr("height", (d: LifeSpanSeriesPoint) => y(d[0]) - y(d[1]));

      const legend = g
         .selectAll("g.legend")
         .data(keys)
         .enter()
         .append("g")
         .attr("class", "legend")
         .attr(
            "transform",
            (d, index) =>
               `translate(${width - 100},${(keys.length - 1 - index) * 20})`
         );

      legend
         .append("rect")
         .attr("fill", (d, index) => color(index))
         .attr("x", 0)
         .attr("width", 18)
         .attr("height", 18);

      legend
         .append("text")
         .attr("x", 25)
         .attr("y", 10)
         .text(d => d);
   });

   const name = personDisplay(p.decujus);

   return (
      <Card fluid={true} className="Stats">
         <Card.Content>
            <Card.Header>Age at death, in {name}&apos;s tree</Card.Header>
            <Card.Description>
               <svg ref={svgElem} height="350" width="100%" />
            </Card.Description>
         </Card.Content>
      </Card>
   );
});

export default StatsLifespan;

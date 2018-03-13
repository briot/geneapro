import * as React from 'react';
import { arc } from 'd3-shape';
import { path } from 'd3-path';
import { Link } from 'react-router-dom';
import { Person, PersonSet } from '../Store/Person';
import { FanchartSettings } from '../Store/Fanchart';
import { GenealogyEventSet } from '../Store/Event';
import { PersonLayout, PersonLayouts } from '../Fanchart/types';
import { Style, styleToString } from '../style';
import ScalableSVG from '../SVG.Scalable';
import { event_to_string } from '../Store/Event';

import './Fanchart.css';

interface FanchartProps {
   settings: FanchartSettings;
   layouts: PersonLayouts;
   allEvents: GenealogyEventSet;
   persons: PersonSet;
   decujus: number;
}

export function Fanchart(props: FanchartProps) {
   const boxes: JSX.Element[] = [];
   const seps: JSX.Element[] = [];
   const marriages: JSX.Element[] = [];

   const separatorArc = arc<PersonLayout>()
      .startAngle(p => p.minAngle)
      .endAngle(p => p.maxAngle)
      .innerRadius(p => p.maxRadius)
      .outerRadius(p => p.maxRadius + props.layouts.spaceBetweenGens);

   const recurse = (pl: PersonLayout) => {
      const p: Person|undefined = props.persons[pl.id];
      boxes.push(
         <FanchartBox
            person={p}
            layout={pl}
            allEvents={props.allEvents}
            settings={props.settings}
            key={pl.id}
         />
      );

      if (props.layouts.spaceBetweenGens !== 0) {
         const d = separatorArc(pl) as string;
         const style = Style.forSeparator(props.settings.sepColors, pl);
         seps.push(
            <path
               className="separator"
               {...styleToString(style)}
               d={d}
               key={pl.id}
            />
         );
      }

      if (pl.parentsMarriage) {
         marriages.push(
            <FanchartMarriage
               settings={props.settings}
               gapHeight={props.layouts.spaceBetweenGens}
               layout={pl}
               key={pl.id}
            />
         );
      }

      for (let p2 of pl.parents) {
         if (p2) {
            recurse(p2);
         }
      }
   };
   recurse(props.layouts[props.decujus]);

   const recurseChildren = (pl: PersonLayout) => {
      for (let c of pl.children) {
         const p: Person|undefined = props.persons[c.id];
         boxes.push(
            <g transform="translate(0,10)" key={c.id}>
               <FanchartBox
                  person={p}
                  layout={c}
                  allEvents={props.allEvents}
                  settings={props.settings}
               />
               {
                  props.layouts.spaceBetweenGens !== 0 && (
                     <path
                        className="separator"
                        {...styleToString(Style.forSeparator(props.settings.sepColors, c))}
                        d={separatorArc(c) as string}
                        key={c.id}
                     />
                  )
               }
            </g>
         );

         recurseChildren(c);
      }
   };
   recurseChildren(props.layouts[props.decujus]);

   const transform = `translate(${props.layouts.centerX + 10},${props.layouts.centerY + 10})`;
   return (
      <ScalableSVG className="Fanchart">
         <g transform={transform}>
            {seps}
            {marriages}
            {boxes}
         </g>
      </ScalableSVG>
   );
}

/**
 * Standard % has the same size for the modulo as the dividend,
 * as opposed to standard math
 */
function modulo(a: number, b: number): number {
   const r = a % b;
   return (r * b < 0) ? r + b : r;
}

/**
 * Normalize an angle to be in the range [0-2PI]
 */
function standardAngle(angle: number): number {
   return modulo(angle, 2 * Math.PI);
}

/**
 * FanchartMarriage
 */

interface FanchartMarriageProps {
   gapHeight: number;
   layout: PersonLayout;
   settings: FanchartSettings;
}
export function FanchartMarriage(props: FanchartMarriageProps) {
   if (!props.layout.parentsMarriage) {
      return null;
   }

   let m = props.layout.minAngle - Math.PI / 2;
   let M = props.layout.maxAngle - Math.PI / 2;

   const td = path();
   td.arc(
      0, 0,
      props.layout.maxRadius + props.gapHeight / 2,
      m, M);

   return (
      <g className="marriage">
         <path
            fill="none"
            id={'marr' + props.layout.id}
            d={td.toString()}
         />
         <text>
            <textPath
               startOffset="50%"
               textAnchor="middle"
               alignmentBaseline="middle"
               xlinkHref={'#marr' + props.layout.id}
            >
               {props.layout.parentsMarriage.text}
            </textPath>
         </text>
      </g>
   );
}

/**
 * FanchartBox
 */

const fanarc = arc<PersonLayout>()
   .cornerRadius(0)
   .startAngle(p => p.minAngle)
   .endAngle(p => p.maxAngle)
   .innerRadius(p => p.minRadius)
   .outerRadius(p => p.maxRadius);

interface FanchartBoxProps {
   person: Person|undefined;
   layout: PersonLayout;
   settings: FanchartSettings;
   allEvents: GenealogyEventSet;
}

const MIN_ANGLE_STRAIGHT_TEXT = 15 * Math.PI / 180;

export function FanchartBox(props: FanchartBoxProps) {
   const d = fanarc(props.layout) as string;
   const style = Style.forPerson(props.settings.colors, props.layout);
   const children: JSX.Element[] = [];
   const diff = props.layout.maxAngle - props.layout.minAngle;

   const td = path();
   if (Math.abs(props.layout.generation) >= props.settings.straightTextThreshold
       || Math.abs(diff) < MIN_ANGLE_STRAIGHT_TEXT
   ) {
      const a = standardAngle(
         (props.layout.minAngle + props.layout.maxAngle) / 2) - Math.PI / 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      let r = props.layout.minRadius;
      let R = props.layout.maxRadius;
      if (props.settings.readableText && (a < -Math.PI / 2 || a > Math.PI / 2)) {
         [r, R] = [R, r];
      }
      td.moveTo(r * ca, r * sa);
      td.lineTo(R * ca, R * sa);

   } else {
      const m = props.layout.minAngle - Math.PI / 2;
      const M = props.layout.maxAngle - Math.PI / 2;
      const r = (props.layout.minRadius + props.layout.maxRadius) / 2;

      // Reverse display of children names
      if (props.layout.generation < 0) {
         td.arc(0, 0, r, M, m, true);
      } else {
         td.arc(0, 0, r, m, M);
      }

      // Else compute if middle of box is in lower half
      // const PI2 = Math.PI * 2;
      // let c: number;
      // if (props.settings.readableText) {
      //   const middle = (m + M) / 2;
      //   const c = middle - Math.floor(middle / PI2) * PI2;
      //   lowerHalf = c < Math.PI;
   }

   if (props.person) {
      children.push(
         <path
            className="name"
            stroke="none"
            fill="none"
            id={'text' + props.layout.id}
            d={td.toString()}
            key="path"
         />
      );

      const birth = event_to_string(
         props.person.birthEventId ?
            props.allEvents[props.person.birthEventId] : undefined,
         props.settings.showSourcedEvents /* showSources */,
         true /* useDateSort */,
         true /* yearOnly */);
      const death = event_to_string(
         props.person.deathEventId ?
            props.allEvents[props.person.deathEventId] : undefined,
         props.settings.showSourcedEvents /* showSources */,
         true /* useDateSort */,
         true /* yearOnly */);
      const dates = `${birth} - ${death}`;

      children.push(
         <text key="text">
            <textPath
               startOffset="50%"
               textAnchor="middle"
               xlinkHref={'#text' + props.layout.id}
            >
               <tspan dy="0em" className="name">{props.person.surn}</tspan>
            </textPath>
            <textPath
               startOffset="50%"
               textAnchor="middle"
               xlinkHref={'#text' + props.layout.id}
            >
               <tspan dy="1em" className="name">{props.person.givn}</tspan>
            </textPath>
            <textPath
               startOffset="50%"
               textAnchor="middle"
               xlinkHref={'#text' + props.layout.id}
            >
               <tspan dy="1.3em" className="details">{dates}</tspan>
            </textPath>
         </text>
      );
   }

   const link = props.person ?  '/fanchart/' + props.person.id : '#';

   return (
      <Link to={link}>
         <g>
            <path
               className="background"
               {...styleToString(style)}
               d={d}
            />
            {children}
         </g>
      </Link>
   );
}

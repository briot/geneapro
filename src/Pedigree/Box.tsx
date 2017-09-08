import * as React from 'react';
import { Link } from 'react-router-dom';
import { Style, styleToString } from '../style';
import { Person } from '../Store/Person';
import { PedigreeSettings } from '../Store/Pedigree';
import { PersonLayout } from '../Pedigree/types';
import EventText from './Event';

interface PedigreeBoxProps {
   person: Person|undefined;
   layout: PersonLayout;
   style: PedigreeSettings;
}

export default function PedigreeBox(props: PedigreeBoxProps) {
   const p: Person|undefined = props.person;
   const layout = props.layout;
   const translate = `translate(${layout.x},${layout.y})`;

   const details: JSX.Element[] = [];
   if (p) {
      if (p.birth) {
         details.push(
            <EventText
               event={p.birth}
               showSources={props.style.showSourcedEvents}
               key="birth"
               prefix="b"
            />);
      }
      if (p.death) {
         details.push(
            <EventText
               event={p.death}
               key="death"
               showSources={props.style.showSourcedEvents}
               prefix="d"
            />);
      }
   }

   const text = p === undefined ?
      null :
      (
         <text
            fontSize={layout.fs}
            clipPath={p ? 'url(#clipGen' + layout.generation + ')' : ''}
         >
            <tspan dy={layout.fs} className="name" x="2">
               {p.givn} {p.surn}
            </tspan>
            {details}
         </text>
      );

   const style = Style.forPerson(props.style.colors, layout);
   const link = props.person ? '/pedigree/' + props.person.id : '#';
   return (
      <Link to={link}>
         <g
            className="person"
            transform={translate}
         >
            <rect
               width={layout.w}
               height={layout.h}
               rx={layout.radius + 'px'}
               ry={layout.radius + 'px'}
               {...styleToString(style)}
            />
            {text}
         </g>
      </Link>
   );
}

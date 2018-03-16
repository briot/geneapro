import * as React from 'react';
import { Link } from 'react-router-dom';
import { Style } from '../style';
import { styleToString } from '../Store/Styles';
import { Person } from '../Store/Person';
import { PedigreeSettings } from '../Store/Pedigree';
import { GenealogyEventSet } from '../Store/Event';
import { PlaceSet } from '../Store/Place';
import { PersonLayout } from '../Pedigree/types';
import EventText from './Event';

interface PedigreeBoxProps {
   person: Person|undefined;
   allEvents: GenealogyEventSet;
   allPlaces: PlaceSet;
   layout: PersonLayout;
   style: PedigreeSettings;
}

export default function PedigreeBox(props: PedigreeBoxProps) {
   const p: Person|undefined = props.person;
   const layout = props.layout;
   const translate = `translate(${layout.x},${layout.y})`;

   const details: JSX.Element[] = [];
   if (p) {
      if (p.birthEventId && p.birthEventId in props.allEvents) {
         details.push(
            <EventText
               event={props.allEvents[p.birthEventId]}
               showSources={props.style.showSourcedEvents}
               allPlaces={props.allPlaces}
               key="birth"
               prefix="b"
            />);
      }
      if (p.deathEventId && p.deathEventId in props.allEvents) {
         details.push(
            <EventText
               event={props.allEvents[p.deathEventId]}
               key="death"
               showSources={props.style.showSourcedEvents}
               allPlaces={props.allPlaces}
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

   const style = Style.forPerson(props.style.colors, p, layout);
   const link = p ? '/pedigree/' + p.id : '#';
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

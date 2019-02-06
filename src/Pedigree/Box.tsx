import * as React from 'react';
import { Link } from 'react-router-dom';
import { Style } from '../style';
import { combineStyles, styleToSVGText, styleToSVG } from '../Store/Styles';
import { Person } from '../Store/Person';
import { ColorScheme, PedigreeSettings } from '../Store/Pedigree';
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

   const details = p ? [
      <EventText key="b" isoDate={p.birthISODate} prefix="b" />,
      <EventText key="d" isoDate={p.deathISODate} prefix="d" />
   ] : undefined;

   const style = Style.forPerson(props.style.colors, p, layout);
   const textStyle = styleToSVGText(combineStyles(
      style, Style.forPedigreeName(props.style.colors)));

   const text = p === undefined ?
      null :
      (
         <text
            fontSize={layout.fs}
            clipPath={p ? 'url(#clipGen' + layout.generation + ')' : ''}
         >
            <tspan dy={layout.fs} style={textStyle} x="2">
               {p.name}
            </tspan>
            {details}
         </text>
      );

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
               style={styleToSVG(style)}
            />
            {text}
         </g>
      </Link>
   );
}

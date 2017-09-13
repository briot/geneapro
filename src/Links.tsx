import * as React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from 'semantic-ui-react';
import './Links.css';

/**
 * persona links
 */

export function urlPersona(id: number) {
   return '/persona/' + id;
}

interface PersonaLinkProps {
   id: number;
   surn?: string;  // will be upper-cased
   givn?: string;  // displayed as-is
   className?: string;
}

export function PersonaLink(props: PersonaLinkProps) {
   return (
      <Link to={urlPersona(props.id)} className={props.className + ' personaLink'}>
         <Icon name="user" />
         {props.surn ? props.surn.toUpperCase() + ' ' : ''}
         {props.givn ? props.givn : ''}
      </Link>
   );
}

/**
 * source links
 */

export function urlSource(id: number) {
   return '/source/' + id;
}

interface SourceLinkProps {
   id: number;
   className?: string;
}

export function SourceLink(props: SourceLinkProps) {
   return (
      <Link to={urlSource(props.id)} className={props.className + ' sourceLink'}>
         <Icon name="book" />
         <span>{props.id}</span>
      </Link>
   );
}

/**
 * Place links
 */

export function urlPlace(id: number) {
   return '/place/' + id;
}

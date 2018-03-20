import * as React from 'react';
import { connect } from 'react-redux';
import { AppState } from './Store/State';
import { Link } from 'react-router-dom';
import { Icon } from 'semantic-ui-react';
import { Place } from './Store/Place';
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
   name?: string;
   className?: string;
}

export function SourceLink(props: SourceLinkProps) {
   return (
      <Link to={urlSource(props.id)} className={props.className + ' sourceLink'}>
         <Icon name="book" />
         <span className="id">{props.id}</span>
         {props.name ?
            <span className="title">{props.name}</span> :
            null
         }
      </Link>
   );
}

/**
 * Place links
 */

export function urlPlace(id: number) {
   return '/place/' + id;
}

interface PlaceLinkProps {
   id: number;
   className?: string;
}
interface ConnectedPlaceLinkProps extends PlaceLinkProps {
   place?: Place;
}

export function ConnectedPlaceLink(props: ConnectedPlaceLinkProps) {
   return (
      <Link to={urlPlace(props.id)} className={props.className + ' placeLink'}>
         <Icon name="globe" />
         {props.place ? props.place.name : 'Unnamed place'}
      </Link>
   );
}

export const PlaceLink = connect(
   (state: AppState, props: PlaceLinkProps) => ({
      ...props,
      place: state.places[props.id],
   }),
)(ConnectedPlaceLink);

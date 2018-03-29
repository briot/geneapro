import * as React from 'react';
import { connect } from 'react-redux';
import { AppState } from './Store/State';
import { Link } from 'react-router-dom';
import { Icon } from 'semantic-ui-react';
import { Place } from './Store/Place';
import { SourceSet } from './Store/Source';
import { personDisplay, Person } from './Store/Person';
import './Links.css';

/**
 * persona links
 */

export function urlPersona(id: number) {
   return '/persona/' + id;
}

interface PersonaLinkProps {
   id: number;
}
interface ConnectedPersonaLinkProps extends PersonaLinkProps {
   person: Person|undefined;
}

function ConnectedPersonaLink(props: ConnectedPersonaLinkProps) {
   return (
      <Link to={urlPersona(props.id)} className="personaLink">
         <Icon name="user" />
         {personDisplay(props.person)}
      </Link>
   );
}
export const PersonaLink = connect(
   (state: AppState, props: PersonaLinkProps) => ({
      ...props,
      person: state.persons[props.id],
   }),
)(ConnectedPersonaLink);

/**
 * source links
 */

export function urlSource(id: number) {
   return '/source/' + id;
}

interface SourceLinkProps {
   id: number;
   showName?: boolean;
}
interface ConnectedSourceLinkProps extends SourceLinkProps {
   sources: SourceSet;
}

function ConnectedSourceLink(props: ConnectedSourceLinkProps) {
   const s = props.sources[props.id];
   return (
      <Link to={urlSource(props.id)} className="sourceLink">
         <span title={s ? s.title : undefined}>
            <Icon name="book" />
            <span className="id">{props.id}</span>
            {s && props.showName ?  <span className="title">{s.abbrev}</span> : null}
         </span>
      </Link>
   );
}
export const SourceLink = connect(
   (state: AppState, props: SourceLinkProps) => ({
      ...props,
      sources: state.sources,
   })
)(ConnectedSourceLink);

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

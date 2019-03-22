import * as React from "react";
import { connect } from "react-redux";
import { AppState } from "./Store/State";
import { Link } from "react-router-dom";
import { Icon } from "semantic-ui-react";
import { Place } from "./Store/Place";
import { Source } from "./Store/Source";
import { personDisplay, Person } from "./Store/Person";
import "./Links.css";

/**
 * persona links
 */

export function urlPersona(id: number) {
   return "/persona/" + id;
}

interface PersonaLinkProps {
   id?: number;   // either id or person must be specified
   hideIcon?: boolean;
   person?: Person;
}
function ConnectedPersonaLink(p: PersonaLinkProps) {
   if (!p.person) {
      return <span>Unknown person</span>;
   }

   const s = personDisplay(p.person);
   return (
      <Link to={urlPersona(p.person.id)} className="link persona" title={s}>
         {!p.hideIcon && <Icon name="user" />}
         {s}
         <span className="id">{p.person.id}</span>
      </Link>
   );
}
export const PersonaLink = connect(
   (state: AppState, props: PersonaLinkProps) => ({
      ...props,
      person: props.person ||
         (props.id !== undefined && state.persons[props.id])
   })
)(ConnectedPersonaLink);

/**
 * source links
 */

export function urlSource(id: number) {
   return "/source/" + id;
}

interface SourceLinkProps {
   id: number | undefined;
   showAbbrev?: boolean;
}
interface ConnectedSourceLinkProps extends SourceLinkProps {
   source: Source;
}

function ConnectedSourceLink(props: ConnectedSourceLinkProps) {
   if (props.id === undefined) {
      return null;
   }

   const s = props.source;
   return (
      <Link
         to={urlSource(props.id)}
         className="link source"
         title={s ? s.title : undefined}
      >
         <Icon name="book" />
         {s && props.showAbbrev ? (
            <span className="title">{s.abbrev}</span>
         ) : (
            <span className="notitle" />
         )}
         <span className="id">{props.id}</span>
      </Link>
   );
}
export const SourceLink = connect(
   (state: AppState, props: SourceLinkProps) => ({
      ...props,
      source: props.id === undefined ? undefined : state.sources[props.id]
   })
)(ConnectedSourceLink);

/**
 * Place links
 */

export function urlPlace(id: number) {
   return "/place/" + id;
}

interface PlaceLinkProps {
   id: number;
}
interface ConnectedPlaceLinkProps extends PlaceLinkProps {
   place?: Place;
}

export function ConnectedPlaceLink(props: ConnectedPlaceLinkProps) {
   return (
      <Link to={urlPlace(props.id)} className="link  place">
         <Icon name="globe" />
         {props.place ? props.place.name : "Unnamed place"}
      </Link>
   );
}

export const PlaceLink = connect((state: AppState, props: PlaceLinkProps) => ({
   ...props,
   place: state.places[props.id]
}))(ConnectedPlaceLink);

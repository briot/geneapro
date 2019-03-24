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
   id?: number;
   showAbbrev?: boolean;
   source?: Source;
}
function ConnectedSourceLink(props: SourceLinkProps) {
   const s = props.source;
   if (!s) {
      return <span>Unknown source</span>;
   }
   return (
      <Link
         to={urlSource(s.id)}
         className="link source"
         title={s ? s.title : undefined}
      >
         <Icon name="book" />
         {s && props.showAbbrev ? (
            <span className="title">{s.abbrev}</span>
         ) : (
            <span className="notitle" />
         )}
         <span className="id">{s.id}</span>
      </Link>
   );
}
export const SourceLink = connect(
   (state: AppState, props: SourceLinkProps) => ({
      ...props,
      source: props.source ||
         (props.id === undefined ? undefined : state.sources[props.id])
   })
)(ConnectedSourceLink);

/**
 * Place links
 */

export function urlPlace(id: number) {
   return "/place/" + id;
}

interface PlaceLinkProps {
   id?: number;
   place?: Place;
}
export function ConnectedPlaceLink(props: PlaceLinkProps) {
   if (!props.place) {
      return <span>Unknown place</span>;
   }
   return (
      <Link to={urlPlace(props.place.id)} className="link  place">
         <Icon name="globe" />
         {props.place ? props.place.name : "Unnamed place"}
      </Link>
   );
}

export const PlaceLink = connect((state: AppState, props: PlaceLinkProps) => ({
   ...props,
   place: props.place || (props.id !== undefined && state.places[props.id])
}))(ConnectedPlaceLink);

import * as React from "react";
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
   person: Person|undefined;
   hideIcon?: boolean;
}
export const PersonaLink: React.FC<PersonaLinkProps> = (p) => {
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

/**
 * source links
 */

export function urlSource(id: number) {
   return "/source/" + id;
}

interface SourceLinkProps {
   source: Source|undefined;
   showAbbrev?: boolean;
}
export const SourceLink: React.FC<SourceLinkProps> = (p) => {
   return p.source
      ? (
         <Link
            to={urlSource(p.source.id)}
            className="link source"
            title={p.source.title}
         >
            <Icon name="book" />
            {p.showAbbrev ? (
               <span className="title">{p.source.abbrev}</span>
            ) : (
               <span className="notitle" />
            )}
            <span className="id">{p.source.id}</span>
         </Link>
      ) : <span>Unknown source</span>;
}

/**
 * Place links
 */

export function urlPlace(id: number) {
   return "/place/" + id;
}

interface PlaceLinkProps {
   place: Place|undefined;
}
export const PlaceLink: React.FC<PlaceLinkProps> = (p) => {
   return p.place
      ? (
         <Link to={urlPlace(p.place.id)} className="link place">
            <Icon name="globe" />
            {p.place.name}
         </Link>
      ) : <span>Unknown place</span>;
}

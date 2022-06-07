import * as React from "react";
import { Link } from "react-router-dom";
import { Icon } from "semantic-ui-react";
import { Place } from "./Store/Place";
import { Source } from "./Store/Source";
import { personDisplay, Person } from "./Store/Person";
import { DndData } from "./Draggable";
import "./Links.css";

export class URL {
   // eslint-disable-next-line no-useless-constructor
   public constructor(
      public path: string,
      public accept: 'person'|'place'|'source',
   ) {
   }

   public url(id: DndData|number) {
      if (typeof id !== "number" && id.kind === this.accept) {
         id = id.id;
      }
      return this.path.replace(":id", id.toString());
   }

   static dashboard = new URL('/:id', 'person');
   static fanchart = new URL('/fanchart/:id', 'person');
   static pedigree = new URL('/pedigree/:id', 'person');
   static persona = new URL('/persona/:id', 'person');
   static quilts = new URL('/quilts/:id', 'person');
   static place = new URL('/place/:id', 'place');
   static radial = new URL('/radial/:id', 'person');
   static source = new URL('/source/:id', 'source');
   static stats = new URL('/stats/:id', 'person');
}

/**
 * persona links
 */

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
      <Link
         to={URL.persona.url(p.person.id)}
         className="link persona"
         title={s}
      >
         {!p.hideIcon && <Icon name="user" />}
         {s}
         <span className="id">{p.person.id}</span>
      </Link>
   );
}

/**
 * source links
 */

interface SourceLinkProps {
   source: Source|undefined;
   showAbbrev?: boolean;
}
export const SourceLink: React.FC<SourceLinkProps> = (p) => {
   return p.source
      ? (
         <Link
            to={URL.source.url(p.source.id)}
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

interface PlaceLinkProps {
   place: Place|undefined;
}
export const PlaceLink: React.FC<PlaceLinkProps> = (p) => {
   return p.place
      ? (
         <Link to={URL.place.url(p.place.id)} className="link place">
            <Icon name="globe" />
            {p.place.name}
         </Link>
      ) : <span>Unknown place</span>;
}

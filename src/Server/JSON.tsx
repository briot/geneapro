import { SourceMedia } from '../Store/Source';

/**
 * The data sent by the server
 */

export namespace JSON {
   export interface Style  {
      [cssName: string]: string;
   }
  
   export interface EventType {
      id: number;
      name: string;  // "birth"
      gedcom: string;
   }
   
   export interface Event {
      id: number;
      date: string;
      date_sort: string;
      name: string;
      place?: number;
      type: EventType;
   }
   
   export interface Person {
      id: number;
      name: string;  // As found in the source document
      parents?: (number|null)[];
      children?: (number|null)[];
      birthISODate?: string;
      deathISODate?: string;
      marriageISODate?: string;
      style?: number;  // index into the styles array
   }
   
   export interface Persons {
      persons: Person[];
   }

   export interface Researcher {
      id: number;
      name: string;
      comment: string;
   }

   export interface CitationPart {
      name: string;
      value: string;
      fromHigh: boolean;  // true if from a higher level source
   }
 
   export interface Source {
      id: number;
      abbrev: string;  // abbreviated citation
      biblio: string;  // bibliographic citation
      title: string;   // full citation
      comments: string;
      higher_source_id: number | null;
      jurisdiction_place?: string;
      last_change: string;
      medium: string;
      researcher: number;
      subject_date?: string;
      subject_place?: string;
   }

   export interface Characteristic {
      date?: string;
      date_sort?: string;
      name: string;
      place?: number;
      sources: Source[]; 
   }
   
   export interface CharPart {
      name: string;
      value: string;
   }
   
   export interface SourceRepr {
      comments: string;
      id: number;
      file: string;        // path to the file
      mime: string;        // type of the image
      source_id: number;   // ??? Not needed
      url: string;         // how to get the image from the server
   }
   
   export interface Assertion {
      id: number;
      disproved: boolean;
      rationale: string;
      last_change: string;
      source_id: number;
      surety: number;
      researcher: number;
   }
   
   export interface P2E extends Assertion {
      p1: {person: number};
      p2: {role: string; event: number};
   }
   
   export interface P2C extends Assertion {
      p1: {person: number};
      p2: {char: Characteristic;
           repr: SourceRepr[] | undefined;   // when char.name=="image" only
           parts: CharPart[]};
   }
   
   export interface P2P extends Assertion {
      p1: {person: number};
      p2: {person: number};
      type: string;   // type of relationship
   }
   
   export interface P2G extends Assertion {
      p1: {person: number};
   }
   
   export interface Place {
      id: number;
      name: string;
      date: string|null;
      date_sort: string|null;
      parent_place_id: number;
   }

   /*****************************
    * Converters to store types *
    *****************************/

   export function toMedia(r: SourceRepr): SourceMedia {
      return {
         id: r.id,
         comments: r.comments,
         file: r.file,
         mime: r.mime,
         url: r.url,
      };
   }
}

export type FontWeight = number | "bold" | "normal" | "lighter" | "bolder";

/**
 * The data sent by the server
 */

export interface Style {
   fill?: string;
   stroke?: string;
   color?: string;
   fontWeight?: FontWeight;
}

export interface PartType {
   id: number;
   name: string; // "birth"
   gedcom: string;
}

type EventType = PartType;

export interface CharacteristicPartType extends PartType {
   is_name_part: boolean;
}

export interface Event {
   id: number;
   date: string;
   date_sort: string;
   name: string;
   place?: number;
   type: EventType;
}

export interface EventTypeRole {
   id: number;
   type_id: number | null; // What event types this role applies to
   // `null` for all event types
   name: string; // role name
}

export interface P2PType {
   id: number;
   name: string;
}

export interface Researcher {
   id: number;
   name: string;
   comment: string;
}

export type OperatorString = string;
export type OperatorTypes = "int" | "str" | "bool" | "person";
export interface OperatorDescr {
   op: OperatorString;
   label: string;
   basetype: OperatorTypes;
   is_list: boolean;
}
export type OperatorList = OperatorDescr[];

export type ColorSchemeId = number;
export interface ColorScheme {
   id: ColorSchemeId;
   name: string;
}
export interface Metadata {
   characteristic_types: CharacteristicPartType[];
   event_types: EventType[];
   event_type_roles: EventTypeRole[];
   p2p_types: P2PType[];
   researchers: Researcher[];
   theme_operators: OperatorList;
   themes: ColorScheme[];
}

export interface Person {
   id: number;
   display_name: string; // As found in the source document
   parents?: (number | null)[];
   children?: (number | null)[];
   birthISODate?: string;
   deathISODate?: string;
   marriageISODate?: string;
   sex?: string;
}

export interface Persons {
   persons: Person[];
}

export interface CitationPart {
   name: number;  // pointer to CitationPartTypes
   value: string;
   fromHigh: boolean; // true if from a higher level source
}

export interface Source {
   id: number;
   abbrev: string; // abbreviated citation
   biblio: string; // bibliographic citation
   title: string; // full citation
   comments: string;
   higher_source_id: number | null;
   jurisdiction_place?: string;
   last_change: string;
   medium: string;
   researcher: number;  // pointer to researcher
   subject_date?: string;
   subject_place?: string;
}

export interface Characteristic {
   date?: string;
   date_sort?: string|null;
   name: string;
   place?: number;  // points to a Place
}

export interface CharacteristicPart {
   type: number;   // points to a CharacteristicPartType
   value: string;
}

export interface SourceRepr {
   comments: string;
   id: number;
   file: string; // path to the file
   mime: string; // type of the image
   url: string; // how to get the image from the server
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
   p1: { person: number };
   p2: { role: number; event: number };
}

export interface P2C extends Assertion {
   p1: { person: number };
   p2: {
      char: Characteristic;
      repr: SourceRepr[] | undefined; // when char.name=="image" only
      parts: CharacteristicPart[];
   };
}

export interface P2P extends Assertion {
   p1: { person: number};
   p2: { person: number};
   type: number; // type of relationship
}

export interface P2G extends Assertion {
   p1: { person: number };
   p2: { group: number; role: number };
}

export interface Place {
   id: number;
   name: string;
   date: string | null;
   date_sort: string | null;
   parent_place_id: number;
}

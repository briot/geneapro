// Do not use external modules, since otherwise we can no longer use internal
// modules.

export enum LayoutScheme {EXPANDED = 0, COMPACT = 1}
export enum Appearance {FLAT = 0, GRADIENT = 1}
export enum LinkStyle {STRAIGHT = 0, ORTHOGONAL = 1, CURVE = 2}
export enum ColorScheme {
   RULES = 0,
   //  color of a person's box is computed on the server, depending on the
   //  highlighting rules defined by the user

   PEDIGREE = 1,
   //  The color of a person's box depends on its location in the pedigree

   GENERATION = 2,
   //  The color depends on the generation

   WHITE = 3,
   //  No border or background for boxes

   TRANSPARENT = 4,
   //  No background, black stroke

   QUARTILE = 5,
   //  Base color depends on the grand-parent of the decujus
}

export interface IRectangle {
   x      : number;  // top-left corner
   y      : number;  // top-left corner
   width  : number;
   height : number
}

export interface IStyle {
   fill   ?: string;
   stroke ?: string;
   color  ?: string;
}

export interface IStyleIdToStyle {
   [id : number] : IStyle;
}
export interface ISource {
   id                 : number;
   medium             : string;
   title              : string;
   abbrev             : string;
   biblio             : string;
   jurisdiction_place ?: IPlace;
   comments           : string;
   last_change        : string;
   researcher         : IResearcher;
   subject_date       : string;
   subjectPlace       : IPlace;
}
export interface IPlace {
   id        : number;
   name      : string;
}
export interface IPartType {
   name      : string;
}
export interface IEvent {
   id        ?: number;
   sources   ?: Array<ISource>;   // ??? Is this ever set
   place     ?: IPlace;
   date      : string;
   date_sort : string;
   name      : string;  // name stored in database
   type      : IPartType; // type 
}
export interface IGroup {
   id        : number;
   name      : string;
   place     : IPlace;
   date      : string;
   date_sort : string;
   criteria  : string;
}
export interface ICharacteristic {
   name      : string;
   place     : IPlace;
   date      : string;
   date_sort : string;
   sources   ?: ISource[];   //  ??? Is this ever set
}
export interface ICharacteristicPart {
   name            : string;
   value           : string;
}
export interface IRepr {
   id        : number;
   comments  : string;
   file      : string;
   mime      : string;
   source_id : number;
   url       : string;
}
export interface IResearcher {
}
export interface IPerson {
   // Information from server
   id    : number;
   name  : string;   // display name as stored in db
   parents ?: Array<IPerson>;
   children ?: Array<IPerson>;
   styles ?: string;     // inline styles
   style  ?: number;     // id of the predefined style
   surn ?: string;
   givn ?: string;
   birth ?: IEvent;
   death ?: IEvent;
   marriage ?: IEvent;

   // ??? Used in the template, but exact type undocumented yet
   all_events ?: any;
   all_chars  ?: any;
   all_groups ?: any;

   // Computed style  (??? Should be moved elsewhere)
   $fill ?: string;
   $fillGradient ?: boolean;  // whether to use gradient when filling

   // Computed data that helps style persons
   quartile ?: number;
   generation ?: number;
   angle ?: number;
   sosa ?: number;

   // Pedigree layout  (??? Should be moved elsewhere)
   parent_ ?: IPerson;  // parent in the Pedigree view

   // Fanchart layout  (??? Should be moved elsewhere)
   $expand ?: boolean;   // whether to expand person in fanchart
}

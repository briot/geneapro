// Do not use external modules, since otherwise we can no longer use internal
// modules.

import {} from 'angular';
import {} from 'angular-ui-router';

export enum layoutScheme {EXPANDED = 0, COMPACT = 1}
export enum appearance {FLAT = 0, GRADIENT = 1}
export enum linkStyle {STRAIGHT = 0, ORTHOGONAL = 1, CURVE = 2}
export enum colorScheme {
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
export interface IFanchartSettings {
   showMarriages : boolean;  // Whether to show marriage info
   angle : number; // total angle opening of the layout
   space : number; // Space between persons on a given generation
   gens : number;  // Number of generations to show
   readableNames : boolean;  // Whether to rotate text to make it more readable
   showMissing : boolean;    // Whether to draw empty sectors for missing persons
   colorScheme : colorScheme;
   appearance : appearance;
}
export interface IPedigreeSettings {
   layoutScheme  : layoutScheme;
   colorScheme   : colorScheme;
   appearance    : appearance;
   linkStyle     : linkStyle;
   gens          : number;  // Number of ancestor generations to display
   descendant_gens : number; // Number of descendants generations
   showMarriages   : boolean; // Whether to display marriage info
   sameSize        : boolean; // Whether to force all boxes to have same size
                              // Otherwise the size changes for each gen
   showDetails     : boolean; // Whether to show additional details as we zoom in
   horizPadding    : number;  // Padding on the sides of each box
   vertPadding     : number;  // Minimal vertical space between two boxes
}
export interface IRadialSettings {
   gens            : number;
   colorScheme     : colorScheme;
   appearance      : appearance;
   showText        : boolean;  // Whether to display names
}
export interface IPersonListSettings {
   colorScheme : colorScheme;
   rows : number;  // number of rows to display
}
export interface ISourceListSettings {
   rows : number;  // number of rows to display
}
export interface IPlaceListSettings {
   colorScheme : colorScheme;
}
export interface IApplicationSettings {
   sourcedEvents: boolean,  // whether to show a tick next to sourced events
   fanchart : IFanchartSettings;
   personas : IPersonListSettings;
   sources  : ISourceListSettings;
   places   : IPlaceListSettings;
   pedigree : IPedigreeSettings;
   radial   : IRadialSettings;
}

export interface IGPRootScope extends angular.IRootScopeService {
   decujus    : number;   // id of the decujus
   settings   : IApplicationSettings;
   pageTitle  ?: string;
}
export interface IStyleIdToStyle {
   [id : number] : IStyle;
}
export interface ISourcePart {
   name       : string;
   value      : string;
   fromHigher ?: boolean;
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
export interface IAssertionSubject {
   event     ?: IEvent;
   person    ?: IPerson;
   group     ?: IGroup;
   role      ?: string;   // for event or group
   char      ?: ICharacteristic;
   parts     ?: ICharacteristicPart[];  // for characteristic
}
export interface IAssertion {
   event ?: IEvent;   // ??? should be removed
   disproved   : boolean;
   rationale   : string;
   researcher  : IResearcher;
   last_change : Date,
   source_id   : number;
   surety      : number;  // SuretyScheme
   p1          : IAssertionSubject;
   p2          : IAssertionSubject;

   $open    ?: boolean;  // whether to show the details of the event
   $details ?: any;      // extra details
   $edited  : boolean;   // whether this is being edited
}
export interface IPerson {
   // Information from server
   id    : number;
   name  : string;   // display name as stored in db
   parents ?: Array<IPerson>;
   children ?: Array<IPerson>;
   details ?: string[];  // additional data to display for this person
   style ?: number;      // id of the style
   surn ?: string;
   givn ?: string;
   birth ?: IEvent;
   death ?: IEvent;
   marriage ?: IEvent;

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
export interface IServerPedigreeData {   // AJAX data from server
   decujus : IPerson;
   styles ?: IStyleIdToStyle;
   generations : number;
   descendants ?: number;
}

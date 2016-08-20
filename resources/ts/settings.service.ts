/**
 * Save persistent settings for the various views
 */

import {Injectable, EventEmitter} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {ColorScheme, LayoutScheme, Appearance, LinkStyle} from './basetypes';
import {LocalStorage} from './localstorage.service';

 // Settings the list of personas
interface PersonaListSettings {
   colorScheme: ColorScheme;
   rows: number    // number of rows to display
};

// Settings for the list of sources
interface SourceListSettings {
   rows: number    // number of rows to display
};

// Settings for the list of places
interface PlaceListSettings {
   rows: number    // number of rows to display
};

// Settings for the Radial view
interface RadialSettings {
   gens: number;
   colorScheme: ColorScheme;
   appearance: Appearance;
   showText: boolean;       // Whether to display names
};

// Settings for the Pedigree view
interface PedigreeSettings {
   layoutScheme: LayoutScheme;
   colorScheme: ColorScheme;
   appearance: Appearance;
   linkStyle: LinkStyle;
   gens: number;            // Number of ancestor generations to display
   descendant_gens: number; // Number of descendant generations
   showMarriages: boolean;  // Whether to display marriage info
   sameSize: boolean;       // Whether to force all boxes to have same size.
                            // Otherwise the size changes for each gen
   showDetails: boolean;    // Whether to show additional details as we zoom in
   horizPadding: number;    // Padding on the sides of each box
   vertPadding: number;     // Minimal vertical space between boxes
};

interface FanchartSettings {
   colorScheme: ColorScheme;
   appearance: Appearance;
   showMissing: boolean;   // Whether to draw empty sectors for missing persons
   readableNames: boolean; // Whether to rotate text to make it more readable
   gens: number;           // Number of generations to show
   angle: number;          // Total angle opening of the layout
   space: number;          // Space between two persons on a given generation
   showMarriages: boolean; // Whether to show marriage info
};

interface SettingsData {
   decujus : number;  // Id of selected person

   // Whether to show a tick next to sourced events
   sourcedEvents : boolean;

   personaList : PersonaListSettings;
   sourceList  : SourceListSettings;
   placeList   : PlaceListSettings;
   pedigree    : PedigreeSettings;
   radial      : RadialSettings;
   fanchart    : FanchartSettings;
}

@Injectable()
export class Settings implements SettingsData {
   onChange = new EventEmitter();

   decujus       : number;
   sourcedEvents : boolean;
   personaList   : PersonaListSettings;
   sourceList    : SourceListSettings;
   placeList     : PlaceListSettings;
   pedigree      : PedigreeSettings;
   radial        : RadialSettings;
   fanchart      : FanchartSettings;

   constructor(public title : Title,
               private _storage : LocalStorage)
   {
      const tmp = this._storage.get<SettingsData>('settings');
      this.decujus       = tmp.decujus || 1;
      this.sourcedEvents = tmp.sourcedEvents || false;
      this.personaList   = tmp.personaList || {colorScheme: ColorScheme.TRANSPARENT, rows: 10};
      this.sourceList    = tmp.sourceList || {rows: 10};
      this.placeList     = tmp.placeList || {rows: 10};
      this.pedigree      = tmp.pedigree || {
         layoutScheme: LayoutScheme.COMPACT,
         colorScheme: ColorScheme.PEDIGREE,
         appearance: Appearance.GRADIENT,
         linkStyle: LinkStyle.CURVE,
         gens: 4,
         descendant_gens: 1,
         showMarriages: true,
         sameSize: true,
         showDetails: true,
         horizPadding: 40,
         vertPadding: 20};
      this.radial        = tmp.radial || {
         gens: 6,
         colorScheme: ColorScheme.WHITE,
         appearance: Appearance.FLAT,
         showText: true};
      this.fanchart      = tmp.fanchart || {
         colorScheme: ColorScheme.PEDIGREE,
         appearance: Appearance.GRADIENT,
         showMissing: false,
         readableNames: true,
         gens: 4,
         angle: 200,
         space: 0,
         showMarriages: false};
      this.reportChange();
   }

   /**
    * Called by JSON.stringify automatically, to convert to JSON structure
    */
   toJSON() : SettingsData {
      return {
         decujus:       this.decujus,
         sourcedEvents: this.sourcedEvents,
         personaList:   this.personaList,
         sourceList:    this.sourceList,
         placeList:     this.placeList,
         pedigree:      this.pedigree,
         radial:        this.radial,
         fanchart:      this.fanchart
      };
   }

   /**
    * Change the title of the document
    */
   setTitle(newtitle : string) {
      this.title.setTitle(newtitle);
   }

   /**
    * Report a change
    * (for now, this is called by users of this interface, not automatically
    */
   reportChange() {
      // Normalize the data
      let p = this.pedigree;
      p.colorScheme  = +p.colorScheme;
      p.appearance   = +p.appearance;
      p.layoutScheme = +p.layoutScheme;
      p.linkStyle    = +p.linkStyle;
      p.horizPadding = +p.horizPadding;
      p.vertPadding  = +p.vertPadding;

      let r = this.radial;
      r.colorScheme = +r.colorScheme;
      r.appearance  = +r.appearance;

      let f = this.fanchart;
      f.colorScheme = +f.colorScheme;
      f.appearance  = +f.appearance;

      this._storage.set('settings', this);
      this.onChange.next({});
   }
}

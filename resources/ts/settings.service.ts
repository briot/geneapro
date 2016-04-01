/**
 * Save persistent settings for the various views
 */

import {Injectable, EventEmitter} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {ColorScheme, LayoutScheme, Appearance, LinkStyle} from './basetypes';

@Injectable()
export class Settings {
   onChange = new EventEmitter();

   decujus = 1;  // Id of selected person

   // Whether to show a tick next to sourced events
   sourcedEvents = false;

   // Settings the list of personas
   personaList = {
      colorScheme: ColorScheme.TRANSPARENT,
      rows: 10    // number of rows to display
   };

   // Settings for the list of sources
   sourceList = {
      rows: 10    // number of rows to display
   };

   // Settings for the list of places
   placeList = {
      rows: 10    // number of rows to display
   };

   // Settings for the Pedigree view
   pedigree = {
      layoutScheme: LayoutScheme.COMPACT,
      colorScheme: ColorScheme.PEDIGREE,
      appearance: Appearance.GRADIENT,
      linkStyle: LinkStyle.CURVE,
      gens: 4,             // Number of ancestor generations to display
      descendant_gens: 1,  // Number of descendant generations
      showMarriages: true, // Whether to display marriage info
      sameSize: true,      // Whether to force all boxes to have same size.
                           // Otherwise the size changes for each gen
      showDetails: true,   // Whether to show additional details as we zoom in
      horizPadding: 40,    // Padding on the sides of each box
      vertPadding: 20      // Minimal vertical space between boxes
   };

   radial = {
      gens: 6,
      colorScheme: ColorScheme.WHITE,
      appearance: Appearance.FLAT,
      showText: true       // Whether to display names
   };

   fanchart = {
      colorScheme: ColorScheme.PEDIGREE,
      appearance: Appearance.GRADIENT,
      showMissing: false,    // Whether to draw empty sectors for missing persons
      readableNames: true,   // Whether to rotate text to make it more readable
      gens: 4,               // Number of generations to show
      angle: 200,            // Total angle opening of the layout
      space: 0,              // Space between two persons on a given generation
      showMarriages: false   // Whether to show marriage info
   }

   constructor(public title : Title) { }

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

      this.onChange.next({});
   }
}

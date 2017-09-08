import { BasePersonLayout } from '../style';

export interface PersonLayout extends BasePersonLayout {
   id: number;  // id of the person (negative if dummy box)
   x: number;
   y: number;
   maxY: number;  // The bottom-most coordinate for the ancestors.
                  // This leaves space to display more information in some
                  // layouts.
   w: number;
   h: number;
   fs: number;  // font size
   radius: number;
   parents: (PersonLayout|undefined)[];
   children: (PersonLayout|undefined)[];
   parentsMarriage?: {
      x: number,  // Position of the start/middle of the text (see align)
      y: number,  // Position of the top of the text
      text: string,
      fs: number,
      alignX: string, // How to align text with respect to 'x'
   };
}

export interface PersonLayouts {
   [id: number]: PersonLayout;
}

/**
 * Configuration for layout of pedigree
 */
export abstract class Sizing {
   private start: number[] = [];
   // x coordinate for boxes in left-to-right mode, or y coordinate

   private dummyId: number = 0;
   private topDown: boolean;

   init(ancestors: number, descendants: number, horizSpacing: number,
        topDown: boolean) {
      this.topDown = topDown;
      this.start = [];
      let l = 0;
      for (let gen = -descendants; gen <= ancestors + 1; gen++) {
         this.start[gen] = l;
         l += topDown ?
            this.boxHeight(gen) + this.padding(gen) :
            this.boxWidth(gen) + this.padding(gen);
      }
   }

   /*
    * Create a partial layout for a box at the given generation
    */
   createXLayout(generation: number, sosa: number, angle: number, id?: number): PersonLayout {
      return {
         id: id || --this.dummyId,
         x: this.topDown ? NaN : this.start[generation],
         y: this.topDown ? this.start[generation] : NaN,
         maxY: NaN,  // computed later
         w: this.boxWidth(generation),
         h: this.boxHeight(generation),
         fs: this.textHeight(generation),
         generation: generation,
         sosa: sosa,
         angle: angle,
         radius: this.radius(generation),
         parents: [], // computed later
         children: [], // computed later
      };
   }

   // Width and Height of a box at the given generation
   abstract boxHeight(generation: number): number;
   abstract boxWidth(generation: number): number;

   // Size of text at the given generation
   abstract textHeight(generation: number): number;

   // Space between each generation
   abstract padding(afterGeneration: number): number;

   // Rounded corners radius
   abstract radius(generation: number): number;
}

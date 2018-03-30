import * as React from 'react';
import { Person } from '../Store/Person';
import { PedigreeSettings, isVertical } from '../Store/Pedigree';
import { GenealogyEventSet } from '../Store/Event';
import { PlaceSet } from '../Store/Place';
import Pedigree from './Pedigree';
import { PersonLayout, PersonLayouts, Sizing } from '../Pedigree/types';

// Maximum fontSize (in pixels). After this, we start displaying more
// information, rather than increase the font size
const maxFontSize: number = 20;

class SameSize extends Sizing {
   private horizSpacing: number;

   init(settings: PedigreeSettings) {
      this.horizSpacing = settings.horizSpacing;
      super.init(settings);
   }

   boxWidth() { return 200; }
   boxHeight() { return 60; }
   textHeight() { return 15; }
   radius() { return 6; }
   padding() { return this.horizSpacing; }
}

class ProportionalSize extends Sizing {
   private heights: number[]; //  box height for each generation
   private paddings: number[];
   private widths: number[];  //  box width for each generation
   private fs: number[];      //  fontSize for each generation

   private readonly ratio = 0.75;
   private readonly baseBoxHeight = 60;
   private readonly baseTextHeight = 15;
   private readonly baseBoxWidth = 200;
   private readonly baseRadius = 6;

   init(settings: PedigreeSettings) {
      // Maximum generation for which we apply ratios. Later generations will
      // all have the same size.
      // Keep reducing until we reach 10% of the original size
      const maxGenForRatio = Math.log(0.1) / Math.log(this.ratio);

      this.heights = [this.baseBoxHeight];
      this.fs = [this.baseTextHeight];
      this.widths = [this.baseBoxWidth];
      this.paddings = [settings.horizSpacing];

      const maxgen = Math.max(settings.ancestors, settings.descendants);
      let fs = this.fs[0];

      for (let gen = 1; gen <= maxgen + 1; gen++) {
         if (gen <= maxGenForRatio) {
            this.heights[gen] = this.heights[gen - 1] * this.ratio;
            this.widths[gen] = this.widths[gen - 1] * this.ratio;
            fs *= this.ratio;
            this.fs[gen] = Math.round(Math.min(maxFontSize, fs));
            this.paddings[gen] = this.paddings[gen - 1] * this.ratio;
         } else {
            this.heights[gen] = this.heights[gen - 1];
            this.widths[gen] = this.widths[gen - 1];
            this.fs[gen] = this.fs[gen - 1];
            this.paddings[gen] = this.paddings[gen - 1];
         }
      }

      super.init(settings);
   }

   boxWidth(generation: number): number {
      return this.widths[Math.abs(generation)];
   }

   boxHeight(generation: number): number {
      return this.heights[Math.abs(generation)];
   }

   padding(afterGeneration: number): number {
      return this.paddings[Math.abs(afterGeneration)];
   }

   textHeight(generation: number): number {
      return this.fs[Math.abs(generation)];
   }

   radius(generation: number): number {
      return this.baseRadius * Math.pow(this.ratio, generation);
   }
}

interface PedigreeLayoutAlgo {
   compute(decujus: number, layouts: PersonLayouts, maxGen: number): void;
}

class CompactLayout implements PedigreeLayoutAlgo {
   /**
    * Setup the layout algorithm.
    * @param vertPadding  minimum space between two persons in the same
    *   generation
    * @param genIncrease should be 1 if the "parents" returned by getParents
    *   are the ancestors, -1 otherwise.
    */
   constructor(public settings: PedigreeSettings,
               public getParents: (p: PersonLayout) => (PersonLayout|undefined)[],
               public genIncrease: number
              ) {
   }

   /**
    * Starting from person decujus, compute its own layout and its parent
    * nodes layouts, and modify layouts accordingly, up to maxGen levels.
    */
   compute(decujus: number, layouts: PersonLayouts, maxGen: number): void {
      let maxY: number = 0;

      const recurseLeftRight = (p: PersonLayout, gen: number) => {
         if (Math.abs(gen) < maxGen) {
            let min: number|undefined = undefined;
            let max: number = 0;
            for (const p2 of this.getParents(p)) {
               if (p2) {
                  recurseLeftRight(p2, gen + this.genIncrease);
                  if (min === undefined) {
                     min = p2.y;
                  }
                  max = p2.y + p2.h;
               }
            }

            if (min === undefined) {
               p.y = maxY;
               p.maxY = p.y + p.h;
            } else {
               p.y = (min + max - p.h) / 2;
               p.maxY = max;
            }

         } else {
            p.y = maxY;
            p.maxY = p.y + p.h;
         }

         maxY = Math.max(
            maxY,
            p.y + p.h + Math.max(
               this.settings.showMarriages ? p.fs : 0,
               this.settings.vertPadding));
      };

      const recurseTopDown = (p: PersonLayout, gen: number) => {
         if (Math.abs(gen) < maxGen) {
            let min: number|undefined = undefined;
            let max: number = 0;
            for (const p2 of this.getParents(p)) {
               if (p2) {
                  recurseTopDown(p2, gen + this.genIncrease);
                  if (min === undefined) {
                     min = p2.x;
                  }
                  max = p2.x + p2.w;
               }
            }

            p.x = (min === undefined) ? maxY : (min + max - p.w) / 2;
         } else {
            p.x = maxY;
         }

         p.maxY = p.y;
         maxY = Math.max(
            maxY,
            p.x + p.w + Math.max(
               this.settings.showMarriages ? p.fs : 0,
               this.settings.vertPadding));
      };

      if (isVertical(this.settings)) {
         recurseTopDown(layouts[decujus], 0);
      } else {
         recurseLeftRight(layouts[decujus], 0);
      }
   }
}

class ExpandedLayout extends CompactLayout {
   constructor(private sizing: Sizing,
               settings: PedigreeSettings,
               getParents: (p: PersonLayout) => (PersonLayout|undefined)[]) {
      super(settings, getParents, 1 /* genIncrease */);
   }

   compute(decujus: number, layouts: PersonLayouts, maxGen: number): void {
      // Add dummy layout for all missing persons
      
      const recurse = (p: PersonLayout) => {
         if (p.generation < maxGen) {
            for (let i = 0; i < Math.max(2, p.parents.length); i++) {
               if (!p.parents[i]) {
                  const n = this.sizing.createXLayout(
                     p.generation + 1 /* generation */,
                     p.sosa * 2 + i /* sosa */,
                     0 /* angle */);
                  p.parents[i] = n;
               }
               recurse(p.parents[i] as PersonLayout);
            }
         }
      };
      recurse(layouts[decujus]);

      // Then do standard algorithm
      super.compute(decujus, layouts, maxGen);
   }
}

interface PedigreeLayoutProps {
   settings: PedigreeSettings;
   persons: { [id: number]: Person};
   allEvents: GenealogyEventSet;
   allPlaces: PlaceSet;
   decujus: number;
}

export default class PedigreeLayout extends React.PureComponent<PedigreeLayoutProps, {}> {

   /**
    * Initialize the layout object with an entry for each person in the tree.
    * This also computes data like generation, sosa and angle which are
    * necessary when drawing.
    */
   initLayout(sizing: Sizing): PersonLayouts {
      const layout: PersonLayouts = {};
      const recurse = (p: number, sosa: number,
                       generation: number,
                       fromAngle: number, toAngle: number): PersonLayout => {
         let lay = layout[p];
         if (!lay) {
            layout[p] = lay = sizing.createXLayout(
               generation, sosa, fromAngle, p /* id */);

            const person: Person|undefined = this.props.persons[p];
            if (person && person.parents && generation < this.props.settings.ancestors) {
               const step = (toAngle - fromAngle) / person.parents.length;
               const sosaStep = 1 / Math.max(person.parents.length - 1, 1);
               for (let s = 0; s < person.parents.length; s++) {
                  if (person.parents[s] !== null) {
                     lay.parents.push(
                        recurse(
                           person.parents[s] as number,
                           sosa === -1 ? -1 : sosa * 2 + s * sosaStep,
                           generation + 1,
                           fromAngle + s * step /* fromAngle */,
                           fromAngle + (s + 1) * step /* toAngle */)
                     );
                  }
               }
            }
            if (person && person.children && Math.abs(generation) < this.props.settings.descendants) {
               const step = (toAngle - fromAngle) / person.children.length;
               for (let s = 0; s < person.children.length; s++) {
                  if (person.children[s] !== null) {
                     lay.children.push(
                        recurse(
                           person.children[s] as number,
                           -1,
                           generation - 1,
                           fromAngle + s * step /* fromAngle */,
                           fromAngle + (s + 1) * step /* toAngle */)
                     );
                  }
               }
            }
         }
         return lay;
      };

      recurse(
         this.props.decujus, 1,
         0 /* generation */,
         0 /* fromAngle */,
         1 /* toAngle */);
      return layout;
   }

   render(): JSX.Element {
      const decujus = this.props.decujus;
      const sizing: Sizing = this.props.settings.sameSize ?
         new SameSize() :
         new ProportionalSize();
      const getParents = (p: PersonLayout) => p.parents;
      const parentsLayoutAlgo: PedigreeLayoutAlgo =
         this.props.settings.showUnknown ?
            new ExpandedLayout(sizing, this.props.settings, getParents) :
            new CompactLayout(this.props.settings, getParents, 1);
      const vertical = isVertical(this.props.settings);

      sizing.init(this.props.settings);

      const layout: PersonLayouts = this.initLayout(sizing);

      parentsLayoutAlgo.compute(
         decujus, layout, this.props.settings.ancestors /* maxgen */);

      // Layout the children: this will also move decujus to center it on the
      // children. We'll compensate that offset afterwards.
      const afterParent: number = vertical ?
         layout[decujus].x :
         layout[decujus].y;

      const childrenLayout = new CompactLayout(
         this.props.settings,
         (p: PersonLayout) => p.children,
         -1);
      childrenLayout.compute(
         decujus, layout, this.props.settings.descendants /* maxgen */);

      // Now move all children so that decujus is still centered on its
      // parents
      const offset = vertical ?
         afterParent - layout[decujus].x :
         afterParent - layout[decujus].y;
      const adjustChildren = (p: PersonLayout) => {
         if (vertical) {
            p.x += offset;
         } else {
            p.y += offset;
         }
         for (const p2 of p.children) {
            if (p2) {
               adjustChildren(p2);
            }
         }
      };
      adjustChildren(layout[decujus]);

      // Add marriages
      if (this.props.settings.showMarriages) {
         for (const id of Object.keys(layout)) {
            const lay = layout[id];
            const father = lay.parents[0];
            const mother = lay.parents[1];
            const f = father ? this.props.persons[father.id] : undefined;
            const m = mother ? this.props.persons[mother.id] : undefined;
            let middle: number;
            if (vertical) {
               middle = (mother && father ?
                  (father.x + father.w + mother.x) / 2 :
                  lay.x + lay.w / 2);

               if (f && f.marriageISODate) {
                  lay.parentsMarriage = {
                     x: middle,
                     y: father.y - sizing.padding(father.generation - 1) / 3,
                     text: f.marriageISODate,
                     fs: father.fs,
                     alignX: 'middle',
                  };
               } else if (m && m.marriageISODate) {
                  lay.parentsMarriage = {
                     x: middle,
                     y: mother.y - sizing.padding(mother.generation - 1) / 3,
                     text: m.marriageISODate,
                     fs: mother.fs,
                     alignX: 'middle',
                  };
               }

            } else {
               middle = 2 + (mother && father ?
                  (father.y + father.h + mother.y) / 2 :
                  lay.y + lay.h / 2);

               if (f && f.marriageISODate) {
                  lay.parentsMarriage = {
                     x: father.x - sizing.padding(father.generation) / 3,
                     y: middle,
                     text: f.marriageISODate,
                     fs: father.fs,
                  };
               } else if (m && m.marriageISODate) {
                  lay.parentsMarriage = {
                     x: mother.x - sizing.padding(mother.generation) / 3,
                     y: middle,
                     text: m.marriageISODate,
                     fs: mother.fs,
                  };
               }
            }
         }
      }

      return (
         <Pedigree
            settings={this.props.settings}
            persons={this.props.persons}
            allEvents={this.props.allEvents}
            allPlaces={this.props.allPlaces}
            decujus={decujus}
            sizing={sizing}
            layouts={layout}
         />
      );
   }
}

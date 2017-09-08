import * as React from 'react';
import { Person, PersonSet } from '../Store/Person';
import { FanchartSettings } from '../Store/Fanchart';
import { event_to_string } from '../Store/Event';
import { PersonLayout, PersonLayouts } from '../Fanchart/types';
import { Fanchart } from '../Fanchart/Fanchart';

interface FanchartLayoutProps {
   decujus: number;
   persons: PersonSet;
   settings: FanchartSettings;
}

// Height of inner white circle
const INNER_CIRCLE = 80;

// Height for a generation
const ROW_HEIGHT = 100;

export default class FanchartLayout extends React.PureComponent<FanchartLayoutProps, {}> {

   /**
    * Create the layout for all persons
    */
   setLayout(): PersonLayouts {
      const spaceBetweenGens =
         this.props.settings.showMarriages ?
            12 : this.props.settings.gapBetweenGens ?  8 : 0;

      const minRadius: number[] = [0];
      const maxRadius: number[] = [INNER_CIRCLE];
      for (let gen = 1 ; gen <= this.props.settings.ancestors; gen++) {
         const m = maxRadius[gen - 1] + spaceBetweenGens;
         minRadius.push(m);
         maxRadius.push(m + ROW_HEIGHT);
      }

      let layouts: PersonLayouts = {
         width: 2 * maxRadius[maxRadius.length - 1],
         height: maxRadius[maxRadius.length - 1],
         centerX: maxRadius[maxRadius.length - 1] + spaceBetweenGens,
         centerY: maxRadius[maxRadius.length - 1] + spaceBetweenGens,
         spaceBetweenGens: spaceBetweenGens,
      };

      const fullAngle = this.props.settings.fullAngle * Math.PI / 180;
      const minAngle = -fullAngle / 2;

      let dummyId = -1;  // ids for missing persons

      /**
       * Initialize the layout with an entry for each person in the tree
       * Angles are specified in the range [0,1]
       */
      const recurse = (p: number, sosa: number, generation: number,
                       fromAngle: number, toAngle: number, pad: number
      ): PersonLayout => {
         let lay = layouts[p];
         if (!lay) {
            layouts[p] = lay = {
               id: p,
               angle: fromAngle,
               minAngle: fromAngle * fullAngle + minAngle,
               maxAngle: toAngle * fullAngle + minAngle,
               minRadius: minRadius[generation],
               maxRadius: maxRadius[generation],
               sosa: sosa,
               generation: generation,
               parents: [],
            };

            const person: Person|undefined = this.props.persons[p];

            const parents = (person && person.parents) || [null, null];
            if (this.props.settings.showMissingPersons && parents.length < 2) {
               parents.push(null);
            }

            if (this.props.settings.showMarriages) {
               for (const pa of parents) {
                  if (pa) {
                     const pe = this.props.persons[pa];
                     if (pe && pe.marriage) {
                        lay.parentsMarriage = {
                           text: event_to_string(
                              pe.marriage,
                              this.props.settings.showSourcedEvents,
                              true /* useDateSort */)
                        };
                        break;
                     }
                  }
               }
            }
           
            if (parents && generation < this.props.settings.ancestors) {
               const len = parents.length;
               const step = (toAngle - fromAngle - (len - 1) * pad) / len;
               const sosaStep = 1 / Math.max(len - 1, 1);
               let from = fromAngle;

               for (let s = 0; s < len; s++) {
                  if (this.props.settings.showMissingPersons || parents[s] !== null) {
                     lay.parents.push(
                        recurse(
                           parents[s] || dummyId--,
                           sosa * 2 + s * sosaStep,
                           generation + 1,
                           from,
                           from + step,
                           pad / 2 /* pad */));
                     from += step + pad;
                  }
               }
            }
         }
         return lay;
      };

      recurse(
         this.props.decujus,
         1 /* sosa */,
         0 /* generation */,
         0 /* fromAngle */,
         1 /* toAngle */,
         this.props.settings.anglePad / 1000 /* pad */);

      return layouts;
   }

   render() {
      const layouts: PersonLayouts = this.setLayout();
      return (
         <Fanchart
            layouts={layouts}
            settings={this.props.settings}
            persons={this.props.persons}
            decujus={this.props.decujus}
         />
      );
   }
}

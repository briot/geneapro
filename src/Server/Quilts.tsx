import { BasePerson, personDisplay } from "../Store/Person";

export const LINE_SPACING = 16;
export const MARGIN = 0;
export const F_HEIGHT = 16; // height of the row with "F" (families)

export interface QuiltsPersonLayout {
   person: BasePerson;

   layer: number;
   index: number; // index in layer

   // Horizontal line for this person extends from the position of its
   // child box to the right-most parent box:
   //            +------+
   //      X_____| name |_X__________________X  (maxMarriageLineX)
   //            +------+ |                  |
   //                     |  +-------------+ |
   //                     X__| name        | |
   //                        +-------------+ |
   //                                        X____
   minX: number;
   maxX: number;
   topY: number;
   bottomY: number;

   childFamilies: Family[]; // all families where this person is a child
   parentFamilies: Family[]; // all families where this person is a parent
}

// A family: parents + all children
export interface Family {
   persons: (QuiltsPersonLayout | undefined)[]; // [parent1, parent2, child1, child2,...]
   left: number; // left coordinate for the rectangle of this family
   leftMinY: number; // top-left
   leftMaxY: number; // bottom-left
   rightMinY: number; // top-right
   rightMaxY: number; // bottom-right
}

// One block of persons displayed together.
// Layers are displayed in decreasing index (layer 5, then 4, ...)
export interface Layer {
   left: number; // left coordinate
   right: number; // right coordinate
   top: number; // top coordinate
   height: number; // total height
   persons: QuiltsPersonLayout[]; // Visible persons in the layer
   families: Family[]; // Families with at least one children in this layer
}

type JSONFamily = number[];
// [father, mother, child1, child2,...]

interface JSONQuilts {
   persons: { [id: number]: BasePerson };
   perlayer: number[][]; // For each layer the person id
   families: JSONFamily[][]; // For each layer, [parent1, parent2, child...]
   // ??? Should be sent as a simple list, independent of layers. The
   // layout will need to duplicate the family for each layer where one of
   // children occurs, and hide families with no visible children
   decujus_name: string;
   decujus: number; // id of the decujus
}

export class QuiltsResult {
   public layers: Layer[];
   public persons: { [id: number]: BasePerson };

   public constructor(
      data: JSONQuilts,
   ) {
      let personToLayout: { [id: number]: QuiltsPersonLayout } = {};
      this.persons = data.persons;
      this.layers = data.perlayer.map(
         (persons: number[], layerIndex: number) => ({
            left: 0,
            right: 0,
            top: 0,
            height: 0,
            persons: persons
               .map((p: number, index) => {
                  return (personToLayout[p] = {
                     person: data.persons[p],
                     layer: layerIndex,
                     index: index,
                     minX: NaN,
                     maxX: NaN,
                     topY: NaN,
                     bottomY: NaN,
                     childFamilies: [],
                     parentFamilies: []
                  });
               }),
            families: [] // set later
         })
      );

      // After all person layouts have been created, edit the families

      this.layers.forEach((layer, layerIndex) => {
         layer.families =
            data.families[layerIndex] === undefined
               ? []
               : data.families[layerIndex].map((fams: JSONFamily) => ({
                    persons: fams.map(pid => personToLayout[pid]),
                    left: 0,
                    leftMinY: 0,
                    leftMaxY: 0,
                    rightMinY: 0,
                    rightMaxY: 0
                 }));
      });

      this.computeSizeAndPos();
      this.computeXYranges();

      // Compute related persons
      this.layers.forEach(layer => {
         layer.families.forEach(fam => {
            const father = fam.persons[0];
            if (father) {
               father.parentFamilies.push(fam);
            }

            const mother = fam.persons[1];
            if (mother) {
               mother.parentFamilies.push(fam);
            }

            fam.persons.slice(2).forEach(p => {
               if (p) {
                  p.childFamilies.push(fam);
               }
            });
         });
      });
   }

   /**
    * Compute the width of a string on the screen
    */
   private computeWidth(txt: string | undefined) {
      // ??? Needs improvement
      // With the canvas, we were using ctx.measureText(txt).width
      return txt === undefined ? 0 : Math.max((txt.length + 1) * 8, 100);
   }

   /**
    * Compute the size and position of each layers. These do not change when
    * the canvas is scrolled or zoomed, so they can be precomputed (especially
    * because computing the size of text is relatively expensive).
    */
   private computeSizeAndPos() {
      let layerX = 0; // top-left corner of current layer
      let layerY = 0; // top-left corner of current layer

      // Traverse in reverse order, so that parents are on the left of the
      // chart

      for (let layer = this.layers.length - 1; layer >= 0; layer--) {
         const l: Layer = this.layers[layer];
         const maxWidth = Math.max.apply(
            null,
            l.persons.map(p => this.computeWidth(personDisplay(p.person)))
         );

         l.top = layerY;
         l.left = layerX;
         l.right = layerX + maxWidth + 2 * MARGIN;
         l.height = l.persons.length * LINE_SPACING + 2 * MARGIN;

         if (layer > 0) {
            layerX =
               l.right + this.layers[layer - 1].families.length * LINE_SPACING;
            layerY = l.top + l.height + F_HEIGHT /* for marriages */;
         }

         l.persons.forEach((p, index) => {
            p.topY =
               index === 0 ? l.top : l.top + index * LINE_SPACING + MARGIN;
            p.bottomY =
               index === l.persons.length - 1
                  ? l.top + l.height
                  : l.top + (index + 1) * LINE_SPACING + MARGIN;
            p.minX = l.left;
            p.maxX = l.right;
         });
      }
   }

   /**
    * Compute the extent for horizontal lines
    */
   private computeXYranges() {
      this.layers.slice(0, -1).forEach((layer: Layer, layerIndex: number) => {
         // First pass: Compute the minimal extent for the vertical lines

         layer.families.forEach((fam: Family, famIndex: number) => {
            fam.left =
               this.layers[layerIndex + 1].right + famIndex * LINE_SPACING;
            fam.rightMinY = Math.min.apply(null, fam.persons
               .map(p => p && p.topY)
               .filter(y => y !== undefined) as number[]);
            fam.rightMaxY = Math.max.apply(null, fam.persons
               .map(p => p && p.bottomY)
               .filter(y => y !== undefined) as number[]);
         });

         // Second pass: the vertical lines are in fact between two families,
         // so need to take the two ranges into account

         layer.families.forEach((fam: Family, famIndex: number) => {
            if (famIndex !== 0) {
               const prevFam = layer.families[famIndex - 1];
               fam.leftMinY = Math.min(fam.rightMinY, prevFam.rightMinY);
               fam.leftMaxY = Math.max(fam.rightMaxY, prevFam.rightMaxY);
            } else {
               fam.leftMinY = fam.rightMinY;
               fam.leftMaxY = fam.rightMaxY;
            }
         });
      });

      // Third pass: the horizontal line extend to the right-most child

      this.layers.slice(0, -1).forEach((layer: Layer, layerIndex: number) => {
         layer.families.forEach((fam: Family) => {
            fam.persons.forEach(
               (p: QuiltsPersonLayout | undefined, pIndex: number) => {
                  if (p && pIndex < 2) {
                     // a parent
                     p.maxX = Math.max(p.maxX, fam.left + LINE_SPACING);
                  }
               }
            );
         });

         // Fourth pass: compute the X range for horizontal lines, which must
         // extend to the furthest vertical line on the corresponding Y, but
         // only up to the previous and next layers.

         layer.persons.forEach(p => {
            for (const fam of layer.families) {
               if (fam.leftMaxY >= p.bottomY) {
                  p.minX = Math.min(p.minX, fam.left);
               }
            }

            if (layerIndex > 0) {
               const childFams = this.layers[layerIndex - 1].families;
               for (const fam of childFams) {
                  if (fam.leftMinY <= p.topY) {
                     p.maxX = Math.max(p.maxX, fam.left);
                  }
               }
               const lastFam = childFams[childFams.length - 1];
               if (lastFam) {
                  if (lastFam.rightMinY <= p.topY) {
                     p.maxX = Math.max(p.maxX, lastFam.left + LINE_SPACING);
                  }
               }
            }
         });
      });
   }
}

/**
 * get pedigree information for `decujus`, up to a number of
 * generations.
 */
export const fetchQuiltsFromServer = (p: {
   decujus: number;
}): Promise<QuiltsResult|undefined> =>
   window.fetch(`/data/quilts/${p.decujus}`)
   .then((r: Response) => r.json())
   .then((q: JSONQuilts) => q.perlayer ? new QuiltsResult(q) : undefined);

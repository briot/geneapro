import {Injectable, EventEmitter} from '@angular/core';
import {Http, URLSearchParams} from '@angular/http';
import {Observable} from 'rxjs';
import * as d3 from 'd3';
import {Settings} from './settings.service';

export interface FamilyInfo extends Array<number> {  // [father, mother, child1, child2,...]
   visible      : boolean;
   x            : number;  // relative to the FamilyInfoLayer left coordinate

   minY         : number;  // Coordinates for the vertical line before the family's column
   maxY         : number;

   visibleIndex : number;   // index in the list of visible families for this layer
}
export interface FamilyInfoLayer extends Array<FamilyInfo> {  // for one layer
   maxIndex : number;

   lastMinY : number;  // coordinates for the last vertical line
   lastMaxY : number;
}
export type PersonInfo = {id: number, name: string, sex: string};

export const LINE_SPACING = 10;
export const MARGIN = 2;
export const F_HEIGHT = 10;  // height of the row with "F" (families)

// Result of the /data/quilts query
interface QuiltsFromServer {
   persons:      PersonInfo[][], // For each layer, the persons
   families:     FamilyInfoLayer[], // For each layer, the families
   decujus_tree: boolean, // If true, persons are only from decujus's tree
   decujus_name: string,
   decujus:      number  // id of the decujus
}

export interface PersonLayout {
   layer : number;
   index : number;   // index in layer

   y     ?: number;
   minParentY ?: number;

   id    : number;   // from PersonInfo
   sex   : string;   // from PersonInfo
   name  : string;   // from PersonInfo

   // x-coordinate for left-mode child marker for this person.
   // This will always be greater or equal to minChildLineX, which computes
   // the range for the horizontal line.
   minChildX     ?: number;
   minChildLineX ?: number;

   // x-coordinate for the right-most marriage marker for this person.
   // This will always be less or equal to maxMarriageLineX, which computes
   // the range for the horizontal line
   maxMarriageX      : number,
   maxMarriageLineX ?: number,

   // id of ancestors or descendants. Caching such lists make the selection
   // faster.
   children: number[];
   parents:  number[];

   // upper-most parent
   minParent   ?: number;

   leftMostParentLayer: number;
   leftMostParentFamily: number;
   leftMostParentIndex: number;
   rightMostMarriageLayer: number;
   rightMostMarriageIndex: number;
};

export class QuiltsData {

   personToLayer : {[id : number]: PersonLayout};
   filtered : boolean = false;  // If true, we only show the selected persons

   selected : {[id : number]: number[]};  // colors to use for selected persons
   colors : d3.scale.Ordinal<number, string>; // colors for the selections

   lefts : number[];          // left corner for each layer
   rights : number[];         // right corner for each layer
   tops : number[];           // top corner for each layer
   heights : number[];        // heights of each layer

   selectIndex : number = 0;  // Number of current selections

   constructor(public data : QuiltsFromServer) {
      this.colors = d3.scale.category10<number>();
      const c = this.colors(0);   // initialize the array so that first color is green
      this.selected = {};
      this.computeLayout();
   }

   /**
    * Add a new person to the selection.
    * This also selects related persons
    */
   addToSelection(p : PersonInfo) {
      if (this.selected[p.id]) {
         return;
      }

      this.selectIndex ++;

      const addPerson = (id : number) => {
         if (this.selected[id]) {
            let found = false;
            this.selected[id].forEach(color => found = color == this.selectIndex);
            if (!found) {
               this.selected[id].push(this.selectIndex);
            }
         } else {
            this.selected[id] = [this.selectIndex];
         }
      };

      const selectParents = (id : number) => {
         const info = this.personToLayer[id];
         addPerson(id);
         info.parents.forEach(p => selectParents(p));
      };

      const selectChildren = (id : number) => {
         const info = this.personToLayer[id];
         addPerson(id);
         info.children.forEach(p => selectChildren(p));
      };

      selectParents(p.id);
      selectChildren(p.id);

      // There might be more people visible than before
      if (this.filtered) {
         this.computeLayout();
      }
   }

   /**
    * Clear all selection.
    * This doesn't recompute the layout
    */
   clearSelection() {
      this.selectIndex = 0;
      this.selected = {};
   }

   /**
    * The color to use for a given person
    */
   colorForPerson(id : number) {
      const s = this.selected[id];
      if (s === undefined) {
         return 'black';
      } else {
         return this.colors(s[0]);
      }
   }

   /**
    * Whether the given person should be displayed
    */
   isVisible(p : PersonInfo) : boolean {
      return this.personToLayer[p.id] !== undefined;
   }

   /**
    * Initialize the personToLayer map
    */
   private initPersonToLayer() {
      this.personToLayer = {};
      this.forEachNonEmptyLayer((layer : number) => {
         this.data.persons[layer].forEach((p : PersonInfo, index: number) => {
            if (!this.filtered || this.selected[p.id]) {
               this.personToLayer[p.id] = {
                  layer: layer,
                  index: index,
                  id   : p.id,
                  sex  : p.sex,
                  name : (p.sex == 'F' ?  '\u2640' : p.sex == 'M' ? '\u2642' : ' ') + p.name,
                  maxMarriageX : 0,
                  children : [],
                  parents  : [],
                  leftMostParentLayer : 0,
                  leftMostParentFamily : 0,
                  leftMostParentIndex : 0,
                  rightMostMarriageLayer : this.data.persons.length,
                  rightMostMarriageIndex : 0
               }
            }
            
         });
      });
   }

   /**
    * Analyze data from the families, needed for further display.
    */
   private computeVisibleFamilies() {
      this.data.families.forEach((families_in_layer : FamilyInfoLayer, layer: number) => {
         let famIndex = 0;

         families_in_layer.forEach((fam : FamilyInfo) => {

            let tmpfam = <PersonLayout[]>[];
            fam.forEach(person => tmpfam.push(this.personToLayer[person]));

            let maxLayer = 0;
            let maxIndex = 0;
            let maxFamily = 0;

            fam.visible = false;

            tmpfam.forEach((p : PersonLayout, index : number) => {
               if (!p) {
                  // Nothing to do

               } else if (index < 2) {
                  // parents
                  // Family will be displayed if at least one of the parents
                  // wasn't filtered out
                  fam.visible = true;

                  if (p.rightMostMarriageLayer > layer) {
                     p.rightMostMarriageLayer = layer;
                     p.rightMostMarriageIndex = famIndex;
                  }

                  if (p.layer > maxLayer) {
                     maxLayer = p.layer;
                     maxIndex = p.index;
                     maxFamily = famIndex;
                  } else if (p.layer == maxLayer) {
                     maxIndex = Math.max(maxIndex, p.index);
                  }

               } else {
                  // children

                  p.leftMostParentLayer = Math.max(
                     p.leftMostParentLayer, maxLayer);
                  p.leftMostParentIndex = Math.max(
                     p.leftMostParentIndex, maxIndex);
                  p.leftMostParentFamily = Math.max(
                     p.leftMostParentFamily, maxFamily);

                  // register ancestors and descendants
                  if (tmpfam[0]) {
                     tmpfam[0].children.push(p.id);
                     p.parents.push(tmpfam[0].id);
                  }
                  if (tmpfam[1]) {
                     tmpfam[1].children.push(p.id);
                     p.parents.push(tmpfam[1].id);
                  }
               }
            });

            if (fam.visible) {
               famIndex ++;
            }
         });

         families_in_layer.maxIndex = famIndex;
      });
   }

   /**
    * Compute the width of a string on the screen
    */
   private computeWidth(txt : string) {
      // ??? Needs improvement
      // With the canvas, we were using ctx.measureText(txt).width
      return txt.length * 8;
   }

   /**
    * Compute the size and position of each layers. These do not change when
    * the canvas is scrolled or zoomed, so they can be precomputed (especially
    * because computing the size of text is relatively expensive). This also
    * allows us to only draw the visible layers later on.
    */
   private computeSizeAndPos() {
      this.lefts = [];
      this.rights = [];
      this.tops = [];
      this.heights = [];

      let layerX = 10;         // top-left corner of current layer
      let layerY = 10;         // top-left corner of current layer
      let prevLayer : number;  // index of previous non-empty layer

      this.forEachNonEmptyLayer((layer : number) => {
          let y = layerY + LINE_SPACING;
          let maxWidth = 0;

          this.forEachVisiblePerson(layer, (info, index) => {
              maxWidth = Math.max(maxWidth, this.computeWidth(info.name));
              y += LINE_SPACING;
          });

          let width = maxWidth + 2 * MARGIN;
          let height = y - layerY - LINE_SPACING;

          this.tops[layer] = layerY;
          this.lefts[layer] = layerX;
          this.rights[layer] = layerX + width;
          this.heights[layer] = height;

          if (layer > 0 && this.data.families[layer - 1]) {
             layerX = this.rights[layer] +
                 this.data.families[layer - 1].maxIndex * LINE_SPACING;
             layerY += height + F_HEIGHT;
          } else {
             layerX = this.rights[layer];
             layerY += height;
          }
      });
   }

   /**
    * Compute the ranges for the horizontal lines in marriages and
    * children.
    */
   private computeXRange(layer : number, fam : FamilyInfoLayer) {
      let prevMaxX = this.rights[layer];

      this.forEachVisiblePerson(
         layer,
         (info, index) => {
            info.y = this.tops[info.layer] + info.index * LINE_SPACING;

            //  Range for the marriage horizontal lines
            let minX = this.rights[info.layer];
            let maxX : number;
            if (!fam || fam.lastMinY <= info.y) {
                maxX = this.lefts[info.layer];
            } else {
                maxX = minX;
                for (let m = fam.length - 1; m >= 0; m--) {
                    if (fam[m].visible && fam[m].minY <= info.y) {
                        maxX = minX + fam[m].visibleIndex * LINE_SPACING;
                        break;
                    }
                }
            }

            if (info.rightMostMarriageLayer < this.data.persons.length) {
                maxX = Math.max(
                    maxX,
                    this.rights[info.rightMostMarriageLayer + 1] +
                    info.rightMostMarriageIndex * LINE_SPACING);
            }

            info.maxMarriageLineX = Math.max(prevMaxX, maxX);
            prevMaxX = maxX;

            //  Range for the children horizontal lines
            var prevFam = this.data.families[layer];
            if (prevFam) {
                minX = this.lefts[info.layer];

                for (var m = 0; m < prevFam.length; m++) {
                    if (prevFam[m].visible && prevFam[m].maxY >= info.y) {
                        minX = this.rights[info.layer + 1] +
                            prevFam[m].visibleIndex * LINE_SPACING;
                        break;
                    }
                }

                info.minChildLineX = minX;
            }
        });
   }

   /**
    * For each family, compute the y range for the corresponding line.
    */
   private computeYRange() {
      this.forEachNonEmptyLayer((layer : number) => {
         let prevMinY = this.tops[layer - 1] || 0;
         let maxYsofar = this.tops[layer];
         this.forEachVisibleFamily(
            layer,
            (family, index) => {
                family.visibleIndex = index;
                family.minY = this.tops[layer];
                family.maxY = maxYsofar;
                family.x = index * LINE_SPACING;

                family.forEach((person : number, p : number) => {
                    var info = this.personToLayer[person];
                    if (info) {
                        var y = this.tops[info.layer] +
                            info.index * LINE_SPACING;
                        family.minY = Math.min(family.minY, y);
                        family.maxY = Math.max(family.maxY, y + LINE_SPACING);

                        if (p < 2) {
                            info.maxMarriageX = Math.max(
                                info.maxMarriageX,
                                this.rights[layer + 1] + family.x,
                                this.rights[info.layer]);
                        } else if (!info.minChildX) {
                            info.minChildX = Math.min(
                                this.lefts[info.layer],
                                this.rights[layer + 1] + family.x);

                            if (info.minParentY == null) {
                                info.minParentY = family.minY;
                            } else {
                                info.minParentY = Math.min(
                                    info.minParentY,
                                    family.minY);
                            }
                        }
                    }
                })

                var y2 = family.minY;
                family.minY = Math.min(prevMinY, y2);
                prevMinY = y2;
                maxYsofar = family.maxY;
            });

         var fam = this.data.families[layer];
         if (fam) {
            fam.lastMinY = prevMinY;
            fam.lastMaxY = maxYsofar;
         }

         this.computeXRange(layer, fam);
      });
   }

   /**
    * Analyze the data and precompute some useful information for layout
    */
   private computeLayout() {
      this.initPersonToLayer();
      this.computeVisibleFamilies();
      this.computeSizeAndPos();
      this.computeYRange();
   }

   /**
    * Calls callback for each non empty layer, from left-to-right
    */
   forEachNonEmptyLayer(callback : (layer:number)=>void) {
      for (let layer = this.data.persons.length - 1; layer >= 0; layer--) {
         if (this.data.persons[layer].length) {
            callback(layer);
         }
      }
   }

   /**
    * Whether the layer is empty
    */
   isEmpty(layer : number) {
      return this.data.persons[layer].length == 0;
   }

   /**
    * Calls callback for each visible person in the layer
    * @return the index of the last visible person
    */
   forEachVisiblePerson(
      layer : number,
      callback : (info:PersonLayout, index : number)=>void)
   {
      let pindex = 0;
      this.data.persons[layer].forEach((p : PersonInfo) => {
         if (this.isVisible(p)) {
            callback(this.personToLayer[p.id], pindex);
            pindex ++;
         }
      });
      return pindex - 1;
   }

   /**
    * Calls callback for each visible family in the layer
    */
   forEachVisibleFamily(
      layer : number,
      callback : (family : FamilyInfo, famindex : number)=>void)
   {
      let famindex = 0;
      const fam = this.data.families[layer];
      if (fam) {
         fam.forEach((f : FamilyInfo) => {
            if (f.visible) {
               callback(f, famindex);
               famindex ++;
            }
         });
      }
   }
}


@Injectable()
export class QuiltsService {

   private id     : number
   private stream : Observable<QuiltsData>;

   constructor(private http     : Http,
               private settings : Settings)
   {
   }

   /**
    * Download the quilts information for that person
    * @param id     Id of the root person
    * @param tree_only  Whether to get persons from decujus tree or whole db
    */
   get(id        : number,
       tree_only : boolean=false) : Observable<QuiltsData>
   {
      if (this.id != id) {
         let params = new URLSearchParams();
         params.set('decujus_tree', tree_only.toString());
         this.id = id;
         this.stream = this.http.get('/data/quilts/' + id, {search: params})
            .map(res => res.json())
            .map((d : QuiltsFromServer) => new QuiltsData(d))
            .share();
      }
      return this.stream;
   }
}

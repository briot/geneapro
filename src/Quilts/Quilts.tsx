import * as React from "react";
import * as d3Color from "d3-color";
import * as d3ScaleChromatic from "d3-scale-chromatic";
import { personDisplay } from "../Store/Person";
import { QuiltsSettings } from "../Store/Quilts";
import {
   QuiltsResult,
   Layer,
   LINE_SPACING,
   MARGIN,
   F_HEIGHT,
   QuiltsPersonLayout,
   Family
} from "../Server/Quilts";
import ScalableSVG from "../SVG.Scalable";
import "./Quilts.css";

const allColors = d3ScaleChromatic.schemeCategory10.map((c: string) =>
   d3Color.rgb(c)
);

interface QuiltsProps {
   settings: QuiltsSettings;
   layout: QuiltsResult | undefined;
   decujus: number;
}

interface SelectionInfo {
   base: QuiltsPersonLayout;
   color: d3Color.RGBColor;
}

interface QuiltsState {
   selected: SelectionInfo[];
}

export default class Quilts extends React.PureComponent<
   QuiltsProps,
   QuiltsState
> {
   public state: QuiltsState = { selected: [] };
   public nextColor: number = 0;

   public addToSelection(p: QuiltsPersonLayout) {
      // Unselect if it was already selected
      for (let s = 0; s < this.state.selected.length; s++) {
         if (this.state.selected[s].base === p) {
            this.setState(old => ({
               selected: old.selected
                  .slice(0, s)
                  .concat(old.selected.slice(s + 1))
            }));
            return;
         }
      }

      // Add to selection otherwise
      let c = d3Color.rgb(allColors[this.nextColor++ % allColors.length]);
      c.opacity = 0.2;
      this.setState(old => ({
         selected: old.selected.concat({ base: p, color: c })
      }));
   }

   public render() {
      const props = this.props;

      const layout: QuiltsResult | undefined = props.layout;
      if (layout === undefined) {
         return <span>No data in database</span>;
      }

      const layers = layout.layers.slice(0, props.settings.ancestors + 1);
      const layerBlocks = layers.map((layer: Layer, layerIndex) => (
         <g
            key={layerIndex}
            className="layer"
            transform={`translate(${layer.left},${layer.top})`}
         >
            <rect
               className="person"
               width={layer.right - layer.left}
               height={layer.height}
            />
            {layer.persons.map((p, index) => (
               <text
                  key={p.person.id}
                  onClick={() => this.addToSelection(p)}
                  x={MARGIN}
                  y={(1 + index) * LINE_SPACING - 2}
               >
                  {(p.person.sex === "F"
                     ? "\u2640"
                     : p.person.sex === "M"
                     ? "\u2642"
                     : "") + personDisplay(p.person)}
               </text>
            ))}
         </g>
      ));

      // The horizontal and vertical lines

      let lines: JSX.Element[] = [];

      lines = layers.map((layer: Layer, layerIndex) => {
         let d = "";
         const last = layerIndex === layers.length - 1;

         // Horizontal lines

         layer.persons.forEach((p, pIndex) => {
            if (pIndex === 0) {
               d += `M${last ? layer.left : p.minX} ${p.topY}H${p.maxX}`;
            } else {
               const x = Math.min(p.minX, layer.persons[pIndex - 1].minX);
               const maxX = Math.max(p.maxX, layer.persons[pIndex - 1].maxX);
               d += `M${last ? layer.left : x} ${p.topY}H${maxX}`;
            }
         });
         const lastP = layer.persons[layer.persons.length - 1];
         if (lastP) {
            d += `M${last ? layer.left : lastP.minX} ${lastP.bottomY}H${
               lastP.maxX
            }`;
         }

         // Vertical lines

         if (!last) {
            layer.families.forEach((fam: Family) => {
               d += `M${fam.left} ${fam.leftMinY}V${fam.leftMaxY}`;
            });
            const lastFam = layer.families[layer.families.length - 1];
            if (lastFam) {
               d += `M${lastFam.left + LINE_SPACING} ${lastFam.rightMinY}V${
                  lastFam.rightMaxY
               }`;
            }
         }

         return <path key={layerIndex} className="line" d={d} />;
      });

      // Selection

      const SELECTION_MARGIN = 0;
      let selectionVertLines: JSX.Element[] = [];
      let selectionLines: JSX.Element[] = [];

      /**
       * Highlight all parents recursively with the given color.
       * When computing the extent of horizontal lines to the right, only
       *   take into account childFam if specified (otherwise all families)
       */
      const addParents = (
         uniqueId: string,
         p: QuiltsPersonLayout,
         colorDark: string,
         color: string,
         childFam?: Family
      ) => {
         const x = Math.min(
            layout.layers[p.layer].left,
            Math.min.apply(null, p.childFamilies.map(fam => fam.left))
         );
         const X = Math.max(
            layout.layers[p.layer].right,
            childFam
               ? childFam.left + LINE_SPACING
               : Math.max.apply(
                    null,
                    p.parentFamilies.map(fam => fam.left + LINE_SPACING)
                 )
         );
         selectionLines.push(
            <rect
               key={uniqueId}
               x={x + SELECTION_MARGIN}
               y={p.topY + SELECTION_MARGIN}
               width={X - x - 2 * SELECTION_MARGIN}
               height={p.bottomY - p.topY - 2 * SELECTION_MARGIN}
               fill={colorDark}
            />
         );

         p.childFamilies.forEach((fam, famIndex) => {
            const father = fam.persons[0];
            const mother = fam.persons[1];
            const y = Math.min(
               father ? father.bottomY : p.topY,
               mother ? mother.topY : p.bottomY
            );
            if (p.topY > y) {
               selectionVertLines.push(
                  <rect
                     key={`${uniqueId}=${famIndex}`}
                     x={fam.left + SELECTION_MARGIN}
                     y={y + SELECTION_MARGIN}
                     width={LINE_SPACING - 2 * SELECTION_MARGIN}
                     height={p.topY - y - 2 * SELECTION_MARGIN}
                     fill={color}
                  />
               );
            }
            if (father) {
               addParents(
                  `${uniqueId}-f${father.person.id}`,
                  father,
                  color,
                  color,
                  fam /* childFam */
               );
            }
            if (mother) {
               addParents(
                  `${uniqueId}-m${mother.person.id}`,
                  mother,
                  color,
                  color,
                  fam /* childFam */
               );
            }
         });
      };

      const addChildren = (
         uniqueId: string,
         p: QuiltsPersonLayout,
         color: string
      ) => {
         p.parentFamilies.forEach((fam, famIndex) => {
            let Y = p.topY;

            fam.persons.slice(2).forEach(child => {
               if (child) {
                  Y = Math.max(Y, child.topY);
                  const X = Math.max(
                     layout.layers[child.layer].right,
                     Math.max.apply(
                        null,
                        child.parentFamilies.map(f => f.left + LINE_SPACING)
                     )
                  );

                  selectionLines.push(
                     <rect
                        key={`${uniqueId}-${child.person.id}`}
                        x={fam.left + SELECTION_MARGIN}
                        width={X - fam.left - 2 * SELECTION_MARGIN}
                        y={child.topY}
                        height={
                           child.bottomY - child.topY - 2 * SELECTION_MARGIN
                        }
                        fill={color}
                     />
                  );

                  addChildren(`${uniqueId}-${child.person.id}`, child, color);
               }
            });

            if (Y > p.bottomY) {
               selectionVertLines.push(
                  <rect
                     key={`${uniqueId}=${famIndex}`}
                     x={fam.left + SELECTION_MARGIN}
                     width={LINE_SPACING - 2 * SELECTION_MARGIN}
                     y={p.bottomY}
                     height={Y - p.bottomY - 2 * SELECTION_MARGIN}
                     fill={color}
                  />
               );
            }
         });
      };

      this.state.selected.forEach((s, selectedIndex) => {
         const c = d3Color.rgb(s.color);
         c.opacity = 0.8;
         addParents(
            `p${selectedIndex}-${s.base.person.id}`,
            s.base,
            c.toString(),
            s.color.toString()
         );
         addChildren(
            `c${selectedIndex}-${s.base.person.id}`,
            s.base,
            s.color.toString()
         );
      });

      // The rows that separate marriages and child info, except for the last
      // layer we display.

      const marriages = layers.map((layer, layerIndex) =>
         layerIndex === 0 ? null : (
            <g key={layerIndex}>
               <rect
                  className="separator"
                  x={layer.right}
                  y={layout.layers[layerIndex - 1].top - F_HEIGHT}
                  width={layout.layers[layerIndex - 1].left - layer.right}
                  height={F_HEIGHT}
               />
            </g>
         )
      );

      // Display family blocks
      // Between each layer box, we have a family block used to display marriage
      // and children information.

      function pathForPersonSymbol(
         info: QuiltsPersonLayout,
         x: number,
         y: number
      ) {
         const size = LINE_SPACING - 4;

         switch (info.person.sex) {
            case "F":
               // A circle
               const r = size / 2;
               return `M${x + LINE_SPACING / 2 - r},${y + LINE_SPACING / 2}
                       a${r},${r} 0 1,0 ${r * 2},0
                       a${r},${r} 0 1,0 -${r * 2},0`;
            case "M":
               // a square
               const M = LINE_SPACING / 2 - size / 2;
               return `M${x + M},${y + M}h${size}v${size}h${-size}z`;
            default:
               // a small square
               const s = size - 4;
               const m = LINE_SPACING / 2 - s / 2;
               return `M${x + m},${y + m}h${s}v${s}h${-s}z`;
         }
      }

      const allFamBlocks = layers
         .slice(0, -1)
         .map((layer: Layer, layerIndex: number) => (
            <g key={layerIndex} className="familyblock">
               {// For each family with children in this layer

               layer.families.map((fam: Family) =>
                  fam.persons.map((playout, index) => {
                     if (playout === undefined) {
                        return null;
                     }
                     return (
                        <g key={index} className="person">
                           <path
                              fill={index < 2 ? "#000" : "#999"}
                              d={pathForPersonSymbol(
                                 playout,
                                 fam.left /* x */,
                                 playout.topY /* y */
                              )}
                           />
                        </g>
                     );
                  })
               )}
            </g>
         ));

      const minX = layers[layers.length - 1].left - 10;
      const minY = layers[layers.length - 1].top - 10;

      return (
         <ScalableSVG className="Quilts">
            <g transform={`translate(${-minX},${-minY})`}>
               {marriages}
               {lines}
               {selectionLines}
               {selectionVertLines}
               {allFamBlocks}
               {layerBlocks}
            </g>
         </ScalableSVG>
      );
   }
}

import * as React from 'react';
import { QuiltsSettings } from '../Store/Quilts';
import { QuiltsResult, Layer, LINE_SPACING, MARGIN, F_HEIGHT,
         QuiltsPersonLayout, Family } from '../Server/Quilts';
import ScalableSVG from '../SVG.Scalable';
import './Quilts.css';

interface QuiltsProps {
   settings: QuiltsSettings;
   layout: QuiltsResult|undefined;
   decujus: number;
}

export default function Quilts(props: QuiltsProps) {
   if (props.settings.loading) {
      return <span>Loading</span>;
   }

   const layout: QuiltsResult|undefined = props.layout;
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
            {
               layer.persons.map((p, index) => (
                  <text
                     key={p.person.id}
                     x={MARGIN}
                     y={(1 + index) * LINE_SPACING - 2}
                  >
                     {
                        (p.person.sex === 'F' ? '\u2640' :
                         p.person.sex === 'M' ? '\u2642' :
                         '') + p.person.name
                     }
                  </text>
               ))
            }
         </g>
      ));

   // The horizontal and vertical lines

   const lines = layers.map((layer: Layer, layerIndex) => {
      let d = '';
      const last = layerIndex === layers.length - 1;

      // Horizontal lines

      layer.persons.forEach(p => {
         d += `M${last ? layer.left : p.topMinX} ${p.topY}H${p.topMaxX}`;
      });
      const lastP = layer.persons[layer.persons.length - 1];
      if (lastP) {
         d += `M${last ? layer.left : lastP.bottomMinX} ${lastP.bottomY}H${lastP.bottomMaxX}`;
      }

      // Vertical lines

      if (!last) {
         layer.families.forEach((fam: Family) => {
            d += `M${fam.left} ${fam.leftMinY}V${fam.leftMaxY}`;
         });

         const lastFam = layer.families[layer.families.length - 1];
         if (lastFam) {
            d += `M${lastFam.left + LINE_SPACING} ${lastFam.rightMinY}V${lastFam.rightMaxY}`;
         }
      }

      return <path key={layerIndex} className="line" d={d}/>;
   });

   // The rows that separate marriages and child info, except for the last
   // layer we display.

   const marriages = layers.map((layer, layerIndex) => (
      layerIndex === 0 ?
         null : (
         <g
            key={layerIndex}
         >
            <rect
               className="separator"
               x={layer.right}
               y={layout.layers[layerIndex - 1].top - F_HEIGHT}
               width={layout.layers[layerIndex - 1].left - layer.right}
               height={F_HEIGHT}
            />
         </g>
      )
   ));

   // Display family blocks
   // Between each layer box, we have a family block used to display marriage
   // and children information.

   function pathForPersonSymbol(info: QuiltsPersonLayout, x: number, y: number) {
      const size = LINE_SPACING - 4;

      switch (info.person.sex) {
         case 'F':
            // A circle
            const r = size / 2;
            return `M${x + LINE_SPACING / 2 - r},${y + LINE_SPACING / 2}
                    a${r},${r} 0 1,0 ${r * 2},0
                    a${r},${r} 0 1,0 -${r * 2},0`;
         case 'M':
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

   const allFamBlocks = layers.slice(0, -1).map(
      (layer: Layer, layerIndex: number) => (
         <g
            key={layerIndex}
            className="familyblock"
         >
            {
               // For each family with children in this layer

               layer.families.map((fam: Family, famIndex) =>
                  fam.persons.map((playout, index) => {
                     if (playout === undefined) {
                        return null;
                     }
                     return (
                        <g
                           key={index}
                           className="person"
                        >
                           <path
                              fill={'black'}  /* colorForPerson(p) */
                              d={pathForPersonSymbol(
                                 playout,
                                 fam.left /* x */,
                                 playout.topY /* y */
                              )}
                           />
                        </g>
                     );
                  })
               )
            }
         </g>
   ));

   const minX = layers[layers.length - 1].left - 10;
   const minY = layers[layers.length - 1].top - 10;

   return (
      <ScalableSVG className="Quilts">
         <g transform={`translate(${-minX},${-minY})`}>
            {marriages}
            {lines}
            {allFamBlocks}
            {layerBlocks}
         </g>
      </ScalableSVG>
   );
}

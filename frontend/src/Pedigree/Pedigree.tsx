import { Person } from "../Store/Person";
import { PedigreeSettings } from "../Store/Pedigree";
import { GenealogyEventSet } from "../Store/Event";
import { PlaceSet } from "../Store/Place";
import PedigreeBox from "./Box";
import { PersonLayout, PersonLayouts, Sizing } from "../Pedigree/types";
import PedigreeLink from "../Pedigree/Link";
import ScalableSVG from "../SVG.Scalable";
import "./Pedigree.css";

interface PedigreeProps {
   settings: PedigreeSettings;
   layouts: PersonLayouts;
   allEvents: GenealogyEventSet;
   allPlaces: PlaceSet;
   sizing: Sizing;
   persons: { [id: number]: Person };
   decujus: number;
}

export default function Pedigree(props: PedigreeProps) {
   const defs: JSX.Element[] = [];
   for (
      let gen = -props.settings.descendants;
      gen <= props.settings.ancestors;
      gen++
   ) {
      defs.push(
         <clipPath id={"clipGen" + gen} key={gen}>
            <rect
               width={props.sizing.boxWidth(gen)}
               height={props.sizing.boxHeight(gen)}
               rx={props.sizing.radius(gen) + "px"}
               ry={props.sizing.radius(gen) + "px"}
            />
         </clipPath>
      );
   }

   const boxes: JSX.Element[] = [];
   const links: JSX.Element[] = [];
   const marriages: JSX.Element[] = [];

   const seen: { [id: number]: boolean } = {};
   const recurse = (pl: PersonLayout) => {
      if (!seen[pl.id]) {
         seen[pl.id] = true;
         const p: Person | undefined = props.persons[pl.id];
         boxes.push(
            <PedigreeBox
               person={p}
               layout={pl}
               allEvents={props.allEvents}
               allPlaces={props.allPlaces}
               style={props.settings}
               key={pl.id}
            />
         );

         if (pl.parentsMarriage) {
            marriages.push(
               <text
                  className="marriage"
                  textAnchor={pl.parentsMarriage.alignX}
                  x={pl.parentsMarriage.x}
                  y={pl.parentsMarriage.y}
                  fontSize={pl.parentsMarriage.fs}
                  key={pl.id}
               >
                  {pl.parentsMarriage.text}
               </text>
            );
         }

         for (const p2 of pl.parents) {
            if (p2) {
               recurse(p2);

               const lId = pl.id + "-" + p2.id;
               links.push(
                  <PedigreeLink
                     from={pl}
                     to={p2}
                     style={props.settings}
                     key={lId}
                  />
               );
            }
         }

         for (const p2 of pl.children) {
            if (p2) {
               recurse(p2);

               const lId = pl.id + "-" + p2.id;
               links.push(
                  <PedigreeLink
                     to={pl}
                     from={p2}
                     style={props.settings}
                     key={lId}
                  />
               );
            }
         }
      }
   };
   recurse(props.layouts[props.decujus]);

   return (
      <ScalableSVG className="Pedigree">
         <defs>{defs}</defs>
         {boxes}
         {marriages}
         {links}
      </ScalableSVG>
   );
}

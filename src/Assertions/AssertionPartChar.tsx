import * as React from "react";
import * as GP_JSON from '../Server/JSON';
import { AssertionEntities } from '../Server/Person';
import { MetadataDict } from '../Store/State';
import { Characteristic } from "../Store/Assertion";
import AssertionPart from "../Assertions/AssertionPart";
import { PlaceLink } from "../Links";
import Media from "../MediaList";

/**
 * Characteristic Part
 * One of the two components of an assertion, an event
 */

interface CharProps {
   characteristic: Characteristic;
   entities: AssertionEntities;
   metadata: MetadataDict;
}
const AssertionPartCharacteristic: React.FC<CharProps> = (p) => {
   const c = p.characteristic;
   const place = c.place ? p.entities.places[c.place] : undefined;
   const part_name = (part: GP_JSON.CharacteristicPart) => {
      const n = p.metadata.char_part_types_dict[part.type];
      return n ?
         (n.name === c.name ? "" : `${n.name}: `)
         : c.name;
   };

   return (
      <AssertionPart
         title={
            <div>
               {c.date && (
                  <div className="dateAndTag">
                     <div>
                        <span title={c.date_sort || undefined}>
                           {c.date}
                        </span>
                     </div>
                  </div>
               )}
               <div
                  className={
                     "nameAndPlace " +
                     (c.date && (place || c.parts.length)
                        ? "bordered"
                        : "")
                  }
               >
                  <div>{place && <PlaceLink place={place} />}</div>
                  <div>
                     {
                        c.parts.map(
                           (p: GP_JSON.CharacteristicPart, idx: number) => (
                              <div key={idx} className="preLine">
                                 {part_name(p)}
                                 {p.value}
                              </div>
                           ))
                     }
                  </div>
                  <Media medias={c.medias} />
               </div>
            </div>
         }
      />
   );
};
export default AssertionPartCharacteristic;

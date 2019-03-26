import * as React from "react";
import { Characteristic, CharacteristicPart } from "../Store/Assertion";
import { PlaceSet } from '../Store/Place';
import AssertionPart from "../Assertions/AssertionPart";
import { PlaceLink } from "../Links";
import Media from "../MediaList";

/**
 * Characteristic Part
 * One of the two components of an assertion, an event
 */

interface CharProps {
   characteristic: Characteristic;
   places: PlaceSet;
}
const AssertionPartCharacteristic: React.FC<CharProps> = (p) => {
   const c = p.characteristic;
   const place = c.placeId ? p.places[c.placeId] : undefined;
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
                     (c.date && (c.placeId || c.parts.length)
                        ? "bordered"
                        : "")
                  }
               >
                  <div>{place && <PlaceLink place={place} />}</div>
                  <div>
                     {c.parts.map((p: CharacteristicPart, idx: number) => (
                        <div key={idx} className="preLine">
                           {p.name === c.name ? "" : p.name + ": "}
                           {p.value}
                        </div>
                     ))}
                  </div>
                  <Media medias={c.medias} />
               </div>
            </div>
         }
      />
   );
};
export default AssertionPartCharacteristic;

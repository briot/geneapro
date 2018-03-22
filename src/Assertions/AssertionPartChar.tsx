import * as React from 'react';
import { Characteristic, CharacteristicPart } from '../Store/Assertion';
import AssertionPart from '../Assertions/AssertionPart';
import { PlaceLink } from '../Links';

/**
 * Characteristic Part
 * One of the two components of an assertion, an event
 */

interface CharProps {
   characteristic: Characteristic;
}

export default class AssertionPartCharacteristic extends React.PureComponent<CharProps> {
   render() {
      const c = this.props.characteristic;
      return (
         <AssertionPart
            title={
               <div>
                  <div className="dateAndTag">
                     <div>{c.date && <span title={c.date_sort}>{c.date}</span>}</div>
                     <div>{c.name}</div>
                  </div>
                  <div className={'nameAndPlace ' + (c.placeId || c.parts.length ? 'bordered' : '')}>
                     <div>{c.placeId && <PlaceLink id={c.placeId} />}</div>
                     <div>
                        {c.parts.map(
                           (p: CharacteristicPart, idx: number) =>
                              <div key={idx}>
                                 {p.name === c.name ?
                                    '' :
                                    p.name + ': '}
                                 {p.value}
                              </div>)
                        }
                     </div>
                  </div>
               </div>
            }
         />
      );
   }
}

import * as React from 'react';
import { Characteristic, CharacteristicPart } from '../Store/Assertion';
import AssertionPart from '../Assertions/AssertionPart';
import { PlaceLink } from '../Links';
import Media from '../MediaList';

/**
 * Characteristic Part
 * One of the two components of an assertion, an event
 */

interface CharProps {
   characteristic: Characteristic;
}

export default class AssertionPartCharacteristic extends React.PureComponent<CharProps> {
   public render() {
      const c = this.props.characteristic;
      return (
         <AssertionPart
            title={
               <div>
                  {
                     c.date &&
                     <div className="dateAndTag">
                        <div><span title={c.date_sort || undefined}>{c.date}</span></div>
                     </div>
                  }
                  <div className={'nameAndPlace ' + (c.date && (c.placeId || c.parts.length) ? 'bordered' : '')}>
                     <div>{c.placeId && <PlaceLink id={c.placeId} />}</div>
                     <div>
                        {c.parts.map(
                           (p: CharacteristicPart, idx: number) =>
                              <div key={idx} className="preLine">
                                 {p.name === c.name ?
                                    '' :
                                    p.name + ': '}
                                 {p.value}
                              </div>)
                        }
                     </div>
                     <Media medias={c.medias} />
                  </div>
               </div>
            }
         />
      );
   }
}

import * as React from 'react';
import { P2C, CharacteristicPart } from '../Store/Assertion';
import AssertionBox from '../Assertions/AssertionBox';

interface P2CViewProps {
   p2c: P2C;
}

export default function P2CView(props: P2CViewProps) {
   const c = props.p2c.characteristic;
   return (
      <AssertionBox
         color="blue"
         date={c.date}
         dateSort={c.date_sort}
         tag={c.name}
         placeId={c.placeId}
         content={
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
         }
      />
   );
}

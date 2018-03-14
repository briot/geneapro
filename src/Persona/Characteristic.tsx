import * as React from 'react';
import { P2C, CharacteristicPart } from '../Store/Assertion';
import Box from '../Persona/Box';

interface PersonaCharacteristicProps {
   char: P2C;
}

export default function PersonaCharacteristic(props: PersonaCharacteristicProps) {
   const c = props.char.characteristic;
   return (
      <Box
         color="blue"
         date={c.date}
         placeId={c.placeId}
         title={<span className="type">{c.name}</span>}
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

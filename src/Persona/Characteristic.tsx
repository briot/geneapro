import * as React from 'react';
import { Characteristic, CharacteristicPart } from '../Store/Person';
import Box from '../Persona/Box';

interface PersonaCharacteristicProps {
   char: Characteristic;
}

export default function PersonaCharacteristic(props: PersonaCharacteristicProps) {
   return (
      <Box
         color="blue"
         date={props.char.date}
         place={props.char.place}
         title={
            <span className="type">
               {props.char.name}
            </span>
         }
         content={
            <div>
               {props.char.parts.map(
                  (p: CharacteristicPart, idx: number) =>
                     <div key={idx}>
                        {p.name === props.char.name ?
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

import * as React from 'react';
import { Icon, Segment } from 'semantic-ui-react';
import { Person } from '../Store/Person';
import { P2E, P2C } from '../Store/Assertion';
import { GenealogyEventSet } from '../Store/Event';
import PersonaCharacteristic from '../Persona/Characteristic';
import PersonaEvent from '../Persona/Event';
import './Persona.css';

interface Item {
   id: string;
   date_sort?: string;
   item: JSX.Element;
}

interface PersonaProps {
   person: Person;
   allEvents: GenealogyEventSet;
   onShowEventDetails?: (id: number) => void;
}

export default function Persona(props: PersonaProps) {
   const p: Person = props.person;

   let items: (Item|undefined)[] = [];

   const birthEvent = p.birthEventId ? props.allEvents[p.birthEventId] : undefined;
   const birthDate: number|undefined = birthEvent && birthEvent.date_sort ?
      Number(birthEvent.date_sort.substring(0, 4)) :
      undefined;

   if (p.events) {
      items = items.concat(
         p.events.map(
            (evRole: P2E) => {
               const ev = props.allEvents[evRole.eventId];
               if (ev) {
                  return {date_sort: ev.date_sort,
                          id: 'event' + ev.id,
                          item: (
                             <PersonaEvent
                                onShowDetails={props.onShowEventDetails}
                                role={evRole.role}
                                event={ev}
                             />
                          ),
                  };
               }
               return undefined;
            }
         ));
   }

   if (p.chars) {
      items = items.concat(
         p.chars.map(
            (c: P2C, idx: number) => ({
               id: 'char' + idx,
               date_sort: c.characteristic.date_sort,
               item: <PersonaCharacteristic char={c} />
            }))
      );
   }

   items.sort(
      (e1: Item, e2: Item) => {
         if (!e1.date_sort) {
            return -1;
         } else if (!e2.date_sort) {
            return 1;
         } else {
            return e1.date_sort.localeCompare(e2.date_sort);
         }
   });

   function ageAtDate(dateSort?: string): string {
      // We can't use javascript's Date, since it cannot represent
      // dates before 1970.
      if (birthDate && dateSort) {
         const b2 = Number(dateSort.substring(0, 4));
         return b2 === birthDate ?
            '' :
            `(${b2 - birthDate})`;
      }
      return '';
   }

   let prev: string|undefined;
   const rows: (JSX.Element|null)[] = items.map(
      (it: Item) => {
         const result = it === undefined ?
            null : (
            <tr key={it.id}>
               <td className="date">
                  {it.date_sort !== prev ? (
                     <div>
                        {it.date_sort}
                        <span className="age">{ageAtDate(it.date_sort)}</span>
                        <Icon name="circle" />
                     </div>
                  ) : null}
               </td>
               <td>
                  {it.item}
               </td>
            </tr>
         );
         prev = it ? it.date_sort : undefined;
         return result;
      });

   return (
      <div className="Persona">
         <Segment attached={true} className="pagetitle">
            {p.surn.toUpperCase()}{' '}{p.givn}
         </Segment>
         <Segment attached={true} className="pageContent">
            <table>
               <tbody>
                  {rows}
               </tbody>
            </table>
         </Segment>
      </div>
   );
}

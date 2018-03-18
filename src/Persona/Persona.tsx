import * as React from 'react';
import { Icon, Segment } from 'semantic-ui-react';
import { Person } from '../Store/Person';
import { P2E, P2C } from '../Store/Assertion';
import { GenealogyEventSet } from '../Store/Event';
import P2CView from '../Assertions/P2C';
import P2EView from '../Assertions/P2E';
import './Persona.css';

interface Item {
   id: string;
   date_sort?: string;
   item: JSX.Element;
}

interface PersonaProps {
   person: Person;
   allEvents: GenealogyEventSet;
}

export default function Persona(props: PersonaProps) {
   const p: Person = props.person;

   let items: (Item|undefined)[] = [];

   const birthEvent = p.birthEventId ? props.allEvents[p.birthEventId] : undefined;
   const birthDate: number|undefined = birthEvent && birthEvent.date_sort ?
      Number(birthEvent.date_sort.substring(0, 4)) :
      undefined;

   if (p.asserts) {
      items = p.asserts.map((a, idx) => {
         if (a instanceof P2E) {
            const ev = props.allEvents[a.eventId];
            return ev ?
               {date_sort: ev.date_sort,
                id: 'event' + a.eventId,
                item: <P2EView p2e={a} />
               } : undefined;
         } else if (a instanceof P2C) {
            return {
               id: 'char' + idx,
               date_sort: a.characteristic.date_sort,
               item: <P2CView p2c={a} />
            };
         } else {
            window.console.error('Unhandled assertion in person');
            return undefined;
         }
      });
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

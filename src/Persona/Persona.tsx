import * as React from 'react';
import { connect } from 'react-redux';
import { Icon } from 'semantic-ui-react';
import { AppState } from '../Store/State';
import { P2C } from '../Store/Assertion';
import { Segment } from 'semantic-ui-react';
import { Person, personDisplay } from '../Store/Person';
import { GenealogyEventSet } from '../Store/Event';
import AssertionTimeline from '../Assertions/AssertionTimeline';
import './Persona.css';

interface Props {
   person: Person;
}

interface ConnectedProps extends Props {
   events: GenealogyEventSet;
}

function View(props: ConnectedProps) {
   const p: Person = props.person;
   const birthEvent = p.birthEventId ? props.events[p.birthEventId] : undefined;
   const birthYear: number|undefined = birthEvent && birthEvent.date_sort ?
      Number(birthEvent.date_sort.substring(0, 4)) :
      undefined;
   const deathEvent = p.deathEventId ? props.events[p.deathEventId] : undefined;
   const deathYear: number|undefined = deathEvent && deathEvent.date_sort ?
      Number(deathEvent.date_sort.substring(0, 4)) :
      undefined;

   let gender: string = '';
   if (p.asserts) {
      for (const a of p.asserts.get()) {
         // ??? Should compare non-display string, not "sex"
         if (a instanceof P2C && a.characteristic.name === 'sex') {
            for (const part of a.characteristic.parts) {
               if (part.name === 'sex') {
                  gender = part.value;
               }
            }
            break;
         }
      }
   }

   return (
      <div className="Persona">
         <Segment attached={true} className="pagetitle">
            <Icon
               className="gender"
               name={gender === 'M' ? 'man' :
                     gender === 'F' ? 'woman' :
                    'genderless'}
            />
            {personDisplay(p)}
            <span className="lifespan">
               {birthYear} - {deathYear}
            </span>
         </Segment>
         <Segment attached={true} className="pageContent">
            <AssertionTimeline
               asserts={p.asserts}
               refYear={birthYear}
               hidePersonIf={p.id}
            />
         </Segment>
      </div>
   );
}

const Persona = connect(
   (state: AppState, props: Props) => ({
      ...props,
      events: state.events,
   }),
)(View);
export default Persona;

import * as React from 'react';
import { connect } from 'react-redux';
import { AppState } from '../Store/State';
import { Segment } from 'semantic-ui-react';
import { Person } from '../Store/Person';
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

   return (
      <div className="Persona">
         <Segment attached={true} className="pagetitle">
            {p.surn.toUpperCase()}{' '}{p.givn}
         </Segment>
         <Segment attached={true} className="pageContent">
            <AssertionTimeline
               asserts={p.asserts}
               refYear={birthYear}
               hidePart1={true}
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

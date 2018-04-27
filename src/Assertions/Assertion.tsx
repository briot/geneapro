import * as React from 'react';
import { connect } from 'react-redux';
import { AppState } from '../Store/State';
import { Rating, Segment } from 'semantic-ui-react';
import { Assertion } from '../Store/Assertion';
import AssertionPartEvent from '../Assertions/AssertionPartEvent';
import AssertionPartPerson from '../Assertions/AssertionPartPerson';
import AssertionPartCharacteristic from '../Assertions/AssertionPartChar';
import { P2E, P2C, P2P } from '../Store/Assertion';
import { SourceLink } from '../Links';
import { ResearcherSet } from '../Store/Researcher';
import './Assertion.css';

interface BoxProps {
   assert: Assertion;
   p1?: JSX.Element;
   p2?: JSX.Element;
   role?: string;     // Separator between the two parts of the assertion
}
interface ConnectedBoxProps extends BoxProps {
   researchers: ResearcherSet;
}

function ConnectedAssertionBox(props: ConnectedBoxProps) {
   const a = props.assert;
   return (
      <div className={'Assertion ' + (a.disproved ? 'disproved' : '')} >
         {props.p1}
         {props.role && <div className="role"><span>{props.role}</span></div>}
         {props.p2}
         <Segment attached={true} className="details">
            <div className="right">
               <div>
                  <Rating
                      className="rating"
                      rating={1}   /* ??? Incorrect */
                      size="mini"
                      maxRating={5}
                  />
               </div>
               <div>
                  {
                     a.sourceId &&
                     <SourceLink id={a.sourceId}/>
                  }
               </div>
            </div>
            <div className="preLine">
               <i>Rationale:</i> {a.rationale}
            </div>
            <div className="researcher">
               Research: {props.researchers[a.researcher].name}
               &nbsp;({a.lastChanged.toDateString()})
            </div>
         </Segment>
      </div>
   );
}

const AssertionBox = connect(
   (state: AppState, props: BoxProps) => ({
      ...props,
      researchers: state.researchers,
   })
)(ConnectedAssertionBox);

interface AssertionProps {
   assert: Assertion;

   hidePersonIf?: number;
   //  Hide persons when they have this idea (to be used on the Persona page)
}

export default function AssertionView(props: AssertionProps) {
   const a = props.assert;
   if (a instanceof P2E) {
      return (
         <AssertionBox
            assert={a}
            p1={props.hidePersonIf === a.personId ?
                undefined : <AssertionPartPerson personId={a.personId} />}
            p2={<AssertionPartEvent eventId={a.eventId}/>}
            role={' as ' + a.role}
         />
      );
   } else if (a instanceof P2C) {
      return (
         <AssertionBox
            assert={a}
            p1={props.hidePersonIf === a.personId ?
                undefined : <AssertionPartPerson personId={a.personId} />}
            p2={<AssertionPartCharacteristic characteristic={a.characteristic} />}
            role={a.characteristic.name}
         />
      );
   } else if (a instanceof P2P) {
      return (
         <AssertionBox
            assert={a}
            p1={props.hidePersonIf === a.person1Id ?
                undefined : <AssertionPartPerson personId={a.person1Id} />}
            p2={props.hidePersonIf === a.person2Id ?
                undefined : <AssertionPartPerson personId={a.person2Id} />}
            role={a.relation}
         />
      );
   } else {
      return <div>Unhandled assertion</div>;
   }
}

import * as React from 'react';
import { Rating, Segment } from 'semantic-ui-react';
import { Assertion } from '../Store/Assertion';
import AssertionPartEvent from '../Assertions/AssertionPartEvent';
import AssertionPartPerson from '../Assertions/AssertionPartPerson';
import AssertionPartCharacteristic from '../Assertions/AssertionPartChar';
import { P2E, P2C } from '../Store/Assertion';
import { SourceLink } from '../Links';
import './AssertionBox.css';

interface BoxProps {
   assert: Assertion;
   p1?: JSX.Element;
   p2?: JSX.Element;
   role?: string;     // Separator between the two parts of the assertion
}

function AssertionBox(props: BoxProps) {
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
                  <span>Changed: {a.lastChanged}</span>
                  {
                     a.sourceId &&
                     <SourceLink id={a.sourceId}/>
                  }
               </div>
            </div>
            <div><i>Rationale:</i> {a.rationale}</div>
            <div className="researcher">Researched by: {a.researcher}</div>
         </Segment>
      </div>
   );
}

interface AssertionProps {
   assert: Assertion;
   hidePerson?: boolean;
}

export default function AssertionView(props: AssertionProps) {
   const a = props.assert;
   if (a instanceof P2E) {
      return (
         <AssertionBox
            assert={a}
            p1={props.hidePerson ? undefined : <AssertionPartPerson personId={a.personId} />}
            p2={<AssertionPartEvent eventId={a.eventId}/>}
            role={a.role}
         />
      );
   } else if (a instanceof P2C) {
      return (
         <AssertionBox
            assert={a}
            p1={props.hidePerson ? undefined : <AssertionPartPerson personId={a.personId} />}
            p2={<AssertionPartCharacteristic characteristic={a.characteristic} />}
            role="characteristic"
         />
      );
   } else {
      return <div>Unhandled assertion</div>;
   }
}

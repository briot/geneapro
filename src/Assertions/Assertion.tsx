import * as React from "react";
import { GPDispatch, MetadataDict } from "../Store/State";
import { Rating } from "semantic-ui-react";
import { Segment } from "semantic-ui-react";
import { Assertion } from "../Store/Assertion";
import AssertionPartEvent from "../Assertions/AssertionPartEvent";
import AssertionPartPerson from "../Assertions/AssertionPartPerson";
import AssertionPartCharacteristic from "../Assertions/AssertionPartChar";
import { AssertionEntities } from "../Server/Person";
import { P2E, P2C, P2P } from "../Store/Assertion";
import { SourceLink } from "../Links";
import "./Assertion.css";

interface BoxProps {
   assert: Assertion;
   p1?: JSX.Element;
   p2?: JSX.Element;
   entities: AssertionEntities;
   metadata: MetadataDict;
}
const AssertionBox: React.FC<BoxProps> = (p) => {
   const a = p.assert;
   const source = a.sourceId ? p.entities.sources[a.sourceId] : undefined;
   const research = p.metadata.researchers_dict[a.researcher];
   return (
      <div className={"Assertion " + (a.disproved ? "disproved" : "")}>
         {p.p1}
         <div className="role">
            <span>{a.getRole(p.metadata)}</span>
         </div>
         {p.p2}
         <Segment attached={true} className="details">
            <div className="right">
               <div>
                  <Rating
                     className="rating"
                     rating={1} /* ??? Incorrect */
                     size="mini"
                     maxRating={5}
                  />
               </div>
               <div>{source && <SourceLink source={source} />}</div>
            </div>
            <div className="preLine">
               <i>Rationale:</i> {a.rationale}
            </div>
            <div className="researcher">
               Research: {research ? research.name : ''}
               &nbsp;({a.lastChanged.toDateString()})
            </div>
         </Segment>
      </div>
   );
};

interface AssertionProps {
   assert: Assertion;
   entities: AssertionEntities;
   dispatch: GPDispatch;
   metadata: MetadataDict;

   hidePersonIf?: number;
   //  Hide persons when they have this idea (to be used on the Persona page)
}
const AssertionView: React.FC<AssertionProps> = (p) => {
   const a = p.assert;
   if (a instanceof P2E) {
      return (
         <AssertionBox
            assert={a}
            p1={
               p.hidePersonIf === a.personId ? (
                  undefined
               ) : (
                  <AssertionPartPerson
                     person={p.entities.persons[a.personId]}
                  />
               )
            }
            p2={<AssertionPartEvent
                   eventId={a.eventId}
                   entities={p.entities}
                   dispatch={p.dispatch}
                   metadata={p.metadata}
                />}
            entities={p.entities}
            metadata={p.metadata}
         />
      );
   } else if (a instanceof P2C) {
      return (
         <AssertionBox
            assert={a}
            p1={
               p.hidePersonIf === a.personId ? (
                  undefined
               ) : (
                  <AssertionPartPerson
                     person={p.entities.persons[a.personId]}
                  />
               )
            }
            p2={
               <AssertionPartCharacteristic
                  entities={p.entities}
                  characteristic={a.characteristic}
                  metadata={p.metadata}
               />
            }
            entities={p.entities}
            metadata={p.metadata}
         />
      );
   } else if (a instanceof P2P) {
      return (
         <AssertionBox
            assert={a}
            p1={
               p.hidePersonIf === a.person1Id ? (
                  undefined
               ) : (
                  <AssertionPartPerson
                     person={p.entities.persons[a.person1Id]}
                  />
               )
            }
            p2={
               p.hidePersonIf === a.person2Id ? (
                  undefined
               ) : (
                  <AssertionPartPerson
                     person={p.entities.persons[a.person2Id]}
                  />
               )
            }
            entities={p.entities}
            metadata={p.metadata}
         />
      );
   } else {
      return <div>Unhandled assertion</div>;
   }
}
export default AssertionView;

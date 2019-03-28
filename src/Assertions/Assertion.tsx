import * as React from "react";
import { connect } from "react-redux";
import { AppState, GPDispatch, MetadataDict } from "../Store/State";
import { Rating } from "semantic-ui-react";
import { Segment } from "semantic-ui-react";
import { Assertion } from "../Store/Assertion";
import AssertionPartEvent from "../Assertions/AssertionPartEvent";
import AssertionPartPerson from "../Assertions/AssertionPartPerson";
import AssertionPartCharacteristic from "../Assertions/AssertionPartChar";
import { P2E, P2C, P2P } from "../Store/Assertion";
import { PlaceSet } from "../Store/Place";
import { GenealogyEventSet } from "../Store/Event";
import { SourceLink } from "../Links";
import { SourceSet } from "../Store/Source";
import { PersonSet } from "../Store/Person";
import { ResearcherSet } from "../Store/Researcher";
import "./Assertion.css";

interface BoxProps {
   assert: Assertion;
   p1?: JSX.Element;
   p2?: JSX.Element;
   role?: string; // Separator between the two parts of the assertion
   sources: SourceSet;
   metadata: MetadataDict;
}
const AssertionBox: React.FC<BoxProps> = (p) => {
   const a = p.assert;
   const source = a.sourceId ? p.sources[a.sourceId] : undefined;
   const research = p.metadata.researchers_dict[a.researcher];
   return (
      <div className={"Assertion " + (a.disproved ? "disproved" : "")}>
         {p.p1}
         {p.role && (
            <div className="role">
               <span>{p.role}</span>
            </div>
         )}
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
   places: PlaceSet;
   events: GenealogyEventSet;
   dispatch: GPDispatch;
   metadata: MetadataDict;
   sources: SourceSet;
   persons: PersonSet;

   hidePersonIf?: number;
   //  Hide persons when they have this idea (to be used on the Persona page)
}
const AssertionView: React.FC<AssertionProps> = (p) => {
   const a = p.assert;
   if (a instanceof P2E) {
      const role= p.metadata.event_type_roles_dict[a.role];
      return (
         <AssertionBox
            assert={a}
            p1={
               p.hidePersonIf === a.personId ? (
                  undefined
               ) : (
                  <AssertionPartPerson person={p.persons[a.personId]} />
               )
            }
            p2={<AssertionPartEvent
                   eventId={a.eventId}
                   events={p.events}
                   dispatch={p.dispatch}
                   persons={p.persons}
                   places={p.places}
                   sources={p.sources}
                />}
            role={` as ${role ? role.name : ''}`}
            sources={p.sources}
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
                  <AssertionPartPerson person={p.persons[a.personId]} />
               )
            }
            p2={
               <AssertionPartCharacteristic
                  places={p.places}
                  characteristic={a.characteristic}
                  metadata={p.metadata}
               />
            }
            role={a.characteristic.name}
            sources={p.sources}
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
                  <AssertionPartPerson person={p.persons[a.person1Id]} />
               )
            }
            p2={
               p.hidePersonIf === a.person2Id ? (
                  undefined
               ) : (
                  <AssertionPartPerson person={p.persons[a.person2Id]} />
               )
            }
            role={p.metadata.p2p_types_dict[a.relation].name}
            sources={p.sources}
            metadata={p.metadata}
         />
      );
   } else {
      return <div>Unhandled assertion</div>;
   }
}
export default AssertionView;

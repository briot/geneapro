import * as React from "react";
import { useDispatch } from "react-redux";
import { MetadataDict } from "../Store/State";
import { fetchEventDetails } from "../Store/Sagas";
import { Loader, Rating } from "semantic-ui-react";
import { PersonaLink, SourceLink, PlaceLink } from "../Links";
import { GenealogyEvent } from "../Store/Event";
import { AssertionEntities } from "../Server/Person";
import AssertionPart from "../Assertions/AssertionPart";
import { P2E } from "../Store/Assertion";

/**
 * Brief details for an event
 */

interface EventDetailsProps {
   event?: GenealogyEvent;
   entities: AssertionEntities;
}
const EventDetails: React.FC<EventDetailsProps> = (p) => {
   if (p.event === undefined || p.event.asserts === undefined) {
      return (
         <Loader active={true} size="small">
            Loading
         </Loader>
      );
   }

   return (
      <table className="eventDetails">
         <tbody>
            {p.event.asserts.get().map((a, idx) => {
               if (a instanceof P2E) {
                  return [
                     <tr key={idx}>
                        <td>{a.role}</td>
                        <td className="name">
                           <PersonaLink
                              person={p.entities.persons[a.personId]}
                           />
                        </td>
                        <td>
                           {
                              a.sourceId &&
                              <SourceLink
                                 source={p.entities.sources[a.sourceId]}
                              />
                           }
                        </td>
                        <td>
                           <Rating
                              style={{ float: "right" }}
                              rating={1} /* ??? Incorrect */
                              size="mini"
                              maxRating={5}
                           />
                        </td>
                     </tr>,
                     a.rationale ? (
                        <tr key={"rat" + idx}>
                           <td />
                           <td colSpan={3}>{a.rationale}</td>
                        </tr>
                     ) : null
                  ];
               } else {
                  return <span key={idx}>Unknown assertion</span>;
               }
            })}
         </tbody>
      </table>
   );
}

/**
 * Event Part
 * One of the two components of an assertion, an event
 */

interface EventProps {
   eventId: number;
   entities: AssertionEntities;
   metadata: MetadataDict;
}
const AssertionPartEvent: React.FC<EventProps> = (p) => {
   const dispatch = useDispatch();
   const onExpand = React.useCallback(
      () => fetchEventDetails.execute(dispatch, { id: p.eventId }),
      [dispatch, p.eventId]);

   const e = p.entities.events[p.eventId];
   const place = e.placeId ? p.entities.places[e.placeId] : undefined;
   return (
      <AssertionPart
         title={
            <>
               <div>
                  <span className="eventDescr">
                     {e.name}
                  </span>
               </div>
               {
                  place &&
                  <div className="eventPlace">
                     <PlaceLink place={place} />
                  </div>
               }
               <div className="more">
                  { /* <a href="#">View event details</a> */ }
               </div>
            </>
         }
         expandable={true}
         expanded={<EventDetails event={e} entities={p.entities} />}
         onExpand={onExpand}
      />
   );
}
export default AssertionPartEvent;

import * as React from "react";
import { connect } from "react-redux";
import { AppState, GPDispatch } from "../Store/State";
import { fetchEventDetails } from "../Store/Sagas";
import { Loader, Rating } from "semantic-ui-react";
import { PersonaLink, SourceLink, PlaceLink } from "../Links";
import { GenealogyEvent, GenealogyEventSet } from "../Store/Event";
import { PersonSet } from '../Store/Person';
import { PlaceSet } from '../Store/Place';
import { SourceSet } from '../Store/Source';
import AssertionPart from "../Assertions/AssertionPart";
import { P2E } from "../Store/Assertion";

/**
 * Brief details for an event
 */

interface EventDetailsProps {
   event?: GenealogyEvent;
   persons: PersonSet;
   sources: SourceSet;
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
                           <PersonaLink person={p.persons[a.personId]} />
                        </td>
                        <td>
                           {
                              a.sourceId &&
                              <SourceLink source={p.sources[a.sourceId]} />
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
   events: GenealogyEventSet;
   dispatch: GPDispatch;
   places: PlaceSet;
   sources: SourceSet;
   persons: PersonSet;
}
const AssertionPartEvent: React.FC<EventProps> = (p) => {
   const onExpand = React.useCallback(
      () => fetchEventDetails.execute(p.dispatch, { id: p.eventId }),
      [p.dispatch, p.eventId]);

   const e = p.events[p.eventId];
   const place = e.placeId ? p.places[e.placeId] : undefined;
   return (
      <AssertionPart
         title={
            <div>
               <div className="dateAndTag">
                  <div>
                     {e.date && <span title={e.date_sort}>{e.date}</span>}
                  </div>
                  <div>{e.type ? e.type.name : "Unknown"}</div>
               </div>
               <div
                  className={
                     "nameAndPlace " + (e.name || place ? "bordered " : "")
                  }
               >
                  <div>{e.name}</div>
                  <div>{place && <PlaceLink place={place} />}</div>
               </div>
            </div>
         }
         expandable={true}
         expanded={<EventDetails
                      event={e}
                      persons={p.persons}
                      sources={p.sources} />}
         onExpand={onExpand}
      />
   );
}
export default AssertionPartEvent;

import * as React from "react";
import { connect } from "react-redux";
import { AppState, GPDispatch, MetadataDict } from "../Store/State";
import { Icon } from "semantic-ui-react";
import { AssertionList } from "../Store/Assertion";
import { GenealogyEventSet } from "../Store/Event";
import { PlaceSet } from "../Store/Place";
import { PersonSet } from "../Store/Person";
import { SourceSet } from "../Store/Source";
import { ResearcherSet } from "../Store/Researcher";
import AssertionView from "../Assertions/Assertion";
import "./AssertionTimeline.css";

function ageAtDate(refYear?: number, date?: string | null): string {
   // We can't use javascript's Date, since it cannot represent
   // dates before 1970.
   if (refYear && date) {
      const b2 = Number(date.substring(0, 4));
      return `(${b2 - refYear})`;
   }
   return "";
}

interface TimelineProps {
   asserts?: AssertionList;

   hidePersonIf?: number;
   //  If true, do not show the first part of assertions

   refYear?: number;
   //  "age" will be displayed relative to that date
}

interface ConnectedTimelineProps extends TimelineProps {
   events: GenealogyEventSet;
   persons: PersonSet;
   places: PlaceSet;
   sources: SourceSet;
   dispatch: GPDispatch;
   metadata: MetadataDict;
}
const AssertionTimeline: React.FC<ConnectedTimelineProps> = (p) => {
   if (!p.asserts) {
      return null;
   }

   p.asserts.sortByDate(p.events, p.metadata);

   const list = p.asserts.get();
   let prev: string | null = "@#@";

   return (
      <table className="AssertionTimeline">
         <tbody>
            {list.map(a => {
               const d = a.getSortDate(p.events);
               const year = d ? d.substring(0, 4) : null;
               const isSame = year === prev;
               prev = year;
               return (
                  <tr
                     key={
                        a.constructor.name + a.id /* 'P2E<id>' or 'P2C<id>' */
                     }
                  >
                     <td className="date">
                        {isSame ? null : (
                           <div>
                              {year}
                              <span className="age">
                                 {ageAtDate(p.refYear, d)}
                              </span>
                              <Icon name="circle" />
                           </div>
                        )}
                     </td>
                     <td>
                        <AssertionView {...p} assert={a} />
                     </td>
                  </tr>
               );
            })}
         </tbody>
      </table>
   );
}

export default connect(
   (state: AppState, props: TimelineProps) => ({
      ...props,
      events: state.events,
      persons: state.persons,
      places: state.places,
      sources: state.sources,
      metadata: state.metadata,
   }),
   (dispatch) => ({ dispatch })
)(AssertionTimeline);

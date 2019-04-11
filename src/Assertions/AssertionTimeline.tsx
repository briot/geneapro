import * as React from "react";
import {
   InfiniteList,
   InfiniteRowFetcher,
   InfiniteRowRenderer } from "../InfiniteList";
import { GPDispatch, MetadataDict } from "../Store/State";
import { Icon } from "semantic-ui-react";
import { Assertion } from "../Store/Assertion";
import { AssertionEntities } from '../Server/Person';
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

export interface TimelineProps {
   hidePersonIf?: number;
   //  If true, do not show the first part of assertions

   refYear?: number;
   //  "age" will be displayed relative to that date

   entities: AssertionEntities;
   dispatch: GPDispatch;
   metadata: MetadataDict;

   minBatchSize?: number;
   fullHeight?: boolean;
}

interface AssertionTimelineProps extends TimelineProps {
   fetchAsserts: InfiniteRowFetcher<Assertion>;
   rowCount: number;
}
export const AssertionTimeline: React.FC<AssertionTimelineProps> = (p) => {
   const renderAssert: InfiniteRowRenderer<Assertion> = (a) => {
      const d = a.row.getSortDate(p.entities.events);
      const year = d ? d.substring(0, 4) : null;

      // ??? Can we cache this in the list of assertions
      let prevYear: string|null= '';
      if (a.prevRow) {
         const prevD = a.prevRow.getSortDate(p.entities.events);
         prevYear = prevD ? prevD.substring(0, 4) : null;
      }

      const isSameYear = prevYear === year;
      return (
         <div className="assertRow" style={a.style} key={a.key} >
            <div className="date">
               {isSameYear ? null : (
                  <div>
                     {year}
                     <span className="age">
                        {ageAtDate(p.refYear, d)}
                     </span>
                     <Icon name="circle" />
                  </div>
               )}
            </div>
            <div>
               <AssertionView {...p} assert={a.row} />
            </div>
         </div>
      );
   };

   return (
      <div className="AssertionTimeline" >
         <InfiniteList
            fetchRows={p.fetchAsserts}
            fullHeight={p.fullHeight}
            minBatchSize={p.minBatchSize || 30}
            renderRow={renderAssert}
            rowCount={p.rowCount}
            rowHeight='dynamic'
         />
      </div>
   );
}

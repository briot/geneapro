import * as React from "react";
import { Rating } from "semantic-ui-react";
import {
   InfiniteList,
   InfiniteRowFetcher,
   InfiniteRowRenderer } from "../InfiniteList";
import { GPDispatch, MetadataDict } from "../Store/State";
import { Icon } from "semantic-ui-react";
import { Assertion } from "../Store/Assertion";
import { AssertionEntities } from '../Server/Person';
import { GenealogyEventSet } from "../Store/Event";
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

   fetchAsserts: InfiniteRowFetcher<Assertion>;
   rowCount: number;
}
export const AssertionTimeline: React.FC<TimelineProps> = (p) => {
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

      if (a.index === 0) {
         return (
            <div
               className={`assertRow ${isSameYear ? '' : 'withDate'}`}
               style={a.style}
               key={a.key}
            >
               <div className="date">
                  {isSameYear &&
                     <div>
                        <span className="circle" />
                        {year}
                        <span className="age">
                           {ageAtDate(p.refYear, d)}
                        </span>
                     </div>
                  }
               </div>
               <div className="Assertion2">
                  <div className="titlebar">
                     <div className="right">
                        <span><a href="#">Source</a></span>
                        <span title="Researched by Toto">Search</span>
                        <span>
                           <Rating
                              className="rating"
                              rating={1} /* ??? Incorrect */
                              size="mini"
                              maxRating={5}
                           />
                        </span>
                     </div>
                     <span className="summary">
                        BIRTH (principal)
                     </span>
                     <span className="eventDate">
                        November 43, 2019
                     </span>
                  </div>
                  <div>
                     <a href="#">Emmanuel Briot</a>
                  </div>
                 {/*<span className="eventRole">principal</span>*/}
                  <div>
                      {/*<span className="eventType">Birth</span>*/}
                      <span className="eventDescr">
                          Birth of Emmanuel Briot
                      </span>
                  </div>
                  <div className="eventPlace">
                     Villeurbanne, Rhone, France
                  </div>
                  <div className="rationale">
                      This explains the conclusion
                  </div>
                  <div className="more">
                     <a href="#">View details</a>
                  </div>
               </div>
            </div>
         );

      }

      return (
         <div
            className={`assertRow ${isSameYear ? '' : 'withDate'}`}
            style={a.style}
            key={a.key}
         >
            <div className="date">
               {isSameYear ? null : (
                  <div>
                     <span className="circle" />
                     {year}
                     <span className="age">
                        {ageAtDate(p.refYear, d)}
                     </span>
                  </div>
               )
               }
            </div>
            <AssertionView {...p} assert={a.row} />
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

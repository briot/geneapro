import * as React from "react";
import { Segment } from "semantic-ui-react";
import { GPDispatch, MetadataDict } from "../Store/State";
import { AssertionEntities } from "../Server/Person";
import { Place } from "../Store/Place";
import { AssertionTimelineFromList } from "../Assertions/AssertionTimeline";
import "./PlaceDetails.css";

interface PlaceProps {
   dispatch: GPDispatch;
   entities: AssertionEntities;
   metadata: MetadataDict;
   place?: Place;
}

export default function PlaceDetails(props: PlaceProps) {
   const p = props.place;
   if (!p) {
      return null;
   }
   return (
      <div className="Place">
         <Segment attached={true} className="pageTitle">
            {p.name}
         </Segment>
         <Segment attached={true} className="pageContent">
            {
               p.asserts &&
               <AssertionTimelineFromList
                  asserts={p.asserts}
                  dispatch={props.dispatch}
                  entities={props.entities}
                  metadata={props.metadata}
               />
            }
         </Segment>
      </div>
   );
}

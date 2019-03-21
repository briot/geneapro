import * as React from "react";
import { Segment } from "semantic-ui-react";
import { Place } from "../Store/Place";
import AssertionTimeline from "../Assertions/AssertionTimeline";
import "./PlaceDetails.css";

interface PlaceProps {
   place?: Place;
}

export default function PlaceDetails(props: PlaceProps) {
   const p = props.place;
   return (
      <div className="Place">
         <Segment attached={true} className="pageTitle">
            {p && p.name}
         </Segment>
         <Segment attached={true} className="pageContent">
            <AssertionTimeline asserts={p ? p.asserts : undefined} />
         </Segment>
      </div>
   );
}

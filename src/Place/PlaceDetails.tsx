import * as React from "react";
import { Segment } from "semantic-ui-react";
import { GPDispatch, MetadataDict } from "../Store/State";
import {
   AssertionEntities,
   AssertionEntitiesJSON,
   assertionFromJSON,
   mergeAssertionEntities,
   setAssertionEntities
} from '../Server/Person';
import { fetchPlaceAsserts, usePlaceAssertsCount } from "../Server/Place";
import { Place } from "../Store/Place";
import { Assertion } from "../Store/Assertion";
import { AssertionTimeline } from "../Assertions/AssertionTimeline";
import { InfiniteRowFetcher } from "../InfiniteList";
import "./PlaceDetails.css";

interface PlaceProps {
   dispatch: GPDispatch;
   metadata: MetadataDict;
   place: Place;
}

export default function PlaceDetails(p: PlaceProps) {
   const [entities, setEntities] = React.useState<AssertionEntities>({
      events: {}, persons: {}, places: {}, sources: {},
   });
   const place = p.place;
   const count = usePlaceAssertsCount(place.id);
   const fetchAsserts: InfiniteRowFetcher<Assertion> =
      React.useCallback(
         (fp) => {
            return fetchPlaceAsserts({
               id: place.id,
               limit: fp.limit,
               offset: fp.offset
            }).then((a: AssertionEntitiesJSON) => {
               const r: AssertionEntities = {
                  events: {},
                  persons: {},
                  places: {},
                  sources: {}};
               setAssertionEntities(a, r);
               setEntities(e => mergeAssertionEntities(e, r));
               return a.asserts.map(assertionFromJSON);
            });
         },
         [place.id],
   );

   return (
      <div className="Place">
         <Segment attached={true} className="pageTitle">
            {place.name}
         </Segment>
         <Segment attached={true} className="pageContent">
            <AssertionTimeline
               dispatch={p.dispatch}
               entities={entities}
               fetchAsserts={fetchAsserts}
               fullHeight={true}
               metadata={p.metadata}
               minBatchSize={80}
               rowCount={count}
            />
         </Segment>
      </div>
   );
}

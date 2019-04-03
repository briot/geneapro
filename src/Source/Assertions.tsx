import * as React from "react";
import { GPDispatch, MetadataDict } from "../Store/State";
import {
   AssertionEntities,
   AssertionEntitiesJSON,
   assertionFromJSON,
   mergeAssertionEntities,
   setAssertionEntities
} from '../Server/Person';
import { fetchSourceAsserts } from "../Server/Source";
import { Assertion } from "../Store/Assertion";
import { AssertionTimeline } from "../Assertions/AssertionTimeline";
import { Source } from "../Store/Source";
import { InfiniteRowFetcher } from "../InfiniteList";

const MIN_BATCH_SIZE = 80;

interface SourceAssertionsProps {
   filter: string;
   source: Source;
   dispatch: GPDispatch;
   metadata: MetadataDict;
}
const SourceAssertions: React.FC<SourceAssertionsProps> = (p) => {
   const [entities, setEntities] = React.useState<AssertionEntities>({
      events: {}, persons: {}, places: {}, sources: {},
   });
   const [count, setCount] = React.useState(0);

   const fetchAsserts: InfiniteRowFetcher<Assertion> =
      React.useCallback(
         (fp) => {
            return fetchSourceAsserts({
               id: p.source.id,
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

               //  Are there more items to fetch ?
               const len = a.asserts.length;
               if (len > 0) {
                  setCount(c =>
                     Math.max(
                        c,
                        fp.offset +
                           (len >= fp.limit ? len + MIN_BATCH_SIZE : len)));
               }

               return a.asserts.map(assertionFromJSON);
            });
         },
         [p.source.id],
   );

   return <AssertionTimeline
             dispatch={p.dispatch}
             entities={entities}
             fetchAsserts={fetchAsserts}
             metadata={p.metadata}
             minBatchSize={MIN_BATCH_SIZE}
             rowCount={count}
          />;
}
export default SourceAssertions;

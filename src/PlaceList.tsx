import * as React from "react";
import InfiniteList, { InfiniteRowRenderer } from './InfiniteList';
import Page from "./Page";
import { Place } from "./Store/Place";
import { PlaceLink } from "./Links";
import { fetchPlacesFromServer } from "./Server/Place";
import "./PlaceList.css";

const fetchCount = (p: {filter: string}) =>
   fetch(`/data/places/count?filter=${encodeURI(p.filter)}`)
   .then((r: Response) => r.json());

const fetchRows = (p: {filter: string, offset: number, limit: number}) =>
   fetchPlacesFromServer(p);

const renderRow: InfiniteRowRenderer<Place> = (p) => (
   <div style={p.style} key={p.key}>
      <PlaceLink place={p.row} />
   </div>
);

const PlaceList: React.FC<{}> = () => {
   document.title = "List of places";
   return (
      <Page
         main={
            <InfiniteList
               title="Place"
               fetchRows={fetchRows}
               fetchCount={fetchCount}
               renderRow={renderRow}
            />
         }
      />
   );
};

export default PlaceList;

import * as React from "react";
import InfiniteList, { InfiniteRowRenderer } from './InfiniteList';
import Page from "./Page";
import { Source } from "./Store/Source";
import { SourceLink } from "./Links";
import { fetchSourcesFromServer } from "./Server/Source";
import "./SourceList.css";

const fetchCount = (p: {filter: string}) =>
   fetch(`/data/sources/count?filter=${encodeURI(p.filter)}`)
   .then((r: Response) => r.json());

const fetchRows = (p: {filter: string, offset: number, limit: number}) =>
   fetchSourcesFromServer(p);

const renderRow: InfiniteRowRenderer<Source> = (p) => (
   <div style={p.style} key={p.key}>
      <SourceLink source={p.row} showAbbrev={true} />
   </div>
);

const SourceList: React.FC<{}> = () => {
   document.title = "List of sources";
   return (
      <Page
         main={
            <InfiniteList
               title="Source"
               fetchRows={fetchRows}
               fetchCount={fetchCount}
               renderRow={renderRow}
            />
         }
      />
   );
};

export default SourceList;

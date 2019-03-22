import * as React from "react";
import { connect } from "react-redux";
import {
   List,
   ListRowRenderer
} from "react-virtualized";
import { Input, InputProps, Segment } from "semantic-ui-react";
import Page from "./Page";
import { AppState, GPDispatch } from "./Store/State";
import { Source, SourceSet } from "./Store/Source";
import { useComponentSize, useDebounce } from "./Hooks";
import { SourceLink } from "./Links";
import { fetchSources } from "./Store/Sagas";
import "./SourceList.css";

interface SourceListProps {
   allSources: SourceSet;
   dispatch: GPDispatch;
}
const SourceListConnected: React.FC<SourceListProps> = p => {
   const container = React.useRef<HTMLDivElement>(null);
   const [filter, setFilter] = React.useState("");
   const [sorted, setSorted] = React.useState<Source[]>([]);
   const size = useComponentSize(container);

   React.useEffect(() => fetchSources.execute(p.dispatch, {}), []);

   React.useEffect(() => {
      let list = Object.values(p.allSources);
      if (filter) {
         const lc_filter = filter.toLowerCase();
         list = list.filter(
            p2 => p2.title.toLowerCase().indexOf(lc_filter) >= 0
         );
      }
      setSorted(list.sort((p1, p2) => p1.abbrev.localeCompare(p2.abbrev)));
   }, [p.allSources, filter]);

   const onFilterChange = React.useCallback(
      useDebounce(
         (e: any, val: InputProps) => setFilter(val.value as string),
         250
      ),
      []
   );

   const renderRow: ListRowRenderer = React.useCallback(
      ({ index, isScrolling, key, style }) => (
         <div style={style}>
            <SourceLink id={sorted[index].id} showAbbrev={true} />
         </div>
      ),
      [sorted]
   );

   document.title = "List of sources";

   return (
      <Page
         main={
            <div className="SourceList List" ref={container}>
               <Segment
                  style={{ width: size.width }}
                  color="blue"
                  attached={true}
               >
                  <span>
                     {sorted.length} / {Object.keys(p.allSources).length}{" "}
                     Sources
                  </span>
                  <Input
                     icon="search"
                     placeholder="Filter..."
                     onChange={onFilterChange}
                     style={{ position: "absolute", right: "5px", top: "5px" }}
                  />
               </Segment>
               <List
                  width={size.width}
                  height={size.height}
                  rowCount={sorted.length}
                  rowHeight={30}
                  overscanCount={5}
                  rowRenderer={renderRow}
               />
            </div>
         }
      />
   );
};

const SourceList = connect(
   (state: AppState) => ({
      allSources: state.sources
   }),
   (dispatch: GPDispatch) => ({
      dispatch
   })
)(SourceListConnected);
export default SourceList;

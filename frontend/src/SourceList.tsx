import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import { InfiniteListFilter, InfiniteRowRenderer } from './InfiniteList';
import Page from "./Page";
import { AppState } from "./Store/State";
import {
   Source,
   SourceListSettings,
   changeSourceListSettings
} from "./Store/Source";
import { SourceLink } from "./Links";
import { fetchSourcesCount, fetchSourcesFromServer } from "./Server/Source";
import "./SourceList.css";

const renderRow: InfiniteRowRenderer<Source> = (p) => (
   <div style={p.style}>
      <SourceLink source={p.row} showAbbrev={true} />
   </div>
);

const SourceList: React.FC<unknown> = () => {
   const settings = useSelector((s: AppState) => s.sourcelist);
   const [count, setCount] = React.useState(0);
   const dispatch = useDispatch();

   document.title = "List of sources";

   const onSettingsChange = React.useCallback(
      (diff: Partial<SourceListSettings>) =>
         dispatch(changeSourceListSettings({ diff })),
      [dispatch]
   );

   const onFilterChange = React.useCallback(
      (filter: string) => onSettingsChange({ filter }),
      [onSettingsChange]
   );

   React.useEffect(
      () => {
         fetchSourcesCount({ filter: settings.filter }).then(setCount);
      },
      [settings.filter]
   );

   const fetchSources = React.useCallback(
      (a: {offset: number; limit: number}) => {
         return fetchSourcesFromServer({ ...a, filter: settings.filter });
      },
      [settings.filter]
   );

   return (
      <Page
         main={
            <InfiniteListFilter
               title="Source"
               fetchRows={fetchSources}
               filter={settings.filter}
               fullHeight={true}
               renderRow={renderRow}
               rowCount={count}
               onFilterChange={onFilterChange}
            />
         }
      />
   );
};
export default SourceList;

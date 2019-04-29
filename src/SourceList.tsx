import * as React from "react";
import { connect } from "react-redux";
import { InfiniteListFilter, InfiniteRowRenderer } from './InfiniteList';
import Page from "./Page";
import { AppState, GPDispatch } from "./Store/State";
import {
   Source,
   SourceListSettings,
   changeSourceListSettings
} from "./Store/Source";
import { SourceLink } from "./Links";
import { fetchSourcesCount, fetchSourcesFromServer } from "./Server/Source";
import "./SourceList.css";

const renderRow: InfiniteRowRenderer<Source> = (p) => (
   <div style={p.style} key={p.key}>
      <SourceLink source={p.row} showAbbrev={true} />
   </div>
);

interface SourceListProps {
   dispatch: GPDispatch;
   settings: SourceListSettings;
}

const SourceList: React.FC<SourceListProps> = (p) => {
   const [count, setCount] = React.useState(0);
   const { dispatch } = p;

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
         fetchSourcesCount({ filter: p.settings.filter }).then(setCount);
      },
      [p.settings.filter]
   );

   const fetchSources = React.useCallback(
      (a) => {
         return fetchSourcesFromServer({ ...a, filter: p.settings.filter });
      },
      [p.settings.filter]
   );

   return (
      <Page
         main={
            <InfiniteListFilter
               title="Source"
               fetchRows={fetchSources}
               filter={p.settings.filter}
               fullHeight={true}
               renderRow={renderRow}
               rowCount={count}
               onFilterChange={onFilterChange}
            />
         }
      />
   );
};

export default connect(
   (state: AppState) => ({ settings: state.sourcelist }),
   (dispatch: GPDispatch) => ({ dispatch })
)(SourceList);

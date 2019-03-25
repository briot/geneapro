import * as React from "react";
import { connect } from "react-redux";
import InfiniteList, { InfiniteRowRenderer } from './InfiniteList';
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

const renderRow: InfiniteRowRenderer<Source, SourceListSettings> = (p) => (
   <div style={p.style} key={p.key}>
      <SourceLink source={p.row} showAbbrev={true} />
   </div>
);

interface SourceListProps {
   dispatch: GPDispatch;
   settings: SourceListSettings;
}

const SourceList: React.FC<SourceListProps> = (p) => {
   document.title = "List of sources";

   const onSettingsChange = React.useCallback(
      (diff: Partial<SourceListSettings>) =>
         p.dispatch(changeSourceListSettings({ diff })),
      [p.dispatch]
   );

   return (
      <Page
         main={
            <InfiniteList
               title="Source"
               fetchRows={fetchSourcesFromServer}
               fetchCount={fetchSourcesCount}
               renderRow={renderRow}
               settings={p.settings}
               onSettingsChange={onSettingsChange}
            />
         }
      />
   );
};

export default connect(
   (state: AppState) => ({ settings: state.sourcelist }),
   (dispatch: GPDispatch) => ({ dispatch })
)(SourceList);

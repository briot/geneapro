import * as React from "react";
import { connect } from "react-redux";
import InfiniteList, { InfiniteRowRenderer } from './InfiniteList';
import { AppState, GPDispatch } from "./Store/State";
import Page from "./Page";
import {
   Place,
   PlaceListSettings,
   changePlaceListSettings
} from "./Store/Place";
import { PlaceLink } from "./Links";
import { fetchPlacesCount, fetchPlacesFromServer } from "./Server/Place";
import "./PlaceList.css";

const renderRow: InfiniteRowRenderer<Place, PlaceListSettings> = (p) => (
   <div style={p.style} key={p.key}>
      <PlaceLink place={p.row} />
   </div>
);

interface PlaceListProps {
   dispatch: GPDispatch;
   settings: PlaceListSettings;
}

const PlaceList: React.FC<PlaceListProps> = (p) => {
   document.title = "List of places";

   const onSettingsChange = React.useCallback(
      (diff: Partial<PlaceListSettings>) =>
         p.dispatch(changePlaceListSettings({ diff })),
      [p.dispatch]
   );

   return (
      <Page
         main={
            <InfiniteList
               title="Place"
               fetchRows={fetchPlacesFromServer}
               fetchCount={fetchPlacesCount}
               renderRow={renderRow}
               settings={p.settings}
               onSettingsChange={onSettingsChange}
            />
         }
      />
   );
};

export default connect(
   (state: AppState) => ({ settings: state.placelist }),
   (dispatch: GPDispatch) => ({ dispatch })
)(PlaceList);

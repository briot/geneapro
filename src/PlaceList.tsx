import * as React from "react";
import { connect } from "react-redux";
import * as GP_JSON from "./Server/JSON";
import {
   InfiniteListFilter,
   InfiniteRowFetcher,
   InfiniteRowRenderer
} from './InfiniteList';
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

const renderRow: InfiniteRowRenderer<Place> = (p) => (
   <div style={p.style} key={p.key}>
      <PlaceLink place={p.row} />
   </div>
);

const fetchPlaces: InfiniteRowFetcher<Place> = (p) => {
   return fetchPlacesFromServer(p)
      .then((list: GP_JSON.Place[]) =>
         list.map(a => ({ id: a.id, name: a.name }))
      );
};

interface PlaceListProps {
   dispatch: GPDispatch;
   settings: PlaceListSettings;
}

const PlaceList: React.FC<PlaceListProps> = (p) => {
   const [count, setCount] = React.useState(0);

   document.title = "List of places";

   const onSettingsChange = React.useCallback(
      (diff: Partial<PlaceListSettings>) =>
         p.dispatch(changePlaceListSettings({ diff })),
      [p.dispatch]
   );

   const onFilterChange = React.useCallback(
      (filter: string) => onSettingsChange({ filter }),
      [onSettingsChange]
   );

   React.useEffect(
      () => {
         fetchPlacesCount({ filter: p.settings.filter })
            .then(c => setCount(c));
      },
      [p.settings.filter]
   );

   return (
      <Page
         main={
            <InfiniteListFilter
               fetchRows={fetchPlaces}
               filter={p.settings.filter}
               renderRow={renderRow}
               rowCount={count}
               title="Place"
               onFilterChange={onFilterChange}
            />
         }
      />
   );
};

export default connect(
   (state: AppState) => ({ settings: state.placelist }),
   (dispatch: GPDispatch) => ({ dispatch })
)(PlaceList);

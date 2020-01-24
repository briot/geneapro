import * as React from "react";
import { connect, useDispatch } from "react-redux";
import {
   InfiniteListFilter,
   InfiniteRowFetcher,
   InfiniteRowRenderer
} from './InfiniteList';
import { AppState } from "./Store/State";
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

interface PlaceListProps {
   settings: PlaceListSettings;
}

const PlaceList: React.FC<PlaceListProps> = (p) => {
   const [count, setCount] = React.useState(0);
   const dispatch = useDispatch();

   document.title = "List of places";

   const onSettingsChange = React.useCallback(
      (diff: Partial<PlaceListSettings>) =>
         dispatch(changePlaceListSettings({ diff })),
      [dispatch]
   );

   const onFilterChange = React.useCallback(
      (filter: string) => onSettingsChange({ filter }),
      [onSettingsChange]
   );

   const fetchPlaces: InfiniteRowFetcher<Place> = React.useCallback(
      (pl) => fetchPlacesFromServer({ ...pl, filter: p.settings.filter }),
      [p.settings.filter]
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
               fullHeight={true}
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
)(PlaceList);

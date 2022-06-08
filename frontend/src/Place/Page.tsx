import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Loader } from "semantic-ui-react";
import { useParams } from "react-router";
import { AppState } from "../Store/State";
import { addToHistory, HistoryKind } from "../Store/History";
import { usePlace } from "../Server/Place";
import PlaceDetails from "../Place/PlaceDetails";
import Page from "../Page";

type PlacePageParams = {
   id?: string;
}

const PlacePage: React.FC<unknown> = () => {
   const params = useParams<PlacePageParams>();
   const id = Number(params.id);
   const metadata = useSelector((s: AppState) => s.metadata);
   const dispatch = useDispatch();
   const place = usePlace(id);

   React.useEffect(
      () => { document.title = place ? place.name : "Place"; },
      [place]
   );

   React.useEffect(
      () => {
         dispatch(addToHistory({kind: HistoryKind.PLACE, id: id }));
      },
      [dispatch, id]
   );

   return (
      <Page
         decujusid={undefined}
         main={
            place ? (
               <PlaceDetails
                  metadata={metadata}
                  place={place}
               />
            ) : (
               <Loader active={true} size="large">
                  Loading
               </Loader>
            )
         }
      />
   );
}

export default PlacePage;

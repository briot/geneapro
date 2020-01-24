import * as React from "react";
import { connect, useDispatch } from "react-redux";
import { Loader } from "semantic-ui-react";
import { RouteComponentProps } from "react-router";
import { AppState, MetadataDict } from "../Store/State";
import { addToHistory, HistoryKind } from "../Store/History";
import { usePlace } from "../Server/Place";
import PlaceDetails from "../Place/PlaceDetails";
import Page from "../Page";

interface PropsFromRoute {
   id: string;
}

interface PlacePageProps extends RouteComponentProps<PropsFromRoute> {
   metadata: MetadataDict;
}

const PlacePage: React.FC<PlacePageProps> = (p) => {
   const id = Number(p.match.params.id);
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
                  metadata={p.metadata}
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

export default connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      metadata: state.metadata,
   }),
)(PlacePage);

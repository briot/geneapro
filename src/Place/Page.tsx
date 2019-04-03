import * as React from "react";
import { connect } from "react-redux";
import { Loader } from "semantic-ui-react";
import { RouteComponentProps } from "react-router";
import { AssertionEntities } from "../Server/Person";
import { AppState, getEntities, GPDispatch, MetadataDict } from "../Store/State";
import { addToHistory, HistoryKind } from "../Store/History";
import { fetchPlaceDetails } from "../Store/Sagas";
import { Place } from "../Store/Place";
import PlaceDetails from "../Place/PlaceDetails";
import Page from "../Page";

interface PropsFromRoute {
   id: string;
}

interface PlacePageProps extends RouteComponentProps<PropsFromRoute> {
   id: number;
   place: Place | undefined;
   entities: AssertionEntities;
   metadata: MetadataDict;
   dispatch: GPDispatch;
}

const PlacePage: React.FC<PlacePageProps> = (p) => {
   const { dispatch } = p;

   React.useEffect(
      () => { document.title = p.place ? p.place.name : "Place"; },
      [p.place]
   );

   React.useEffect(
      () => {
         p.id >= 0 && fetchPlaceDetails.execute(dispatch, { id: p.id });
      },
      [dispatch, p.id],
   );

   React.useEffect(
      () => {
         dispatch(addToHistory({kind: HistoryKind.PLACE, id: p.id }));
      },
      [dispatch, p.id]
   );

   return (
      <Page
         decujusid={undefined}
         main={
            p.place || p.id < 0 ? (
               <PlaceDetails
                  dispatch={dispatch}
                  entities={p.entities}
                  metadata={p.metadata}
                  place={p.place}
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
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => {
      const id = Number(props.match.params.id);
      return {
         ...props,
         id,
         entities: getEntities(state),
         metadata: state.metadata,
         place: state.places[id] as Place | undefined
      };
   },
   (dispatch: GPDispatch) => ({ dispatch })
)(PlacePage);

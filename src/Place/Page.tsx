import * as React from "react";
import { connect } from "react-redux";
import { Loader } from "semantic-ui-react";
import { RouteComponentProps } from "react-router";
import { AppState, GPDispatch } from "../Store/State";
import { addToHistory } from "../Store/History";
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
   dispatch: GPDispatch;
}

class PlacePageConnected extends React.PureComponent<PlacePageProps> {
   public componentDidMount() {
      this.calculateData();
   }

   public componentDidUpdate(old: PlacePageProps) {
      if (old.id !== this.props.id) {
         this.calculateData();
      }
      this.props.dispatch(addToHistory({ place: this.props.place }));
   }

   protected calculateData() {
      if (this.props.id >= 0) {
         fetchPlaceDetails.execute(this.props.dispatch, { id: this.props.id });
      }
   }

   public render() {
      const p = this.props.place;
      document.title = p ? p.name : "Place";
      return (
         <Page
            decujus={undefined}
            main={
               p || this.props.id < 0 ? (
                  <PlaceDetails place={p} />
               ) : (
                  <Loader active={true} size="large">
                     Loading
                  </Loader>
               )
            }
         />
      );
   }
}

const PlacePage = connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => {
      const id = Number(props.match.params.id);
      return {
         ...props,
         id,
         place: state.places[id] as Place | undefined
      };
   },
   (dispatch: GPDispatch) => ({
      dispatch
   })
)(PlacePageConnected);

export default PlacePage;

import * as React from 'react';
import { connect } from 'react-redux';
import { AppState } from './Store/State';
import { PlaceSet } from './Store/Place';

interface PlaceNameProps {
   id?: number;
   allPlaces: PlaceSet;
}

class PlaceNameConnected extends React.PureComponent<PlaceNameProps> {
   render() {
      const place = this.props.id ?
         this.props.allPlaces[this.props.id] :
         undefined;

      if (!place) {
         return null;
      }

      return <span className="place">{place.name}</span>;
   }
}

export const PlaceName = connect(
   (state: AppState) => ({
      allPlaces: state.places,
   })
)(PlaceNameConnected);

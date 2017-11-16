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
      return this.props.id ?
         <span className="place">{this.props.allPlaces[this.props.id].name}</span> :
         null;
   }
}

export const PlaceName = connect(
   (state: AppState) => ({
      allPlaces: state.places,
   })
)(PlaceNameConnected);

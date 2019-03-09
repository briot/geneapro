import * as React from 'react';
import { connect } from 'react-redux';
import Page from './Page';
import { AppState, GPDispatch } from './Store/State';
import { Input, Segment } from 'semantic-ui-react';
import { Place, PlaceSet } from './Store/Place';
import { PlaceLink } from './Links';
import { fetchPlaces } from './Store/Sagas';
import SmartTable, { ColumnDescr } from './SmartTable';
import './PlaceList.css';

const ColName: ColumnDescr<Place, Place> = {
   headerName: 'Name',
   get: (p: Place) => p,
   format: (p: Place) => <PlaceLink id={p.id} />,
};

interface PlaceListProps {
   allPlaces: PlaceSet;
   dispatch: GPDispatch;
}

interface PlaceListState {
   filter?: string;
   places: Place[];
}

class PlaceListConnected extends React.PureComponent<PlaceListProps, PlaceListState> {
   state: PlaceListState = {
      filter: '',
      places: [],
   };

   readonly cols: ColumnDescr<Place, Place>[] = [ColName];

   componentDidUpdate(old: PlaceListProps) {
      if (old.allPlaces !== this.props.allPlaces) {
         this.setState((s: PlaceListState) => ({
            ...s,
            places: this.computePlaces(this.props.allPlaces, s.filter),
         }));
      }
   }

   componentDidMount() {
      fetchPlaces.execute(this.props.dispatch, {});
   }

   computePlaces(set: PlaceSet, filter?: string): Place[] {
      let list = Object.entries(set)
         .map(
            ([key, val]: [string, Place]) => val).sort(
            (p1: Place, p2: Place) => p1.name.localeCompare(p2.name));

      if (filter) {
         list = list.filter(
            (p: Place) => p.name.toLowerCase().indexOf(filter) >= 0
         );
      }

      return list;
   }

   filterChange = (e: React.FormEvent<HTMLElement>, val: {value: string}) => {
      this.setState({
         filter: val.value,
         places: this.computePlaces(this.props.allPlaces, val.value),
      });
   }

   render() {
      const width = 900;
      document.title = 'List of places';

      const places = this.state.places;

      return (
         <Page
            main={
               <div className="PlaceList List">
                  <Segment
                     style={{width: width}}
                     color="blue"
                     attached={true}
                  >
                     <span>
                        {places.length} / {Object.keys(this.props.allPlaces).length} Places
                     </span>
                     <Input
                        icon="search"
                        placeholder="Filter..."
                        onChange={this.filterChange}
                        style={{position: 'absolute', right: '5px', top: '5px'}}
                     />
                  </Segment>
                  <SmartTable
                     width={width}
                     rowHeight={30}
                     rows={places}
                     columns={this.cols}
                  />
               </div>
            }
         />
      );
   }
}

const PlaceList = connect(
   (state: AppState) => ({
      allPlaces: state.places,
   }),
   (dispatch: GPDispatch) => ({
      dispatch
   }),
)(PlaceListConnected);
export default PlaceList;

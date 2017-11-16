import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { connect } from 'react-redux';
import 'fixed-data-table/dist/fixed-data-table.css';
import Page from './Page';
import { AppState, GPDispatch } from './Store/State';
import { Input, Segment } from 'semantic-ui-react';
import { Place, PlaceSet } from './Store/Place';
import { PlaceLink } from './Links';
import { Table, CellProps, Column, Cell } from 'fixed-data-table';
import { fetchPlaces } from './Store/Sagas';

import './PlaceList.css';

interface PlaceListProps {
   decujus: number;
   allPlaces: PlaceSet;
   dispatch: GPDispatch;
}

interface PlaceListState {
   filter?: string;
   places: Place[];
}

class PlaceListConnected extends React.PureComponent<PlaceListProps, PlaceListState> {
   constructor() {
      super();
      this.state = {
         filter: '',
         places: [],
      };
   }

   componentWillReceiveProps(nextProps: PlaceListProps) {
      if (nextProps.allPlaces !== this.props.allPlaces) {
         this.setState((s: PlaceListState) => ({
            ...s,
            places: this.computePlaces(nextProps.allPlaces, s.filter),
         }));
      }
   }

   componentWillMount() {
      this.props.dispatch(fetchPlaces.request({}));
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
            decujus={this.props.decujus}
            main={
               <div className="PlaceList">
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
                  <Table
                     rowHeight={30}
                     rowsCount={places.length}
                     width={width}
                     height={600}
                     footerHeight={0}
                     headerHeight={30}
                  >
                     <Column
                             header={<Cell>Name</Cell>}
                             cell={({rowIndex, ...props}: CellProps) => {
                                const p: Place = places[rowIndex as number];
                                return (
                                   <Cell {...props}>
                                      <PlaceLink place={p} />
                                   </Cell>
                                );
                             }}
                             isResizable={false}
                             width={width}
                     />
                  </Table>
               </div>
            }
         />
      );
   }
}

interface PropsFromRoute {
   decujus: string;
}

const PlaceList = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => ({
      allPlaces: state.places,
      decujus: Number(ownProps.match.params.decujus),
   }),
   (dispatch: GPDispatch) => ({
      dispatch
   }),
)(PlaceListConnected);
export default PlaceList;

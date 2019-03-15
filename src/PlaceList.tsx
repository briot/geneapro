import * as React from 'react';
import { connect } from 'react-redux';
import { FixedSizeList } from 'react-window';
import { Input, InputProps, Segment } from 'semantic-ui-react';
import Page from './Page';
import { AppState, GPDispatch } from './Store/State';
import { Place, PlaceSet } from './Store/Place';
import { useComponentSize, useDebounce } from './Hooks';
import { PlaceLink } from './Links';
import { fetchPlaces } from './Store/Sagas';
import './PlaceList.css';

interface PlaceListProps {
   allPlaces: PlaceSet;
   dispatch: GPDispatch;
}
const PlaceListConnected: React.FC<PlaceListProps> = (p => {
   const container = React.useRef<HTMLDivElement>(null);
   const [filter, setFilter] = React.useState('');
   const [sorted, setSorted] = React.useState<Place[]>([]);
   const size = useComponentSize(container);

   React.useEffect(
      () => fetchPlaces.execute(p.dispatch, {}),
      []);

   React.useEffect(
      () => {
         let list = Object.values(p.allPlaces);
         if (filter) {
            const lc_filter = filter.toLowerCase();
            list = list.filter(
               p2 => p2.name.toLowerCase().indexOf(lc_filter) >= 0);
         }
         setSorted(list.sort((p1, p2) => p1.name.localeCompare(p2.name)));
      },
      [p.allPlaces, filter],
   );

   const onFilterChange = React.useCallback(
      useDebounce(
         (e: any, val: InputProps) => setFilter(val.value as string),
         250),
      []);

   document.title = 'List of places';

   return (
      <Page
         main={
            <div className="PlaceList List" ref={container}>
               <Segment
                  color="blue"
                  attached={true}
               >
                  <span>
                     {sorted.length} / {Object.keys(p.allPlaces).length} Places
                  </span>
                  <Input
                     icon="search"
                     placeholder="Filter..."
                     onChange={onFilterChange}
                     style={{position: 'absolute', right: '5px', top: '5px'}}
                  />
               </Segment>
               <FixedSizeList
                  width={size.width}
                  height={size.height}
                  itemCount={sorted.length}
                  itemSize={30}
               >
                  {
                     ({index, style}: {index: number, style: object}) => (
                         <div style={style}>
                            <PlaceLink id={sorted[index].id} />
                         </div>
                     )
                  }
               </FixedSizeList>
            </div>
         }
      />
   );
});

const PlaceList = connect(
   (state: AppState) => ({
      allPlaces: state.places,
   }),
   (dispatch: GPDispatch) => ({
      dispatch
   }),
)(PlaceListConnected);
export default PlaceList;

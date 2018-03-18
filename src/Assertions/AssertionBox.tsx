import * as React from 'react';
import { Rating, Segment } from 'semantic-ui-react';
import { connect } from 'react-redux';
import { AppState } from '../Store/State';
import { PlaceName } from '../Place';
import { PlaceSet } from '../Store/Place';
import './AssertionBox.css';

interface BoxProps {
   color: 'red'|'blue'|'green';
   date?: string;
   placeId?: number;  // points to a Place in the store
   title: JSX.Element;
   content: JSX.Element;
}

interface ConnectedBoxProps extends BoxProps {
   places: PlaceSet;
}

function AssertionBoxConnected(props: ConnectedBoxProps) {
   return (
      <Segment color={props.color} className="Assertion">
         <Rating
            style={{float: 'right'}}
            rating={1}   /* ??? Incorrect */
            size="mini"
            maxRating={5}
         />
         <div style={{textAlign: 'center'}}>
            {props.title}
         </div>
         <div>
            {props.date ?
               <span className="fullDate">{props.date}</span> :
               null
            }
            <PlaceName id={props.placeId} />
         </div>
         <div>
            {props.content}
         </div>
      </Segment>
   );
}

const AssertionBox = connect(
   (state: AppState, props: BoxProps) => ({
      ...props,
      places: state.places
   }),
)(AssertionBoxConnected);
export default AssertionBox;

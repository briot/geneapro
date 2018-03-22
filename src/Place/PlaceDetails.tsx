import * as React from 'react';
import { Segment } from 'semantic-ui-react';
import { Assertion } from '../Store/Assertion';
import { Place } from '../Store/Place';
import AssertionView from '../Assertions/Assertion';
import './PlaceDetails.css';

interface PlaceProps {
   place?: Place;
}

export default class PlaceDetails extends React.PureComponent<PlaceProps, {}> {
   
   render() {
      return (
         <div className="Place">
            <Segment attached={true} className="pageTitle">
               {this.props.place && this.props.place.name}
            </Segment>
            <Segment attached={true} className="pageContent">
               {
                  this.props.place &&
                  this.props.place.asserts &&
                  this.props.place.asserts.map(
                     (a: Assertion, idx: number) => (
                        <AssertionView key={idx} assert={a} />
                     )
                  )
               } 
            </Segment>
         </div>
      );
   }

}

import * as React from 'react';
import { Segment } from 'semantic-ui-react';
import { Assertion, P2E, P2C } from '../Store/Assertion';
import { Place } from '../Store/Place';
import P2EView from '../Assertions/P2E';
import P2CView from '../Assertions/P2C';
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
                        a instanceof P2E ? <P2EView key={idx} p2e={a} /> :
                        a instanceof P2C ? <P2CView key={idx} p2c={a} /> :
                        <span key={idx}>Assertion</span>
                     )
                  )
               } 
            </Segment>
         </div>
      );
   }

}

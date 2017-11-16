import * as React from 'react';
import { Rating, Segment } from 'semantic-ui-react';
import { PlaceName } from '../Place';

interface BoxProps {
   color: 'red'|'blue'|'green';
   date?: string;
   placeId?: number;  // points to a Place in the store
   title: JSX.Element;
   content: JSX.Element;
}
export default function Box(props: BoxProps) {
   return (
      <Segment color={props.color}>
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

import * as React from 'react';
import { Rating, Segment } from 'semantic-ui-react';
import { Place } from '../Store/Event';

interface BoxProps {
   color: 'red'|'blue'|'green';
   date?: string;
   place?: Place;
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
            {props.place ?
               <span className="place">{props.place.name}</span> :
               null
            }
         </div>
         <div>
            {props.content}
         </div>
      </Segment>
   );
}

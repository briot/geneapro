import * as React from 'react';
import { Icon, Rating, Segment } from 'semantic-ui-react';
import { PlaceLink } from '../Links';
import './AssertionBox.css';

interface BoxProps {
   color: 'red'|'blue'|'green';
   date?: string;
   dateSort?: string;
   placeId?: number;  // points to a Place in the store
   tag?: string|JSX.Element;
   title?: string;
   content?: JSX.Element;

   onExpand?: () => void;
   expandable?: boolean;
   // If true, the content is hidden by default, and will be revealed when
   // clicking on an arrow.
}

interface BoxState {
   expanded: boolean;
}

export default class AssertionBox extends React.PureComponent<BoxProps, BoxState> {
   constructor(props: BoxProps) {
      super(props);
      this.state = {
         expanded: false,
      };
   }

   onExpand = () => {
      if (this.props.expandable) {
         this.setState(old => {
            if (!old.expanded) {
               if (this.props.onExpand) {
                  this.props.onExpand();
               }
            }
            return {expanded: !old.expanded};
         });
      }
   }

   render() {
      const p = this.props;
      return (
         <Segment color={p.color} className="Assertion">
            <div className="expander" onClick={this.onExpand}>
               {
                  p.expandable &&
                     <Icon name={this.state.expanded ? 'dropdown' : 'triangle right'} />
               }
            </div>

            <div className="assertionTitle">
               <div className="dateAndTag">
                  <div>
                  {
                     p.date &&
                     <span title={p.dateSort}>{p.date}</span>
                  }
                  </div>
                  <div>
                     {p.tag}
                  </div>
               </div>

               <div className={'nameAndPlace ' + (p.title || p.placeId ? 'bordered ' : '')}>
                  <div>{p.title}</div>
                  <div>{p.placeId && <PlaceLink id={p.placeId} />}</div>
               </div>

               <Rating
                  className="rating"
                  rating={1}   /* ??? Incorrect */
                  size="mini"
                  maxRating={5}
               />
            </div>

            {
               (!p.expandable || this.state.expanded) &&
               <div className="details">{p.content}</div>
            }
         </Segment>
      );
   }
}

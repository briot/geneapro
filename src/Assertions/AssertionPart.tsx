import * as React from 'react';
import { Icon, Segment } from 'semantic-ui-react';

/**
 * Assertion Part
 * one of the two components of an assertion (event, person, characteristic,...)
 */

interface PartProps {
   title: JSX.Element;    // The always-visible content

   onExpand?: () => void;
   expanded?: JSX.Element; // The expanded content
   expandable?: boolean;
   // If True, the content is hidden by default, and will be revealed when
   // clicking on an arrow.
}

interface PartState {
   expanded: boolean;
}

export default class AssertionPart extends React.PureComponent<PartProps, PartState> {
   constructor(props: PartProps) {
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
         <Segment attached={true}>
            <div className="expander" onClick={this.onExpand}>
               {
                  p.expandable &&
                     <Icon name={this.state.expanded ? 'dropdown' : 'triangle right'} />
               }
            </div>
            <div className="assertionTitle">
               {p.title}
            </div>
            {
               (!p.expandable || this.state.expanded) &&
               <div>{p.expanded}</div>
            }
         </Segment>
      );
   }
}

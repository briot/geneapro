import * as React from 'react';
import { connect } from 'react-redux';
import { Loader, Rating, Segment } from 'semantic-ui-react';
import { GenealogyEvent, GenealogyEventSet } from '../Store/Event';
import { PersonSet } from '../Store/Person';
import { P2E } from '../Store/Assertion';
import { AppState, GPDispatch } from '../Store/State';
import { fetchEventDetails } from '../Store/Sagas';
import { PersonaLink, SourceLink } from '../Links';
import AssertionBox from '../Assertions/AssertionBox';

interface EventDetailsProps {
   event: GenealogyEvent;
}

function EventDetails(props: EventDetailsProps) {
   if (props.event.persons === undefined) {
      return <Loader active={true} size="small">Loading</Loader>;
   }
   return (
      <Segment.Group className="eventDetails">
         {props.event.persons.map(
            p => (
               <Segment key={p.id}>
                  <div>
                     <Rating
                        style={{float: 'right'}}
                        rating={1}   /* ??? Incorrect */
                        size="mini"
                        maxRating={5}
                     />
                     <span
                        style={{float: 'right'}}
                     >
                        <SourceLink id={p.sourceId} />
                     </span>
                     <span className="role">{p.role}</span>
                     <PersonaLink
                        className="name"
                        id={p.id}
                        givn={p.name}
                     />
                  </div>
                  <div className="rationale">
                     {p.rationale}
                  </div>
               </Segment>
            )
          )
         }
      </Segment.Group>
   );
}

interface P2EProps {
   p2e: P2E;

   hidePerson?: boolean;
   // If true, does not display the person. Useful when on the Persona page,
   // where we have already displayed the person.
}

interface P2EConnectedProps extends P2EProps {
   events: GenealogyEventSet;
   persons: PersonSet;
   dispatch: GPDispatch;
}

class P2EViewConnected extends React.PureComponent<P2EConnectedProps> {

   onExpand = () => {
      this.props.dispatch(fetchEventDetails.request({id: this.props.p2e.eventId}));
   }

   render() {
      const a = this.props.p2e;  //  the assertion
      const e = this.props.events[a.eventId];
      // const p = this.props.hidePerson ? undefined : this.props.persons[a.personId];

      if (!e) {
         return (
            <AssertionBox
               color="green"
               title="Unknown event"
               content={<span>Unknown event</span>}
            />
         );
      }

      return (
         <AssertionBox
            color="green"
            date={e.date}
            dateSort={e.date_sort}
            tag={<span>
                    {e.type ? e.type.name : 'Unknown'}
                    {
                        a.role !== 'principal' &&
                        <span className="role"> ({a.role})</span>
                    }
                 </span>
                }
            placeId={e.placeId}
            title={e.name}
            expandable={true}
            onExpand={this.onExpand}
            content={<EventDetails event={e} />}
         />
      );
   }
}

const P2EView = connect(
   (state: AppState, props: P2EProps) => ({
      ...props,
      events: state.events,
      persons: state.persons,
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(P2EViewConnected);
export default P2EView;

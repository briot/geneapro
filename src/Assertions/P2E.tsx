import * as React from 'react';
import { connect } from 'react-redux';
import { Accordion, Icon, Loader, Rating, Segment } from 'semantic-ui-react';
import { GenealogyEvent, GenealogyEventSet } from '../Store/Event';
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
            (p) => (
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
}

interface P2EConnectedProps extends P2EProps {
   events: GenealogyEventSet;
   dispatch: GPDispatch;
}

interface P2EState {
   showDetails: boolean;
}

class P2EViewConnected extends React.PureComponent<P2EConnectedProps, P2EState> {

   constructor() {
      super();
      this.state = {
         showDetails: false,
      };
   }

   onTitleClick = (e: React.SyntheticEvent<HTMLElement>, props2: {active: boolean}) => {
      const show = !this.state.showDetails;
      this.setState({showDetails: show});
      if (show) {
         // Fetch event details
         this.props.dispatch(fetchEventDetails.request({id: this.props.p2e.eventId}));
      }
   }

   render() {
      const a = this.props.p2e;  //  the assertion
      const e = this.props.events[a.eventId];

      if (!e) {
         return (
            <AssertionBox
               color="green"
               title={<span>Unknown event</span>}
               content={<span>Unknown event</span>}
            />
         );
      }

      return (
         <AssertionBox
            color="green"
            date={e.date}
            placeId={e.placeId}
            title={
               <div>
                  <span className="type">
                     {e.type ?  e.type.name : ''}
                  </span>
                  {a.role !== 'principal' ?
                     <span className="role">(as {a.role})</span> :
                     null}
               </div>
            }
            content={
               <Accordion
                  styled={false}
                  exclusive={false}
                  fluid={true}
               >
                  <Accordion.Title
                     active={this.state.showDetails}
                     onClick={this.onTitleClick}
                  >
                     <Icon name="dropdown" />
                     {e.name}
                  </Accordion.Title>
                  <Accordion.Content
                     active={this.state.showDetails}
                  >
                     <EventDetails event={e} />
                  </Accordion.Content>
               </Accordion>}
         />
      );
   }
}

const P2EView = connect(
   (state: AppState, props: P2EProps) => ({
      ...props,
      events: state.events
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(P2EViewConnected);
export default P2EView;

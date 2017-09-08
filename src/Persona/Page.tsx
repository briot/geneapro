import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Accordion, Icon, Loader, Rating, Segment } from 'semantic-ui-react';
import { Person, addToHistory, EventAndRole, Characteristic,
         CharacteristicPart } from '../Store/Person';
import { Place } from '../Store/Event';
import { AppState, GPDispatch } from '../Store/State';
import { fetchPersonDetails, fetchEventDetails } from '../Store/Sagas';
import { GenealogyEvent, GenealogyEventSet } from '../Store/Event';
import { PersonaLink, SourceLink } from '../Links';
import Page from '../Page';
import './Persona.css';

interface BoxProps {
   color: 'red'|'blue'|'green';
   date?: string;
   place?: Place;
   title: JSX.Element;
   content: JSX.Element;
}
function Box(props: BoxProps) {
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

interface PersonaEventDetailsProps {
   event: GenealogyEvent;
}

function PersonaEventDetails(props: PersonaEventDetailsProps) {
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

interface PersonaEventProps {
   role: string;
   event: GenealogyEvent;
   onShowDetails?: (id: number) => void;
}

interface PersonaEventState {
   showDetails: boolean;
}

class PersonaEvent extends React.PureComponent<PersonaEventProps, PersonaEventState> {

   constructor() {
      super();
      this.state = {
         showDetails: false,
      };
   }

   onTitleClick = (e: React.SyntheticEvent<HTMLElement>, props2: {active: boolean}) => {
      const show = !this.state.showDetails;
      this.setState({showDetails: show});
      if (show && this.props.onShowDetails) {
         this.props.onShowDetails(this.props.event.id);
      }
   }

   render() {
      return (
         <Box
            color="green"
            date={this.props.event.date}
            place={this.props.event.place}
            title={
               <div>
                  <span className="type">
                     {this.props.event.type ?  this.props.event.type.name : ''}
                  </span>
                  {this.props.role !== 'principal' ?
                     <span className="role">(as {this.props.role})</span> :
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
                     onClick={this.onTitleClick}
                  >
                     <Icon name="dropdown" />
                     {this.props.event.name}
                  </Accordion.Title>
                  <Accordion.Content>
                     <PersonaEventDetails event={this.props.event} />
                  </Accordion.Content>
               </Accordion>}
         />
      );
   }
}

interface PersonaCharacteristicProps {
   char: Characteristic;
}

function PersonaCharacteristic(props: PersonaCharacteristicProps) {
   return (
      <Box
         color="blue"
         date={props.char.date}
         place={props.char.place}
         title={
            <span className="type">
               {props.char.name}
            </span>
         }
         content={
            <div>
               {props.char.parts.map(
                  (p: CharacteristicPart, idx: number) =>
                     <div key={idx}>
                        {p.name === props.char.name ?
                           '' :
                           p.name + ': '}
                        {p.value}
                     </div>)
               }
            </div>
         }
      />
   );
}

interface Item {
   id: string;
   date_sort?: string;
   item: JSX.Element;
}

interface PersonaProps {
   person: Person;
   events: GenealogyEventSet;
   onShowEventDetails?: (id: number) => void;
}

function Persona(props: PersonaProps) {
   const p: Person = props.person;

   let items: (Item|undefined)[] = [];
   const birthDate: number|undefined = p.birth && p.birth.date_sort ?
      Number(p.birth.date_sort.substring(0, 4)) :
      undefined;

   if (p.events) {
      items = items.concat(
         p.events.map(
            (evRole: EventAndRole) => {
               const ev = props.events[evRole.eventId];
               if (ev) {
                  return {date_sort: ev.date_sort,
                          id: 'event' + ev.id,
                          item: (
                             <PersonaEvent
                                onShowDetails={props.onShowEventDetails}
                                role={evRole.role}
                                event={ev}
                             />
                          ),
                  };
               }
               return undefined;
            }
         ));
   }

   if (p.chars) {
      items = items.concat(
         p.chars.map(
            (c: Characteristic, idx: number) => ({
               id: 'char' + idx,
               date_sort: c.date_sort,
               item: <PersonaCharacteristic char={c} />
            }))
      );
   }

   items.sort(
      (e1: Item, e2: Item) => {
         if (!e1.date_sort) {
            return -1;
         } else if (!e2.date_sort) {
            return 1;
         } else {
            return e1.date_sort.localeCompare(e2.date_sort);
         }
   });

   function ageAtDate(dateSort?: string): string {
      // We can't use javascript's Date, since it cannot represent
      // dates before 1970.
      if (birthDate && dateSort) {
         const b2 = Number(dateSort.substring(0, 4));
         return b2 === birthDate ?
            '' :
            `(${b2 - birthDate})`;
      }
      return '';
   }

   let prev: string|undefined;
   const rows: (JSX.Element|null)[] = items.map(
      (it: Item) => {
         const result = it === undefined ?
            null : (
            <tr key={it.id}>
               <td className="date">
                  {it.date_sort !== prev ? (
                     <div>
                        {it.date_sort}
                        <span className="age">{ageAtDate(it.date_sort)}</span>
                        <Icon name="circle" />
                     </div>
                  ) : null}
               </td>
               <td>
                  {it.item}
               </td>
            </tr>
         );
         prev = it ? it.date_sort : undefined;
         return result;
      });

   return (
      <div className="Persona">
         <Segment attached={true} className="pagetitle">
            {p.surn.toUpperCase()}{' '}{p.givn}
         </Segment>
         <Segment attached={true} className="pageContent">
            <table>
               <tbody>
                  {rows}
               </tbody>
            </table>
         </Segment>
      </div>
   );
}

interface PersonaPageProps {
   id: number;
   person: Person;
   events: GenealogyEventSet;
   dispatch: GPDispatch;
}

class PersonaPageConnected extends React.PureComponent<PersonaPageProps> {
   componentWillMount() {
      this.props.dispatch(addToHistory({person: this.props.person}));
      this.props.dispatch(fetchPersonDetails.request({id: this.props.id}));
   }

   componentDidUpdate(oldProps: PersonaPageProps) {
      this.props.dispatch(addToHistory({person: this.props.person}));
      if (oldProps.id !== this.props.id) {
         this.props.dispatch(fetchPersonDetails.request({id: this.props.id}));
      }
   }

   onShowEventDetails = (id: number) => {
      this.props.dispatch(fetchEventDetails.request({id: id}));
   }

   render() {
      const p = this.props.person;
      document.title = p ?
         p.surn.toUpperCase() + ' ' + p.givn + ' (' + p.id + ')' :
         'Persona';
      return (
         <Page
            decujus={this.props.id}
            main={p ?
               <Persona
                  person={p}
                  events={this.props.events}
                  onShowEventDetails={this.onShowEventDetails}
               /> :
               <Loader active={true} size="large">Loading</Loader>
            }
         />
      );
   }
}

interface PropsFromRoute {
   id: string;
}

const PersonaPage = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => ({
      id: Number(ownProps.match.params.id),
      events: state.events,
      person: state.persons[Number(ownProps.match.params.id)],
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(PersonaPageConnected);

export default PersonaPage;

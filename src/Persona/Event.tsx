import * as React from 'react';
import { Accordion, Icon } from 'semantic-ui-react';
import { GenealogyEvent } from '../Store/Event';
import PersonaEventDetails from '../Persona/EventDetails';
import Box from '../Persona/Box';

interface PersonaEventProps {
   role: string;
   event: GenealogyEvent;
   onShowDetails?: (id: number) => void;
}

interface PersonaEventState {
   showDetails: boolean;
}

export default class PersonaEvent extends React.PureComponent<PersonaEventProps, PersonaEventState> {

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
            placeId={this.props.event.placeId}
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

import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { Person, personDisplay, personPlaceholder } from '../Store/Person';
import { addToHistory } from '../Store/History';
import { AppState, GPDispatch } from '../Store/State';
import { fetchPersonDetails, fetchEventDetails } from '../Store/Sagas';
import { GenealogyEventSet } from '../Store/Event';
import Page from '../Page';
import Persona from '../Persona/Persona';

interface PersonaPageProps {
   person: Person;
   allEvents: GenealogyEventSet;
   dispatch: GPDispatch;
}

class PersonaPageConnected extends React.PureComponent<PersonaPageProps> {
   componentWillMount() {
      this.calculateData(this.props);
   }

   componentWillReceiveProps(nextProps: PersonaPageProps) {
      if (nextProps.person.id !== this.props.person.id) {
         this.calculateData(nextProps);
      }
   }

   calculateData(props: PersonaPageProps) {
      props.dispatch(addToHistory({person: props.person}));
      props.dispatch(fetchPersonDetails.request({id: props.person.id}));
   }

   onShowEventDetails = (id: number) => {
      this.props.dispatch(fetchEventDetails.request({id: id}));
   }

   render() {
      const p = this.props.person;
      document.title = p ? personDisplay(p) : 'Persona';
      return (
         <Page
            decujus={this.props.person}
            main={p ?
               <Persona
                  person={p}
                  allEvents={this.props.allEvents}
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
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => {
      const id = Number(ownProps.match.params.id);
      return {
         allEvents: state.events,
         person: state.persons[id] || personPlaceholder(id),
      };
   },
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(PersonaPageConnected);

export default PersonaPage;

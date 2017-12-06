import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { Person } from '../Store/Person';
import { addToHistory } from '../Store/History';
import { AppState, GPDispatch } from '../Store/State';
import { fetchPersonDetails, fetchEventDetails } from '../Store/Sagas';
import { GenealogyEventSet } from '../Store/Event';
import Page from '../Page';
import Persona from '../Persona/Persona';

interface PersonaPageProps {
   id: number;
   person: Person|undefined;
   allEvents: GenealogyEventSet;
   dispatch: GPDispatch;
}

class PersonaPageConnected extends React.PureComponent<PersonaPageProps> {
   componentWillMount() {
      this.calculateData(this.props);
   }

   componentWillReceiveProps(nextProps: PersonaPageProps) {
      if (nextProps.id !== this.props.id) {
         this.calculateData(nextProps);
      }
   }

   calculateData(props: PersonaPageProps) {
      props.dispatch(addToHistory({person: props.person}));
      props.dispatch(fetchPersonDetails.request({id: props.id}));
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
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => ({
      id: Number(ownProps.match.params.id),
      allEvents: state.events,
      person: state.persons[Number(ownProps.match.params.id)] as Person|undefined,
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(PersonaPageConnected);

export default PersonaPage;

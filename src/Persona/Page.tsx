import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { PersonSet, personDisplay } from '../Store/Person';
import { addToHistory } from '../Store/History';
import { AppState, GPDispatch } from '../Store/State';
import { fetchPersonDetails } from '../Store/Sagas';
import Page from '../Page';
import Persona from '../Persona/Persona';

interface PersonaPageProps {
   id: number;
   persons: PersonSet;
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

      const p = nextProps.persons[nextProps.id];
      nextProps.dispatch(addToHistory({person: p}));
   }

   calculateData(props: PersonaPageProps) {
      props.dispatch(fetchPersonDetails.request({id: props.id}));
   }

   render() {
      const p = this.props.persons[this.props.id];
      document.title = p ? personDisplay(p) : 'Persona';
      return (
         <Page
            decujus={p}
            main={p ?
               <Persona
                  person={p}
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
      persons: state.persons,
      id: Number(ownProps.match.params.id),
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(PersonaPageConnected);

export default PersonaPage;

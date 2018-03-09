import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { Person, personDisplay, personPlaceholder } from '../Store/Person';
import { addToHistory } from '../Store/History';
import { FanchartSettings, changeFanchartSettings } from '../Store/Fanchart';
import { fetchPedigree } from '../Store/Sagas';
import { AppState, GPDispatch } from '../Store/State';
import { GenealogyEventSet } from '../Store/Event';
import Page from '../Page';
import FanchartSide from '../Fanchart/Side';
import FanchartLayout from '../Fanchart/Layout';

interface FanchartPageConnectedProps {
   settings: FanchartSettings;
   persons: { [id: number]: Person};
   allEvents: GenealogyEventSet;
   onChange: (diff: Partial<FanchartSettings>) => void;
   dispatch: GPDispatch;
   decujus: Person;
}

class FanchartPageConnected extends React.PureComponent<FanchartPageConnectedProps, {}> {
   componentDidMount() {
      this.calculateData(this.props);
   }

   componentWillReceiveProps(nextProps: FanchartPageConnectedProps) {
      if (this.props.decujus.id !== nextProps.decujus.id ||
          this.props.settings.ancestors !== nextProps.settings.ancestors) {
         this.calculateData(nextProps);
      }
   }

   calculateData(props: FanchartPageConnectedProps) {
      props.dispatch(fetchPedigree.request({
         decujus: props.decujus.id,
         ancestors: props.settings.ancestors,
         descendants: 1,
      }));

      props.dispatch(addToHistory({person: props.decujus}));
   }

   render() {
      const decujus: Person = this.props.decujus;
      if (!this.props.settings.loading && decujus) {
         document.title = 'Fanchart for ' + personDisplay(decujus);
      }

      const main = this.props.settings.loading ? (
            <Loader active={true} size="large">Loading</Loader>
         ) : (
            <FanchartLayout
               settings={this.props.settings}
               persons={this.props.persons}
               allEvents={this.props.allEvents}
               decujus={decujus.id}
            />
         );

      return (
         <Page
            decujus={decujus}
            leftSide={
               <FanchartSide
                  settings={this.props.settings}
                  onChange={this.props.onChange}
               />
            }
            main={main}
         />
      );
   }
}

interface PropsFromRoute {
   decujusId: string;
}
 
const FanchartPage = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => {
      const id = Number(ownProps.match.params.decujusId);
      return {
         settings: state.fanchart,
         persons: state.persons,
         allEvents: state.events,
         decujus: state.persons[id] || personPlaceholder(id),
      };
   },
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<FanchartSettings>) => {
         dispatch(changeFanchartSettings({diff}));
      },
   }),
)(FanchartPageConnected);

export default FanchartPage;

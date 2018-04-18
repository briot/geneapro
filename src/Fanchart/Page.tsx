import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { Person, PersonSet, personDisplay } from '../Store/Person';
import { addToHistory } from '../Store/History';
import { FanchartSettings, changeFanchartSettings } from '../Store/Fanchart';
import { fetchPedigree } from '../Store/Sagas';
import { AppState, GPDispatch } from '../Store/State';
import { GenealogyEventSet } from '../Store/Event';
import Page from '../Page';
import FanchartSide from '../Fanchart/Side';
import FanchartLayout from '../Fanchart/Layout';

interface PropsFromRoute {
   id: string;
}
 
interface FanchartPageConnectedProps extends RouteComponentProps<PropsFromRoute> {
   settings: FanchartSettings;
   persons: PersonSet;
   allEvents: GenealogyEventSet;
   onChange: (diff: Partial<FanchartSettings>) => void;
   dispatch: GPDispatch;
   decujusid: number;
}

class FanchartPageConnected extends React.PureComponent<FanchartPageConnectedProps> {
   componentDidMount() {
      this.calculateData(this.props);
   }

   componentWillReceiveProps(nextProps: FanchartPageConnectedProps) {
      if (this.props.decujusid !== nextProps.decujusid ||
          this.props.settings.ancestors !== nextProps.settings.ancestors ||
          this.props.settings.descendants !== nextProps.settings.descendants
      ) {
         this.calculateData(nextProps);
      }

      const decujus: Person = nextProps.persons[nextProps.decujusid];
      nextProps.dispatch(addToHistory({person: decujus}));
   }

   calculateData(props: FanchartPageConnectedProps) {
      props.dispatch(fetchPedigree.request({
         decujus: props.decujusid,
         ancestors: props.settings.ancestors,
         descendants: props.settings.descendants,
      }));
   }

   render() {
      const decujus: Person = this.props.persons[this.props.decujusid];

      if (decujus) {
         document.title = 'Fanchart for ' + personDisplay(decujus);
      }

      const main = this.props.settings.loading || !decujus ? (
            <Loader active={true} size="large">Loading</Loader>
         ) : (
            <FanchartLayout
               settings={this.props.settings}
               persons={this.props.persons}
               allEvents={this.props.allEvents}
               decujus={this.props.decujusid}
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

const FanchartPage = connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      settings: state.fanchart,
      persons: state.persons,
      allEvents: state.events,
      decujusid: Number(props.match.params.id),
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<FanchartSettings>) => {
         dispatch(changeFanchartSettings({diff}));
      },
   }),
)(FanchartPageConnected);

export default FanchartPage;

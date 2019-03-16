import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import * as GP_JSON from '../Server/JSON';
import { Person, PersonSet, personDisplay } from '../Store/Person';
import { addToHistory } from '../Store/History';
import { FanchartSettings, changeFanchartSettings } from '../Store/Fanchart';
import { fetchPedigree } from '../Store/Sagas';
import { AppState, GPDispatch, themeNameGetter } from '../Store/State';
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

   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}

class FanchartPageConnected extends React.PureComponent<FanchartPageConnectedProps> {
   public componentDidMount() {
      this.calculateData();
   }

   public componentDidUpdate() {
      this.calculateData();

      const decujus: Person = this.props.persons[this.props.decujusid];
      this.props.dispatch(addToHistory({person: decujus}));
   }

   protected calculateData() {
      // will do nothing if we already have data
      fetchPedigree.execute(
         this.props.dispatch,
         {
            decujus: this.props.decujusid,
            ancestors: this.props.settings.ancestors,
            descendants: this.props.settings.descendants,
            theme: this.props.settings.colors,
         });
   }

   public render() {
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
                  themeNameGet={this.props.themeNameGet}
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
      themeNameGet: themeNameGetter(state),
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<FanchartSettings>) => {
         dispatch(changeFanchartSettings({diff}));
      },
   }),
)(FanchartPageConnected);

export default FanchartPage;

import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { Person } from '../Store/Person';
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
   decujus: number;
}

class FanchartPageConnected extends React.PureComponent<FanchartPageConnectedProps, {}> {
   componentDidMount() {
      this.props.dispatch(fetchPedigree.request({
         decujus: this.props.decujus,
         ancestors: this.props.settings.ancestors,
         descendants: 1,
      }));

      this.props.dispatch(
         addToHistory({person: this.props.persons[this.props.decujus]}));
   }

   componentDidUpdate(oldProps: FanchartPageConnectedProps) {
      if (this.props.decujus !== oldProps.decujus ||
          this.props.settings.ancestors !== oldProps.settings.ancestors) {
         this.props.dispatch(fetchPedigree.request({
            decujus: this.props.decujus,
            ancestors: this.props.settings.ancestors,
            descendants: 1,
         }));
      }

      this.props.dispatch(
         addToHistory({person: this.props.persons[this.props.decujus]}));
   }

   render() {
      const decujus = this.props.decujus;

      const p = this.props.persons[decujus];
      if (!this.props.settings.loading && p) {
         document.title = 'Fanchart for ' +
            p.surn.toUpperCase() + ' ' + p.givn + ' (' + p.id + ')';
      }

      const main = this.props.settings.loading ? (
            <Loader active={true} size="large">Loading</Loader>
         ) : (
            <FanchartLayout
               settings={this.props.settings}
               persons={this.props.persons}
               allEvents={this.props.allEvents}
               decujus={decujus}
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
   decujus: string;
}
 
const FanchartPage = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => ({
      settings: state.fanchart,
      persons: state.persons,
      allEvents: state.events,
      decujus: Number(ownProps.match.params.decujus),
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<FanchartSettings>) => {
         dispatch(changeFanchartSettings({diff}));
      },
   }),
)(FanchartPageConnected);

export default FanchartPage;

import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { JSONStats, fetchStatsFromServer } from '../Server/Stats';
import { fetchPersonDetails } from '../Store/Sagas';
import { AppState, GPDispatch } from '../Store/State';
import { StatsSettings, changeStatsSettings } from '../Store/Stats';
import { PersonSet, personDisplay } from '../Store/Person';
import { addToHistory } from '../Store/History';
import StatsGeneration from '../Stats/Generations';
import StatsLifespan from '../Stats/Lifespan';
import StatsSide from '../Stats/Side';
import StatsTree from '../Stats/Tree';
import '../Stats/Stats.css';
import Page from '../Page';

interface PropsFromRoute {
   decujusId: string;
}

interface StatsPageConnectedProps extends RouteComponentProps<PropsFromRoute> {
   persons: PersonSet;
   dispatch: GPDispatch;
   settings: StatsSettings;
   onChange: (diff: Partial<StatsSettings>) => void;
   decujusid: number;
}

interface StatsPageConnectedState {
   data?: JSONStats;
}

class StatsPageConnected extends React.PureComponent<StatsPageConnectedProps,
                                                     StatsPageConnectedState> {

   state: StatsPageConnectedState = {};
   controller: AbortController|undefined;

   componentDidMount() {
      this.calculateProps();
   }

   componentDidUpdate(old: StatsPageConnectedProps) {
      if (this.props.decujusid !== old.decujusid ||
          this.props.settings.max_age !== old.settings.max_age ||
          this.props.settings.bar_width !== old.settings.bar_width
      ) {
         this.calculateProps();
      }

      const p = this.props.persons[this.props.decujusid];
      this.props.dispatch(addToHistory({person: p}));

      // Make sure we have the name of the person
      if (!p) {
         fetchPersonDetails.execute(
            this.props.dispatch, {id: this.props.decujusid});
      }
   }

   render() {
      const decujus = this.props.persons[this.props.decujusid];
      if (decujus) {
         document.title = 'Stats for ' + personDisplay(decujus);
      }

      const main = !this.state.data ? (
         <Loader active={true} size="large">Loading</Loader>
      ) : (
         <div>
            {this.props.settings.show_treestats &&
            <StatsTree
               decujus={this.props.decujusid}
               totalInDatabase={this.state.data.total_persons}
               totalInTree={this.state.data.total_ancestors}
               fatherAncestors={this.state.data.total_father}
               motherAncestors={this.state.data.total_mother}
            />
            }

            {this.props.settings.show_generations &&
            <StatsGeneration
               ranges={this.state.data.ranges}
               decujus={this.props.persons[this.props.decujusid]}
            />
            }

            {this.props.settings.show_lifespan &&
            <StatsLifespan
               ages={this.state.data.ages}
               settings={this.props.settings}
               decujus={this.props.persons[this.props.decujusid]}
            />
            }

         </div>
         );

      return (
         <Page
            decujus={decujus}
            main={main}
            leftSide={
               <StatsSide
                  settings={this.props.settings}
                  onChange={this.props.onChange}
               />
            }
         />
      );
   }

   private calculateProps() {
      if (this.controller) {
         this.controller.abort();
      }
      this.controller = new AbortController();
      fetchStatsFromServer(
         this.props.decujusid,
         this.props.settings,
         this.controller.signal,
      ).then(
         (s: JSONStats) => {
            this.setState({data: s});
      });
   }
}

const StatsPage = connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      settings: state.stats,
      persons: state.persons,
      decujusid: Number(props.match.params.decujusId),
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<StatsSettings>) => {
         dispatch(changeStatsSettings({diff}));
      },
   }),
)(StatsPageConnected);

export default StatsPage;

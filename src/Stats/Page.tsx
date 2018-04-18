import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { JSONStats, fetchStatsFromServer } from '../Server/Stats';
import { AppState, GPDispatch } from '../Store/State';
import { PersonSet, personDisplay } from '../Store/Person';
import { addToHistory } from '../Store/History';
import StatsGeneration from '../Stats/Generations';
import StatsLifespan from '../Stats/Lifespan';
import StatsTree from '../Stats/Tree';
import '../Stats/Stats.css';
import Page from '../Page';

interface PropsFromRoute {
   decujusId: string;
}
 
interface StatsPageConnectedProps extends RouteComponentProps<PropsFromRoute> {
   persons: PersonSet;
   dispatch: GPDispatch;
   decujusid: number;
}

interface StatsPageConnectedState {
   data?: JSONStats;
}

class StatsPageConnected extends React.PureComponent<StatsPageConnectedProps,
                                                     StatsPageConnectedState> {
   constructor(props: StatsPageConnectedProps) {
      super(props);
      this.state = {};
   }

   componentWillMount() {
      this.calculateProps(this.props);
   }

   componentWillReceiveProps(nextProps: StatsPageConnectedProps) {
      if (this.props.decujusid !== nextProps.decujusid) {
         this.calculateProps(nextProps);
      }

      const p = nextProps.persons[nextProps.decujusid];
      nextProps.dispatch(addToHistory({person: p}));
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
            <StatsTree
               decujus={this.props.decujusid}
               totalInDatabase={this.state.data.total_persons}
               totalInTree={this.state.data.total_ancestors}
               fatherAncestors={this.state.data.total_father}
               motherAncestors={this.state.data.total_mother}
            />

            <StatsGeneration
               ranges={this.state.data.ranges}
            />

            <StatsLifespan
               ages={this.state.data.ages}
            />

         </div>
         );

      return (
         <Page
            decujus={decujus}
            main={main}
         />
      );
   }

   private calculateProps(props: StatsPageConnectedProps) {
      fetchStatsFromServer(props.decujusid).then((s: JSONStats) => {
         this.setState({data: s});
      });
   }
}

const StatsPage = connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      persons: state.persons,
      decujusid: Number(props.match.params.decujusId),
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(StatsPageConnected);

export default StatsPage;

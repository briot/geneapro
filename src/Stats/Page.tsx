import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { JSONStats, fetchStatsFromServer } from '../Server/Stats';
import { AppState } from '../Store/State';
import StatsGeneration from '../Stats/Generations';
import StatsLifespan from '../Stats/Lifespan';
import StatsTree from '../Stats/Tree';
import '../Stats/Stats.css';
import Page from '../Page';

interface StatsPageConnectedProps {
   decujus: number;
}

interface StatsPageConnectedState {
   data?: JSONStats;
}

class StatsPageConnected extends React.PureComponent<StatsPageConnectedProps,
                                                     StatsPageConnectedState> {
   constructor(props: StatsPageConnectedProps) {
      super(props);
      this.state = {data: undefined};
   }

   componentWillMount() {
      this.calculateProps(this.props);
   }

   componentWillReceiveProps(nextProps: StatsPageConnectedProps) {
      if (this.props.decujus !== nextProps.decujus) {
         this.calculateProps(nextProps);
      }
   }

   render() {
      const decujus = this.props.decujus;

      if (this.state.data) {
         document.title = 'Stats for ' +
            this.state.data.decujus_name +
            ' (' + this.props.decujus + ')';
      }

      const main = !this.state.data ? (
         <Loader active={true} size="large">Loading</Loader>
      ) : (
         <div>
            <StatsTree
               decujus={this.state.data.decujus}
               decujusName={this.state.data.decujus_name}
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
      fetchStatsFromServer(props.decujus).then((s: JSONStats) => {
         this.setState({data: s});
      });
   }
}

interface PropsFromRoute {
   decujus: string;
}
 
const StatsPage = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => ({
      decujus: Number(ownProps.match.params.decujus),
   })
)(StatsPageConnected);

export default StatsPage;

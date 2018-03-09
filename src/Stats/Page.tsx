import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { JSONStats, fetchStatsFromServer } from '../Server/Stats';
import { AppState } from '../Store/State';
import { Person, personDisplay, personPlaceholder } from '../Store/Person';
import StatsGeneration from '../Stats/Generations';
import StatsLifespan from '../Stats/Lifespan';
import StatsTree from '../Stats/Tree';
import '../Stats/Stats.css';
import Page from '../Page';

interface StatsPageConnectedProps {
   decujus: Person;
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
         document.title = 'Stats for ' + personDisplay(decujus);
      }

      const main = !this.state.data ? (
         <Loader active={true} size="large">Loading</Loader>
      ) : (
         <div>
            <StatsTree
               decujus={this.props.decujus.id}
               decujusName={personDisplay(this.props.decujus)}
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
      fetchStatsFromServer(props.decujus.id).then((s: JSONStats) => {
         this.setState({data: s});
      });
   }
}

interface PropsFromRoute {
   decujusId: string;
}
 
const StatsPage = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => {
      const id = Number(ownProps.match.params.decujusId);
      return {decujus: state.persons[id] || personPlaceholder(id)};
   }
)(StatsPageConnected);

export default StatsPage;

import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { PersonSet, personDisplay } from '../Store/Person';
import { addToHistory } from '../Store/History';
import { RadialSettings, changeRadialSettings } from '../Store/Radial';
import { fetchPedigree } from '../Store/Sagas';
import { AppState, GPDispatch } from '../Store/State';
import RadialSide from '../Radial/Side';
import Radial from '../Radial/Radial';
import Page from '../Page';

interface PropsFromRoute {
   decujusId: string;
}

interface RadialPageConnectedProps extends RouteComponentProps<PropsFromRoute> {
   settings: RadialSettings;
   persons: PersonSet;
   onChange: (diff: Partial<RadialSettings>) => void;
   dispatch: GPDispatch;
   decujusid: number;
}

class RadialPageConnected extends React.PureComponent<RadialPageConnectedProps, {}> {
   componentDidMount() {
      this.calculateData();
   }

   componentDidUpdate(old: RadialPageConnectedProps) {
      if (this.props.decujusid !== old.decujusid ||
          this.props.settings.generations !== old.settings.generations) {
         this.calculateData();
      }

      const p = this.props.persons[this.props.decujusid];
      this.props.dispatch(addToHistory({person: p}));
   }

   calculateData() {
      this.props.dispatch(fetchPedigree.request({
         decujus: this.props.decujusid,
         ancestors: Math.max(0, this.props.settings.generations),
         descendants: Math.abs(Math.min(0, this.props.settings.generations)),
      }));
   }

   render() {
      const decujus = this.props.persons[this.props.decujusid];
      if (decujus) {
         document.title = 'Radial for ' + personDisplay(decujus);
      }

      const main = this.props.settings.loading ? (
            <Loader active={true} size="large">Loading</Loader>
         ) : (
            <Radial
               settings={this.props.settings}
               persons={this.props.persons}
               decujus={this.props.decujusid}
            />
         );

      return (
         <Page
            decujus={decujus}
            leftSide={
               <RadialSide
                  settings={this.props.settings}
                  onChange={this.props.onChange}
               />
            }
            main={main}
         />
      );
   }
}

const RadialPage = connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      settings: state.radial,
      persons: state.persons,
      decujusid: Number(props.match.params.decujusId),
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<RadialSettings>) => {
         dispatch(changeRadialSettings({diff}));
      },
   }),
)(RadialPageConnected);

export default RadialPage;

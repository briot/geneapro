import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { Person } from '../Store/Person';
import { addToHistory } from '../Store/History';
import { RadialSettings, changeRadialSettings } from '../Store/Radial';
import { fetchPedigree } from '../Store/Sagas';
import { AppState, GPDispatch } from '../Store/State';
import RadialSide from '../Radial/Side';
import Radial from '../Radial/Radial';
import Page from '../Page';

interface RadialPageConnectedProps {
   settings: RadialSettings;
   persons: { [id: number]: Person};
   onChange: (diff: Partial<RadialSettings>) => void;
   dispatch: GPDispatch;
   decujus: number;
}

class RadialPageConnected extends React.PureComponent<RadialPageConnectedProps, {}> {
   componentDidMount() {
      this.calculateData(this.props);
   }

   componentWillReceiveProps(nextProps: RadialPageConnectedProps) {
      if (this.props.decujus !== nextProps.decujus ||
          this.props.settings.generations !== nextProps.settings.generations) {
         this.calculateData(nextProps);
      }
   }

   calculateData(props: RadialPageConnectedProps) {
      props.dispatch(fetchPedigree.request({
         decujus: props.decujus,
         ancestors: Math.max(0, props.settings.generations),
         descendants: Math.abs(Math.min(0, props.settings.generations)),
      }));

      props.dispatch(addToHistory({person: props.persons[props.decujus]}));
   }

   render() {
      const decujus = this.props.decujus;

      const p = this.props.persons[decujus];
      if (!this.props.settings.loading && p) {
         document.title = 'Radial for ' +
            p.surn.toUpperCase() + ' ' + p.givn + ' (' + p.id + ')';
      }

      const main = this.props.settings.loading ? (
            <Loader active={true} size="large">Loading</Loader>
         ) : (
            <Radial
               settings={this.props.settings}
               persons={this.props.persons}
               decujus={decujus}
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

interface PropsFromRoute {
   decujus: string;
}
 
const RadialPage = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => ({
      settings: state.radial,
      persons: state.persons,
      decujus: Number(ownProps.match.params.decujus),
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<RadialSettings>) => {
         dispatch(changeRadialSettings({diff}));
      },
   }),
)(RadialPageConnected);

export default RadialPage;

import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { Person, personDisplay, personPlaceholder } from '../Store/Person';
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
   decujus: Person;
}

class RadialPageConnected extends React.PureComponent<RadialPageConnectedProps, {}> {
   componentDidMount() {
      this.calculateData(this.props);
   }

   componentWillReceiveProps(nextProps: RadialPageConnectedProps) {
      if (this.props.decujus.id !== nextProps.decujus.id ||
          this.props.settings.generations !== nextProps.settings.generations) {
         this.calculateData(nextProps);
      }
   }

   calculateData(props: RadialPageConnectedProps) {
      props.dispatch(fetchPedigree.request({
         decujus: props.decujus.id,
         ancestors: Math.max(0, props.settings.generations),
         descendants: Math.abs(Math.min(0, props.settings.generations)),
      }));

      props.dispatch(addToHistory({person: props.decujus}));
   }

   render() {
      const decujus = this.props.decujus;
      if (!this.props.settings.loading && decujus) {
         document.title = 'Radial for ' + personDisplay(decujus);
      }

      const main = this.props.settings.loading ? (
            <Loader active={true} size="large">Loading</Loader>
         ) : (
            <Radial
               settings={this.props.settings}
               persons={this.props.persons}
               decujus={decujus.id}
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
   decujusId: string;
}
 
const RadialPage = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => {
      const id = Number(ownProps.match.params.decujusId);
      return {
         settings: state.radial,
         persons: state.persons,
         decujus: state.persons[id] || personPlaceholder(id),
      };
   },
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<RadialSettings>) => {
         dispatch(changeRadialSettings({diff}));
      },
   }),
)(RadialPageConnected);

export default RadialPage;

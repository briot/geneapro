import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { PersonSet } from '../Store/Person';
import { GenealogyEventSet } from '../Store/Event';
import { PlaceSet } from '../Store/Place';
import { addToHistory } from '../Store/History';
import { PedigreeSettings, changePedigreeSettings } from '../Store/Pedigree';
import { fetchPedigree } from '../Store/Sagas';
import { AppState, GPDispatch } from '../Store/State';
import Page from '../Page';
import PedigreeLayout from '../Pedigree/Layout';
import PedigreeSide from '../Pedigree/Side';

interface PedigreePageConnectedProps {
   settings: PedigreeSettings;
   persons: PersonSet;
   allEvents: GenealogyEventSet;
   allPlaces: PlaceSet;
   onChange: (diff: Partial<PedigreeSettings>) => void;
   dispatch: GPDispatch;
   decujus: number;
}

class PedigreePageConnected extends React.PureComponent<PedigreePageConnectedProps, {}> {
   componentWillMount() {
      this.calculateData(this.props);
   }

   componentWillReceiveProps(nextProps: PedigreePageConnectedProps) {
      if (this.props.decujus !== nextProps.decujus ||
          this.props.settings.ancestors !== nextProps.settings.ancestors ||
          this.props.settings.descendants !== nextProps.settings.descendants
      ) {
         this.calculateData(nextProps);
      }
   }

   calculateData(props: PedigreePageConnectedProps) {
      props.dispatch(fetchPedigree.request({
         decujus: props.decujus,
         ancestors: props.settings.ancestors,
         descendants: props.settings.descendants,
      }));

      props.dispatch(addToHistory({person: props.persons[props.decujus]}));
   }

   render() {
      const decujus = this.props.decujus;
      const p = this.props.persons[decujus];
      if (p) {
         document.title = 'Pedigree for ' +
            p.surn.toUpperCase() + ' ' + p.givn + ' (' + p.id + ')';
      }

      // ??? Initially, we have no data and yet loading=false
      // We added special code in Pedigree/Data.tsx to test whether the layout
      // is known, but that's not elegant.
      const main = this.props.settings.loading ? (
            <Loader active={true} size="large">Loading</Loader>
         ) : (
            <PedigreeLayout
               settings={this.props.settings}
               persons={this.props.persons}
               allEvents={this.props.allEvents}
               allPlaces={this.props.allPlaces}
               decujus={decujus}
            />
         );

      return (
         <Page
            decujus={decujus}
            leftSide={
               <PedigreeSide
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
 
const PedigreePage = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => ({
      settings: state.pedigree,
      persons: state.persons,
      allEvents: state.events,
      allPlaces: state.places,
      decujus: Number(ownProps.match.params.decujus),
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<PedigreeSettings>) => {
         dispatch(changePedigreeSettings({diff}));
      },
   }),
)(PedigreePageConnected);

export default PedigreePage;

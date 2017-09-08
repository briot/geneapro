import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { PersonSet, addToHistory } from '../Store/Person';
import { PedigreeSettings, changePedigreeSettings } from '../Store/Pedigree';
import { fetchPedigree } from '../Store/Sagas';
import { AppState, GPDispatch } from '../Store/State';
import Page from '../Page';
import PedigreeLayout from '../Pedigree/Layout';
import PedigreeSide from '../Pedigree/Side';

interface PedigreePageConnectedProps {
   settings: PedigreeSettings;
   persons: PersonSet;
   onChange: (diff: Partial<PedigreeSettings>) => void;
   dispatch: GPDispatch;
   decujus: number;
}

class PedigreePageConnected extends React.PureComponent<PedigreePageConnectedProps, {}> {
   componentWillMount() {
      // ??? This sets 'loading=true' in the state, but this.props do not
      // reflect that yet...
      this.props.dispatch(fetchPedigree.request({
         decujus: this.props.decujus,
         ancestors: this.props.settings.ancestors,
         descendants: this.props.settings.descendants,
      }));

      this.props.dispatch(addToHistory({
         person: this.props.persons[this.props.decujus],
      }));
   }

   componentDidUpdate(oldProps: PedigreePageConnectedProps) {
      if (this.props.decujus !== oldProps.decujus ||
          this.props.settings.ancestors !== oldProps.settings.ancestors ||
          this.props.settings.descendants !== oldProps.settings.descendants) {

         this.props.dispatch(fetchPedigree.request({
            decujus: this.props.decujus,
            ancestors: this.props.settings.ancestors,
            descendants: this.props.settings.descendants,
         }));
      }

      this.props.dispatch(addToHistory({
         person: this.props.persons[this.props.decujus],
      }));
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

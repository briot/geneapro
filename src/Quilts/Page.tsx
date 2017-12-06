import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { PersonSet } from '../Store/Person';
import { QuiltsSettings, changeQuiltsSettings } from '../Store/Quilts';
import { fetchQuilts } from '../Store/Sagas';
import { AppState, GPDispatch } from '../Store/State';
import { QuiltsResult } from '../Server/Quilts';
import Page from '../Page';
import Quilts from '../Quilts/Quilts';
import QuiltsSide from '../Quilts/Side';

interface QuiltsPageConnectedProps {
   settings: QuiltsSettings;
   allPersons: PersonSet;
   onChange: (diff: Partial<QuiltsSettings>) => void;
   layout: QuiltsResult|undefined;
   dispatch: GPDispatch;
   decujus: number;
}

class QuiltsPageConnected extends React.PureComponent<QuiltsPageConnectedProps, {}> {
   componentWillMount() {
      // ??? This sets 'loading=true' in the state, but this.props do not
      // reflect that yet...
      this.calculateProps(this.props);
   }

   componentWillReceiveProps(nextProps: QuiltsPageConnectedProps) {
      if (this.props.decujus !== nextProps.decujus ||
          this.props.settings.decujusTreeOnly !== nextProps.settings.decujusTreeOnly
      ) {
         this.calculateProps(nextProps);
      }
   }

   render() {
      const decujus = this.props.decujus;
      const p = this.props.allPersons[decujus];
      if (p) {
         document.title = 'Quilts for ' +
            p.surn.toUpperCase() + ' ' + p.givn + ' (' + p.id + ')';
      }

      // ??? Initially, we have no data and yet loading=false
      // We added special code in Quilts/Data.tsx to test whether the layout
      // is known, but that's not elegant.
      const main = this.props.settings.loading ? (
            <Loader active={true} size="large">Loading</Loader>
         ) : (
            <Quilts
               settings={this.props.settings}
               layout={this.props.layout}
               decujus={decujus}
            />
         );

      return (
         <Page
            decujus={decujus}
            leftSide={
               <QuiltsSide
                  settings={this.props.settings}
                  onChange={this.props.onChange}
               />
            }
            main={main}
         />
      );
   }

   private calculateProps(props: QuiltsPageConnectedProps) {
      props.dispatch(fetchQuilts.request({
         decujus: props.decujus,
         decujusOnly: props.settings.decujusTreeOnly,
      }));
   }

}

interface PropsFromRoute {
   decujus: string;
}
 
const QuiltsPage = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => ({
      settings: state.quilts,
      layout: state.quiltsLayout ? state.quiltsLayout.layout : undefined,
      allPersons: state.persons,
      decujus: Number(ownProps.match.params.decujus),
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<QuiltsSettings>) => {
         dispatch(changeQuiltsSettings({diff}));
      },
   }),
)(QuiltsPageConnected);

export default QuiltsPage;

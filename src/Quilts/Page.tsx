import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import { PersonSet, personDisplay } from '../Store/Person';
import { QuiltsSettings, changeQuiltsSettings } from '../Store/Quilts';
import { fetchQuilts } from '../Store/Sagas';
import { AppState, GPDispatch } from '../Store/State';
import { QuiltsResult } from '../Server/Quilts';
import { addToHistory } from '../Store/History';
import Page from '../Page';
import Quilts from '../Quilts/Quilts';
import QuiltsSide from '../Quilts/Side';

interface PropsFromRoute {
   decujusId: string;
}

interface QuiltsPageConnectedProps extends RouteComponentProps<PropsFromRoute> {
   settings: QuiltsSettings;
   allPersons: PersonSet;
   onChange: (diff: Partial<QuiltsSettings>) => void;
   layout: QuiltsResult|undefined;
   dispatch: GPDispatch;
   decujusid: number;
}

class QuiltsPageConnected extends React.PureComponent<QuiltsPageConnectedProps, {}> {
   public componentDidMount() {
      this.calculateProps();
   }

   public componentDidUpdate(old: QuiltsPageConnectedProps) {
      if (this.props.decujusid !== old.decujusid ||
          this.props.settings.decujusTreeOnly !== old.settings.decujusTreeOnly
      ) {
         this.calculateProps();
      }

      const p = this.props.allPersons[this.props.decujusid];
      this.props.dispatch(addToHistory({person: p}));
   }

   public render() {
      const decujus = this.props.allPersons[this.props.decujusid];
      if (decujus) {
         document.title = 'Quilts for ' + personDisplay(decujus);
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
               decujus={this.props.decujusid}
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

   private calculateProps() {
      fetchQuilts.execute(
         this.props.dispatch,
         {
            decujus: this.props.decujusid,
            decujusOnly: this.props.settings.decujusTreeOnly,
         });
   }

}

const QuiltsPage = connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      settings: state.quilts,
      layout: state.quiltsLayout ? state.quiltsLayout.layout : undefined,
      allPersons: state.persons,
      decujusid: Number(props.match.params.decujusId),
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<QuiltsSettings>) => {
         dispatch(changeQuiltsSettings({diff}));
      },
   }),
)(QuiltsPageConnected);

export default QuiltsPage;

import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Loader } from 'semantic-ui-react';
import * as GP_JSON from '../Server/JSON';
import { PersonSet, personDisplay } from '../Store/Person';
import { addToHistory } from '../Store/History';
import { RadialSettings, changeRadialSettings } from '../Store/Radial';
import { fetchPedigree } from '../Store/Sagas';
import { AppState, GPDispatch, themeNameGetter } from '../Store/State';
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
   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}

const RadialPageConnected = (p: RadialPageConnectedProps) => {
   const decujus = p.persons[p.decujusid];

   React.useEffect(
      () => {
         fetchPedigree.execute(
            p.dispatch,
            {
               decujus: p.decujusid,
               ancestors: Math.max(0, p.settings.generations),
               descendants: Math.abs(Math.min(0, p.settings.generations)),
               theme: p.settings.colors,
            });
      },
      [p.decujusid, p.settings.generations, p.settings.colors, p.dispatch]);

   React.useEffect(
      () => {
         if (decujus) {
            p.dispatch(addToHistory({person: decujus}));
            document.title = 'Radial for ' + personDisplay(decujus);
         }
      },
      [decujus, p]);

   const main = p.settings.loading ? (
         <Loader active={true} size="large">Loading</Loader>
      ) : (
         <Radial
            settings={p.settings}
            persons={p.persons}
            decujus={p.decujusid}
         />
      );

   return (
      <Page
         decujus={decujus}
         leftSide={
            <RadialSide
               settings={p.settings}
               onChange={p.onChange}
               themeNameGet={p.themeNameGet}
            />
         }
         main={main}
      />
   );
}

const RadialPage = connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      settings: state.radial,
      persons: state.persons,
      decujusid: Number(props.match.params.decujusId),
      themeNameGet: themeNameGetter(state),
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<RadialSettings>) => {
         dispatch(changeRadialSettings({diff}));
      },
   }),
)(RadialPageConnected);

export default RadialPage;

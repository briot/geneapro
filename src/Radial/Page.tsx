import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import { Loader } from "semantic-ui-react";
import * as GP_JSON from "../Server/JSON";
import { PersonSet, personDisplay } from "../Store/Person";
import { addToHistory, HistoryKind } from "../Store/History";
import { RadialSettings, changeRadialSettings } from "../Store/Radial";
import { fetchPedigree } from "../Store/Sagas";
import { AppState, GPDispatch, themeNameGetter } from "../Store/State";
import RadialSide from "../Radial/Side";
import Radial from "../Radial/Radial";
import Page from "../Page";

interface PropsFromRoute {
   decujusId: string;
}

interface RadialPageConnectedProps extends RouteComponentProps<PropsFromRoute> {
   settings: RadialSettings;
   persons: PersonSet;
   dispatch: GPDispatch;
   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}

const RadialPageConnected = (p: RadialPageConnectedProps) => {
   const decujusid = Number(p.match.params.decujusId);
   const decujus = p.persons[decujusid];

   React.useEffect(
      () =>
         fetchPedigree.execute(p.dispatch, {
            decujus: decujusid,
            ancestors: Math.max(0, p.settings.generations),
            descendants: Math.abs(Math.min(0, p.settings.generations)),
            theme: p.settings.colors
         }),
      [decujusid, p.settings.generations, p.settings.colors, p.dispatch]
   );

   React.useEffect(() => {
      document.title = "Radial for " + personDisplay(decujus);
      p.dispatch(addToHistory({
         kind: HistoryKind.PERSON, id: decujusid }));
   }, [decujus, decujusid, p.dispatch]);

   const onChange = React.useCallback(
      (diff: Partial<RadialSettings>) =>
         p.dispatch(changeRadialSettings({ diff })),
      [p.dispatch]
   );

   const main = p.settings.loading ? (
      <Loader active={true} size="large">
         Loading
      </Loader>
   ) : (
      <Radial settings={p.settings} persons={p.persons} decujus={decujusid} />
   );

   return (
      <Page
         decujusid={decujusid}
         leftSide={
            <RadialSide
               settings={p.settings}
               onChange={onChange}
               themeNameGet={p.themeNameGet}
            />
         }
         main={main}
      />
   );
};

const RadialPage = connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      settings: state.radial,
      persons: state.persons,
      themeNameGet: themeNameGetter(state)
   }),
   (dispatch: GPDispatch) => ({
      dispatch
   })
)(RadialPageConnected);

export default RadialPage;

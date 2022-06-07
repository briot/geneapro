import * as React from "react";
import { connect, useDispatch } from "react-redux";
import { RouteComponentProps } from "react-router";
import { Loader } from "semantic-ui-react";
import * as GP_JSON from "../Server/JSON";
import { PersonSet, personDisplay } from "../Store/Person";
import { addToHistory, HistoryKind } from "../Store/History";
import { RadialSettings, changeRadialSettings } from "../Store/Radial";
import { fetchPedigree } from "../Store/Sagas";
import { AppState, themeNameGetter } from "../Store/State";
import { DropTarget } from "../Draggable";
import { URL } from "../Links";
import RadialSide from "../Radial/Side";
import Radial from "../Radial/Radial";
import Page from "../Page";

interface PropsFromRoute {
   id: string;
}

interface RadialPageConnectedProps extends RouteComponentProps<PropsFromRoute> {
   settings: RadialSettings;
   persons: PersonSet;
   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}

const RadialPage: React.FC<RadialPageConnectedProps> = (p) => {
   const decujusid = Number(p.match.params.id);
   const decujus = p.persons[decujusid];
   const dispatch = useDispatch();

   React.useEffect(
      () =>
         fetchPedigree.execute(
            dispatch,
            {
               ancestors: Math.max(0, p.settings.generations),
               decujus: decujusid,
               descendants: Math.abs(Math.min(0, p.settings.generations)),
               theme: p.settings.colors,
            }
         ),
      [decujusid, p.settings.generations, p.settings.colors, dispatch]
   );

   React.useEffect(
      () => {
         document.title = "Radial for " + personDisplay(decujus);
         dispatch(addToHistory({ kind: HistoryKind.PERSON, id: decujusid }));
      },
      [decujus, decujusid, dispatch]
   );

   const onChange = React.useCallback(
      (diff: Partial<RadialSettings>) =>
         dispatch(changeRadialSettings({ diff })),
      [dispatch]
   );

   const main = p.settings.loading ? (
      <Loader active={true} size="large">
         Loading
      </Loader>
   ) : (
      <DropTarget redirectUrl={URL.radial}>
         <Radial settings={p.settings} persons={p.persons} decujus={decujusid} />
      </DropTarget>
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

export default connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      settings: state.radial,
      persons: state.persons,
      themeNameGet: themeNameGetter(state)
   }),
)(RadialPage);

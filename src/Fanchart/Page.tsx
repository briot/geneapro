import * as React from "react";
import { connect, useDispatch } from "react-redux";
import { RouteComponentProps } from "react-router";
import { Loader } from "semantic-ui-react";
import * as GP_JSON from "../Server/JSON";
import { Person, PersonSet, personDisplay } from "../Store/Person";
import { addToHistory, HistoryKind } from "../Store/History";
import { FanchartSettings, changeFanchartSettings } from "../Store/Fanchart";
import { fetchPedigree } from "../Store/Sagas";
import { AppState, themeNameGetter } from "../Store/State";
import { GenealogyEventSet } from "../Store/Event";
import { DropTarget } from "../Draggable";
import { URL } from "../Links";
import Page from "../Page";
import FanchartSide from "../Fanchart/Side";
import FanchartLayout from "../Fanchart/Layout";

interface PropsFromRoute {
   id: string;
}

interface FanchartPageConnectedProps
   extends RouteComponentProps<PropsFromRoute> {
   settings: FanchartSettings;
   persons: PersonSet;
   allEvents: GenealogyEventSet;
   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}

const FanchartPageConnected: React.FC<FanchartPageConnectedProps> = p => {
   const decujusid = Number(p.match.params.id);
   const dispatch = useDispatch();
   const decujus: Person = p.persons[decujusid];

   React.useEffect(
      () =>
         fetchPedigree.execute(
            dispatch,
            {
               ancestors: p.settings.ancestors,
               decujus: decujusid,
               descendants: p.settings.descendants,
               theme: p.settings.colors,
            }
         ),
      [
         decujusid,
         dispatch,
         p.settings.ancestors,
         p.settings.descendants,
         p.settings.colors
      ]
   );

   React.useEffect(() => {
      document.title = "Fanchart for " + personDisplay(decujus);
      dispatch(addToHistory({kind: HistoryKind.PERSON, id: decujusid }));
   }, [decujus, decujusid, dispatch]);

   const main =
      p.settings.loading || !decujus ? (
         <Loader active={true} size="large">
            Loading
         </Loader>
      ) : (
         <DropTarget redirectUrl={URL.fanchart}>
            <FanchartLayout
               settings={p.settings}
               persons={p.persons}
               allEvents={p.allEvents}
               decujus={decujusid}
            />
         </DropTarget>
      );

   const onChange = React.useCallback(
      (diff: Partial<FanchartSettings>) =>
         dispatch(changeFanchartSettings({ diff })),
      [dispatch]
   );

   return (
      <Page
         decujusid={decujusid}
         leftSide={
            <FanchartSide
               settings={p.settings}
               onChange={onChange}
               themeNameGet={p.themeNameGet}
            />
         }
         main={main}
      />
   );
};

const FanchartPage = connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      settings: state.fanchart,
      persons: state.persons,
      allEvents: state.events,
      themeNameGet: themeNameGetter(state)
   }),
)(FanchartPageConnected);

export default FanchartPage;

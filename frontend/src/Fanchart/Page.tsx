import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router";
import { Loader } from "semantic-ui-react";
import { Person, personDisplay } from "../Store/Person";
import { addToHistory, HistoryKind } from "../Store/History";
import { FanchartSettings, changeFanchartSettings } from "../Store/Fanchart";
import { fetchPedigree } from "../Store/Sagas";
import { AppState, themeNameGetter } from "../Store/State";
import { DropTarget } from "../Draggable";
import { URL } from "../Links";
import Page from "../Page";
import FanchartSide from "../Fanchart/Side";
import FanchartLayout from "../Fanchart/Layout";

type FanchartPageParams = {
   id: string;
}

const FanchartPage: React.FC<unknown> = () => {
   const params = useParams<FanchartPageParams>();
   const decujusid = Number(params.id);
   const dispatch = useDispatch();
   const settings = useSelector((s: AppState) => s.fanchart);
   const persons = useSelector((s: AppState) => s.persons);
   const allEvents = useSelector((s: AppState) => s.events);
   const themeNameGet = useSelector((s: AppState) => themeNameGetter(s));
   const decujus: Person = persons[decujusid];

   React.useEffect(
      () =>
         fetchPedigree.execute(
            dispatch,
            {
               ancestors: settings.ancestors,
               decujus: decujusid,
               descendants: settings.descendants,
               theme: settings.colors,
            }
         ),
      [
         decujusid,
         dispatch,
         settings.ancestors,
         settings.descendants,
         settings.colors
      ]
   );

   React.useEffect(() => {
      document.title = "Fanchart for " + personDisplay(decujus);
      dispatch(addToHistory({kind: HistoryKind.PERSON, id: decujusid }));
   }, [decujus, decujusid, dispatch]);

   const main =
      settings.loading || !decujus ? (
         <Loader active={true} size="large">
            Loading
         </Loader>
      ) : (
         <DropTarget redirectUrl={URL.fanchart}>
            <FanchartLayout
               settings={settings}
               persons={persons}
               allEvents={allEvents}
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
               settings={settings}
               onChange={onChange}
               themeNameGet={themeNameGet}
            />
         }
         main={main}
      />
   );
};

export default FanchartPage;

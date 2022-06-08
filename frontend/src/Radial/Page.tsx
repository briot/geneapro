import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router";
import { Loader } from "semantic-ui-react";
import { personDisplay } from "../Store/Person";
import { addToHistory, HistoryKind } from "../Store/History";
import { RadialSettings, changeRadialSettings } from "../Store/Radial";
import { fetchPedigree } from "../Store/Sagas";
import { AppState, themeNameGetter } from "../Store/State";
import { DropTarget } from "../Draggable";
import { URL } from "../Links";
import RadialSide from "../Radial/Side";
import Radial from "../Radial/Radial";
import Page from "../Page";

type RadialPageParams = {
   id: string;
}

const RadialPage: React.FC<unknown> = () => {
   const params = useParams<RadialPageParams>();
   const decujusid = Number(params.id);
   const dispatch = useDispatch();
   const settings = useSelector((s: AppState) => s.radial);
   const persons = useSelector((s: AppState) => s.persons);
   const themeNameGet = useSelector((s: AppState) => themeNameGetter(s));

   const decujus = persons[decujusid];

   React.useEffect(
      () =>
         fetchPedigree.execute(
            dispatch,
            {
               ancestors: Math.max(0, settings.generations),
               decujus: decujusid,
               descendants: Math.abs(Math.min(0, settings.generations)),
               theme: settings.colors,
            }
         ),
      [decujusid, settings.generations, settings.colors, dispatch]
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

   const main = settings.loading ? (
      <Loader active={true} size="large">
         Loading
      </Loader>
   ) : (
      <DropTarget redirectUrl={URL.radial}>
         <Radial settings={settings} persons={persons} decujus={decujusid} />
      </DropTarget>
   );

   return (
      <Page
         decujusid={decujusid}
         leftSide={
            <RadialSide
               settings={settings}
               onChange={onChange}
               themeNameGet={themeNameGet}
            />
         }
         main={main}
      />
   );
};

export default RadialPage;

import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { Loader } from "semantic-ui-react";
import { personDisplay } from "../Store/Person";
import { addToHistory, HistoryKind } from "../Store/History";
import { PedigreeSettings, changePedigreeSettings } from "../Store/Pedigree";
import { fetchPedigree } from "../Store/Sagas";
import { AppState, themeNameGetter } from "../Store/State";
import { DropTarget } from "../Draggable";
import { URL } from "../Links";
import Page from "../Page";
import PedigreeLayout from "../Pedigree/Layout";
import PedigreeSide from "../Pedigree/Side";

type PedigreePageParams = {
   id?: string;
}

const PedigreePage: React.FC<unknown> = () => {
   const params = useParams<PedigreePageParams>();
   const decujusid = Number(params.id);
   const dispatch = useDispatch();
   const settings = useSelector((s: AppState) => s.pedigree);
   const persons = useSelector((s: AppState) => s.persons);
   const allEvents = useSelector((s: AppState) => s.events);
   const allPlaces = useSelector((s: AppState) => s.places);
   const themeNameGet = useSelector((s: AppState) => themeNameGetter(s));
   const decujus = persons[decujusid];

   // Fetch data from server when some properties change
   // Always run this, though it will do nothing if we already have the data
   React.useEffect(
      () =>
         fetchPedigree.execute(
            //  ??? We only need to reload when colors change if we are using
            //  custom colors
            //  ??? Should avoid fetching known generations again
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
         settings.ancestors,
         settings.descendants,
         settings.colors,
         dispatch
      ]
   );

   // Add the person to history
   React.useEffect(() => {
      document.title = "Pedigree for " + personDisplay(decujus);
      dispatch(addToHistory({ kind: HistoryKind.PERSON, id: decujusid }));
   }, [decujus, dispatch, decujusid]);

   const onChange = React.useCallback(
      (diff: Partial<PedigreeSettings>) =>
         dispatch(changePedigreeSettings({ diff })),
      [dispatch]
   );

   // ??? Initially, we have no data and yet loading=false
   // We added special code in Pedigree/Data.tsx to test whether the layout
   // is known, but that's not elegant.
   const main =
      settings.loading || !decujus ? (
         <Loader active={true} size="large">
            Loading
         </Loader>
      ) : (
         <DropTarget redirectUrl={URL.pedigree}>
            <PedigreeLayout
               settings={settings}
               persons={persons}
               allEvents={allEvents}
               allPlaces={allPlaces}
               decujus={decujusid}
            />
         </DropTarget>
      );

   return (
      <Page
         decujusid={decujusid}
         leftSide={
            <PedigreeSide
               settings={settings}
               onChange={onChange}
               themeNameGet={themeNameGet}
            />
         }
         main={main}
      />
   );
};

export default PedigreePage;

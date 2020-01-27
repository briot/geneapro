import * as React from "react";
import { connect, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { Loader } from "semantic-ui-react";
import * as GP_JSON from "../Server/JSON";
import { personDisplay, PersonSet } from "../Store/Person";
import { GenealogyEventSet } from "../Store/Event";
import { PlaceSet } from "../Store/Place";
import { addToHistory, HistoryKind } from "../Store/History";
import { PedigreeSettings, changePedigreeSettings } from "../Store/Pedigree";
import { fetchPedigree } from "../Store/Sagas";
import { AppState, themeNameGetter } from "../Store/State";
import { DropTarget } from "../Draggable";
import { URL } from "../Links";
import Page from "../Page";
import PedigreeLayout from "../Pedigree/Layout";
import PedigreeSide from "../Pedigree/Side";

interface PedigreePageConnectedProps {
   settings: PedigreeSettings;
   persons: PersonSet;
   allEvents: GenealogyEventSet;
   allPlaces: PlaceSet;
   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}

const PedigreePageConnected: React.FC<PedigreePageConnectedProps> = p => {
   const { id } = useParams();
   const decujusid = Number(id);
   const decujus = p.persons[decujusid];
   const dispatch = useDispatch();

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
               ancestors: p.settings.ancestors,
               decujus: decujusid,
               descendants: p.settings.descendants,
               theme: p.settings.colors,
            }
         ),
      [
         decujusid,
         p.settings.ancestors,
         p.settings.descendants,
         p.settings.colors,
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
      p.settings.loading || !decujus ? (
         <Loader active={true} size="large">
            Loading
         </Loader>
      ) : (
         <DropTarget redirectUrl={URL.pedigree}>
            <PedigreeLayout
               settings={p.settings}
               persons={p.persons}
               allEvents={p.allEvents}
               allPlaces={p.allPlaces}
               decujus={decujusid}
            />
         </DropTarget>
      );

   return (
      <Page
         decujusid={decujusid}
         leftSide={
            <PedigreeSide
               settings={p.settings}
               onChange={onChange}
               themeNameGet={p.themeNameGet}
            />
         }
         main={main}
      />
   );
};

const PedigreePage = connect(
   (state: AppState) => ({
      settings: state.pedigree,
      persons: state.persons,
      allEvents: state.events,
      allPlaces: state.places,
      themeNameGet: themeNameGetter(state)
   }),
)(PedigreePageConnected);

export default PedigreePage;

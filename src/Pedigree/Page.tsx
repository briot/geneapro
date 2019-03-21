import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import { Loader } from "semantic-ui-react";
import * as GP_JSON from "../Server/JSON";
import { personDisplay, PersonSet } from "../Store/Person";
import { GenealogyEventSet } from "../Store/Event";
import { PlaceSet } from "../Store/Place";
import { addToHistory } from "../Store/History";
import { PedigreeSettings, changePedigreeSettings } from "../Store/Pedigree";
import { fetchPedigree } from "../Store/Sagas";
import { AppState, GPDispatch, themeNameGetter } from "../Store/State";
import Page from "../Page";
import PedigreeLayout from "../Pedigree/Layout";
import PedigreeSide from "../Pedigree/Side";

interface PropsFromRoute {
   decujusId: string;
}

interface PedigreePageConnectedProps
   extends RouteComponentProps<PropsFromRoute> {
   settings: PedigreeSettings;
   persons: PersonSet;
   allEvents: GenealogyEventSet;
   allPlaces: PlaceSet;
   dispatch: GPDispatch;
   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}

const PedigreePageConnected: React.FC<PedigreePageConnectedProps> = p => {
   const decujusid = Number(p.match.params.decujusId);
   const decujus = p.persons[decujusid];

   // Fetch data from server when some properties change
   // Always run this, though it will do nothing if we already have the data
   React.useEffect(
      () =>
         fetchPedigree.execute(
            //  ??? We only need to reload when colors change if we are using
            //  custom colors
            //  ??? Should avoid fetching known generations again
            p.dispatch,
            {
               decujus: decujusid,
               ancestors: p.settings.ancestors,
               descendants: p.settings.descendants,
               theme: p.settings.colors
            }
         ),
      [
         decujusid,
         p.settings.ancestors,
         p.settings.descendants,
         p.settings.colors,
         p.dispatch
      ]
   );

   // Add the person to history
   React.useEffect(() => {
      document.title = "Pedigree for " + personDisplay(decujus);
      p.dispatch(addToHistory({ person: decujus }));
   }, [decujus, p.dispatch]);

   const onChange = React.useCallback(
      (diff: Partial<PedigreeSettings>) =>
         p.dispatch(changePedigreeSettings({ diff })),
      [p.dispatch]
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
         <PedigreeLayout
            settings={p.settings}
            persons={p.persons}
            allEvents={p.allEvents}
            allPlaces={p.allPlaces}
            decujus={decujusid}
         />
      );

   return (
      <Page
         decujus={decujus}
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
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      settings: state.pedigree,
      persons: state.persons,
      allEvents: state.events,
      allPlaces: state.places,
      themeNameGet: themeNameGetter(state)
   }),
   (dispatch: GPDispatch) => ({
      dispatch
   })
)(PedigreePageConnected);

export default PedigreePage;

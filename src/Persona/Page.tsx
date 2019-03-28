import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import { Loader } from "semantic-ui-react";
import { PersonSet, personDisplay } from "../Store/Person";
import { addToHistory, HistoryKind } from "../Store/History";
import { AppState, GPDispatch, MetadataDict } from "../Store/State";
import { fetchMetadata, fetchPersonDetails } from "../Store/Sagas";
import { GenealogyEventSet } from "../Store/Event";
import Page from "../Page";
import Persona from "../Persona/Persona";

interface PropsFromRoute {
   id: string;
}

interface PersonaPageProps extends RouteComponentProps<PropsFromRoute> {
   dispatch: GPDispatch;
   events: GenealogyEventSet;
   metadata: MetadataDict;
   persons: PersonSet;
}

const PersonaPage: React.FC<PersonaPageProps> = (p) => {
   const id = Number(p.match.params.id);
   const pers = p.persons[id];

   React.useEffect(
      () => fetchMetadata.execute(p.dispatch, {}),
      [p.dispatch]
   );

   React.useEffect(
      () => {
          document.title = pers ? personDisplay(pers) : "Persona";
      },
      [pers]
   );

   React.useEffect(
      () => {
          p.dispatch(addToHistory({ kind: HistoryKind.PERSON, id }));
      },
      [id, p.dispatch ]
   );

   React.useEffect(
      () => fetchPersonDetails.execute(p.dispatch, { id }),
      [id, p.dispatch]
   );

   return (
      <Page
         decujusid={id}
         main={
            pers ? (
               <Persona
                  person={pers}
                  metadata={p.metadata}
                  events={p.events}
               />
            ) : (
               <Loader active={true} size="large">
                  Loading
               </Loader>
            )
         }
      />
   );
};

export default connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      persons: state.persons,
      events: state.events,
      metadata: state.metadata,
   }),
   (dispatch: GPDispatch) => ({ dispatch })
)(PersonaPage);

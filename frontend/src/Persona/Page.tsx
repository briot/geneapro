import * as React from "react";
import { connect, useDispatch } from "react-redux";
import { RouteComponentProps } from "react-router";
import { Loader } from "semantic-ui-react";
import { personDisplay } from "../Store/Person";
import { addToHistory, HistoryKind } from "../Store/History";
import { AppState, MetadataDict } from "../Store/State";
import Page from "../Page";
import Persona from "../Persona/Persona";
import { usePerson } from "../Server/Person";

interface PropsFromRoute {
   id: string;
}

interface PersonaPageProps extends RouteComponentProps<PropsFromRoute> {
   metadata: MetadataDict;
}

const PersonaPage: React.FC<PersonaPageProps> = (p) => {
   const id = Number(p.match.params.id);
   const dispatch = useDispatch();
   const person = usePerson(id);

   React.useEffect(
      () => {
          document.title = person ? personDisplay(person) : "Persona";
      },
      [person]
   );

   React.useEffect(
      () => {
          dispatch(addToHistory({ kind: HistoryKind.PERSON, id }));
      },
      [id, dispatch ]
   );

   return (
      <Page
         decujusid={id}
         main={
            person ? (
               <Persona
                  person={person}
                  metadata={p.metadata}
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
      metadata: state.metadata,
   }),
)(PersonaPage);

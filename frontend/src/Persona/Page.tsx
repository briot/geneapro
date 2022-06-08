import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router";
import { Loader } from "semantic-ui-react";
import { personDisplay } from "../Store/Person";
import { addToHistory, HistoryKind } from "../Store/History";
import { AppState } from "../Store/State";
import Page from "../Page";
import Persona from "../Persona/Persona";
import { usePerson } from "../Server/Person";

type PersonaPageParams = {
   id?: string;
}

const PersonaPage: React.FC<unknown> = () => {
   const params = useParams<PersonaPageParams>();
   const id = Number(params.id);
   const dispatch = useDispatch();
   const person = usePerson(id);
   const metadata = useSelector((s: AppState) => s.metadata);

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
                  metadata={metadata}
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

export default PersonaPage;

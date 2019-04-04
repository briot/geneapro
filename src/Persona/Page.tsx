import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import { Loader } from "semantic-ui-react";
import { AssertionEntities } from "../Server/Person";
import { personDisplay } from "../Store/Person";
import { addToHistory, HistoryKind } from "../Store/History";
import {
   AppState,
   getEntities,
   GPDispatch,
   MetadataDict
} from "../Store/State";
import { fetchPersonDetails } from "../Store/Sagas";
import Page from "../Page";
import Persona from "../Persona/Persona";

interface PropsFromRoute {
   id: string;
}

interface PersonaPageProps extends RouteComponentProps<PropsFromRoute> {
   dispatch: GPDispatch;
   entities: AssertionEntities;
   metadata: MetadataDict;
}

const PersonaPage: React.FC<PersonaPageProps> = (p) => {
   const id = Number(p.match.params.id);
   const pers = p.entities.persons[id];
   const { dispatch } = p;

   React.useEffect(
      () => {
          document.title = pers ? personDisplay(pers) : "Persona";
      },
      [pers]
   );

   React.useEffect(
      () => {
          dispatch(addToHistory({ kind: HistoryKind.PERSON, id }));
      },
      [id, dispatch ]
   );

   React.useEffect(
      () => fetchPersonDetails.execute(dispatch, { id }),
      [id, dispatch]
   );

   return (
      <Page
         decujusid={id}
         main={
            pers ? (
               <Persona
                  dispatch={dispatch}
                  entities={p.entities}
                  person={pers}
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
      entities: getEntities(state),
      metadata: state.metadata,
   }),
   (dispatch: GPDispatch) => ({ dispatch })
)(PersonaPage);

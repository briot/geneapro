import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Loader } from "semantic-ui-react";
import { useParams } from "react-router";
import { AppState } from "../Store/State";
import { addToHistory, HistoryKind } from "../Store/History";
import { fetchSourceDetails } from "../Store/Sagas";
import Page from "../Page";
import SourceDetails from "../Source/Source";

type SourcePageParams = {
   id?: string;
}

const SourcePage: React.FC<unknown> = () => {
   const params = useParams<SourcePageParams>();
   const id = Number(params.id);
   const dispatch = useDispatch();
   const metadata = useSelector((s: AppState) => s.metadata);
   const source = useSelector((s: AppState) => s.sources[id]);

   React.useEffect(
      () => {
         if (id >= 0) {
            fetchSourceDetails.execute(dispatch, { id });
         }
      },
      [id, dispatch]
   );

   React.useEffect(
      () => {
         document.title = source ? source.abbrev : "New Source";
      },
      [source]
   );

   React.useEffect(
      () => {
         dispatch(addToHistory({kind: HistoryKind.SOURCE, id }));
      },
      [id, dispatch]
   );

   return (
      <Page
         decujusid={undefined}
         main={
            source || id < 0 ? (
               <SourceDetails
                  metadata={metadata}
                  source={source}
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

export default SourcePage;

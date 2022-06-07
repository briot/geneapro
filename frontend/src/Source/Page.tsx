import * as React from "react";
import { connect, useDispatch } from "react-redux";
import { Loader } from "semantic-ui-react";
import { RouteComponentProps } from "react-router";
import { AppState, MetadataDict } from "../Store/State";
import { addToHistory, HistoryKind } from "../Store/History";
import { fetchSourceDetails } from "../Store/Sagas";
import { Source } from "../Store/Source";
import Page from "../Page";
import SourceDetails from "../Source/Source";

interface PropsFromRoute {
   id: string;
}

interface SourcePageProps extends RouteComponentProps<PropsFromRoute> {
   metadata: MetadataDict;
   source: Source | undefined;
}
const SourcePage: React.FC<SourcePageProps> = (p) => {
   const id = Number(p.match.params.id);
   const s = p.source;
   const dispatch = useDispatch();

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
         document.title = s ? s.abbrev : "New Source";
      },
      [s]
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
            s || id < 0 ? (
               <SourceDetails
                  metadata={p.metadata}
                  source={s}
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
      source: state.sources[Number(props.match.params.id)] as Source | undefined
   }),
)(SourcePage);

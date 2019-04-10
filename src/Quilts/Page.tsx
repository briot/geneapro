import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import { Loader } from "semantic-ui-react";
import { personDisplay } from "../Store/Person";
import { QuiltsSettings, changeQuiltsSettings } from "../Store/Quilts";
import { AppState, GPDispatch } from "../Store/State";
import { fetchQuiltsFromServer, QuiltsResult } from "../Server/Quilts";
import { addToHistory, HistoryKind } from "../Store/History";
import { DropTarget } from "../Draggable";
import { URL } from "../Links";
import Page from "../Page";
import Quilts from "../Quilts/Quilts";
import QuiltsSide from "../Quilts/Side";

interface PropsFromRoute {
   id: string;
}

interface QuiltsPageProps extends RouteComponentProps<PropsFromRoute> {
   settings: QuiltsSettings;
   dispatch: GPDispatch;
}
const QuiltsPage: React.FC<QuiltsPageProps> = (p) => {
   const [loading, setLoading] = React.useState(false);
   const [layout, setLayout] = React.useState<QuiltsResult|undefined>(undefined);

   const decujusid = Number(p.match.params.id);
   const decujus = layout && layout.persons[decujusid];
   const { dispatch } = p;
   const onSettingsChange = React.useCallback(
      (diff: Partial<QuiltsSettings>) =>
         dispatch(changeQuiltsSettings({ diff })),
      [dispatch]
   );

   React.useEffect(
      () => {
         setLoading(true);
         fetchQuiltsFromServer({
            decujus: decujusid,
         }).then((ps: QuiltsResult|undefined) => {
            if (ps) {
               setLayout(ps);
            }
            setLoading(false);
         });
      },
      [decujusid],
   );

   React.useEffect(
      () => {
         dispatch(addToHistory({ kind: HistoryKind.PERSON, id: decujusid }));
         if (decujus) {
            document.title = "Quilts for " + personDisplay(decujus);
         }
      },
      [decujus, decujusid, dispatch]
   );

   const main = loading ? (
      <Loader active={true} size="large">
         Loading
      </Loader>
   ) : (
      <DropTarget redirectUrl={URL.quilts}>
         <Quilts
            settings={p.settings}
            layout={layout}
            decujus={decujusid}
         />
      </DropTarget>
   );

   return (
      <Page
         decujusid={decujusid}
         leftSide={
            <QuiltsSide
               settings={p.settings}
               onChange={onSettingsChange}
            />
         }
         main={main}
      />
   );
}

export default connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      settings: state.quilts,
   }),
   (dispatch: GPDispatch) => ({ dispatch, })
)(QuiltsPage);

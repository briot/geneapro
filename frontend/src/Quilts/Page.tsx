import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router";
import { Loader } from "semantic-ui-react";
import { personDisplay } from "../Store/Person";
import { QuiltsSettings, changeQuiltsSettings } from "../Store/Quilts";
import { AppState } from "../Store/State";
import { fetchQuiltsFromServer, QuiltsResult } from "../Server/Quilts";
import { addToHistory, HistoryKind } from "../Store/History";
import { DropTarget } from "../Draggable";
import { URL } from "../Links";
import Page from "../Page";
import Quilts from "../Quilts/Quilts";
import QuiltsSide from "../Quilts/Side";

type QuiltsPageParams = {
   id: string;
}

const QuiltsPage: React.FC<unknown> = () => {
   const params = useParams<QuiltsPageParams>();
   const [loading, setLoading] = React.useState(false);
   const [layout, setLayout] = React.useState<QuiltsResult|undefined>(
      undefined);
   const decujusid = Number(params.id);
   const decujus = layout && layout.persons[decujusid];
   const dispatch = useDispatch();
   const settings = useSelector((s: AppState) => s.quilts);
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
            settings={settings}
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
               settings={settings}
               onChange={onSettingsChange}
            />
         }
         main={main}
      />
   );
}

export default QuiltsPage;

import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import { Loader } from "semantic-ui-react";
import { PersonSet, personDisplay } from "../Store/Person";
import { QuiltsSettings, changeQuiltsSettings } from "../Store/Quilts";
import { AppState, GPDispatch } from "../Store/State";
import { fetchQuiltsFromServer, QuiltsResult } from "../Server/Quilts";
import { addToHistory } from "../Store/History";
import Page from "../Page";
import Quilts from "../Quilts/Quilts";
import QuiltsSide from "../Quilts/Side";

interface PropsFromRoute {
   decujusId: string;
}

interface QuiltsPageProps extends RouteComponentProps<PropsFromRoute> {
   settings: QuiltsSettings;
   dispatch: GPDispatch;
}
const QuiltsPage: React.FC<QuiltsPageProps> = (p) => {
   const [loading, setLoading] = React.useState(false);
   const [layout, setLayout] = React.useState<QuiltsResult|undefined>(undefined);

   const decujusid = Number(p.match.params.decujusId);
   const decujus = layout && layout.persons[decujusid];
   const onSettingsChange = React.useCallback(
      (diff: Partial<QuiltsSettings>) =>
         p.dispatch(changeQuiltsSettings({ diff })),
      [p.dispatch]
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
         if (decujus) {
            p.dispatch(addToHistory({ person: decujus }));
            document.title = "Quilts for " + personDisplay(decujus);
         }
      },
      [decujus, p.dispatch]
   );

   const main = loading ? (
      <Loader active={true} size="large">
         Loading
      </Loader>
   ) : (
      <Quilts
         settings={p.settings}
         layout={layout}
         decujus={decujusid}
      />
   );

   return (
      <Page
         decujus={decujus}
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

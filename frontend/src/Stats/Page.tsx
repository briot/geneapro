import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router";
import { Loader } from "semantic-ui-react";
import { JSONStats, fetchStatsFromServer } from "../Server/Stats";
import { AppState } from "../Store/State";
import { StatsSettings, changeStatsSettings } from "../Store/Stats";
import { personDisplay } from "../Store/Person";
import { addToHistory, HistoryKind } from "../Store/History";
import { usePerson } from "../Server/Person";
import { DropTarget } from "../Draggable";
import { URL } from "../Links";
import StatsGeneration from "../Stats/Generations";
import StatsLifespan from "../Stats/Lifespan";
import StatsSide from "../Stats/Side";
import StatsTree from "../Stats/Tree";
import Page from "../Page";

import "../Stats/Stats.css";

type StatsPageParams = {
   id?: string;
}

const StatsPage: React.FC<unknown> = () => {
   const settings = useSelector((s: AppState) => s.stats);
   const dispatch = useDispatch();
   const params = useParams<StatsPageParams>();
   const decujusid = Number(params.id);
   const [data, setData] = React.useState<JSONStats|undefined>(undefined);
   const person = usePerson(decujusid);

   React.useEffect(
      () => {
         fetchStatsFromServer(decujusid, settings).then(setData);
      },
      [decujusid, settings]
   );

   React.useEffect(
      () => {
         dispatch(addToHistory({kind: HistoryKind.PERSON, id: decujusid }));
      },
      [decujusid, dispatch]
   );

   const onChange = React.useCallback(
      (diff: Partial<StatsSettings>) => dispatch(changeStatsSettings({diff})),
      [dispatch]
   );

   if (person) {
      document.title = "Stats for " + personDisplay(person);
   }

   const main = (!data || !person) ? (
      <Loader active={true} size="large">
         Loading
      </Loader>
   ) : (
      <DropTarget redirectUrl={URL.stats}>
         {settings.show_treestats && (
            <StatsTree
               decujus={person}
               totalInDatabase={data.total_persons}
               totalInTree={data.total_ancestors}
               fatherAncestors={data.total_father}
               motherAncestors={data.total_mother}
            />
         )}

         {settings.show_generations && (
            <StatsGeneration
               ranges={data.ranges}
               decujus={person}
            />
         )}

         {settings.show_lifespan && (
            <StatsLifespan
               ages={data.ages}
               settings={settings}
               decujus={person}
            />
         )}
      </DropTarget>
   );

   return (
      <Page
         decujusid={decujusid}
         main={main}
         leftSide={
            <StatsSide
               settings={settings}
               onChange={onChange}
            />
         }
      />
   );
}

export default StatsPage;

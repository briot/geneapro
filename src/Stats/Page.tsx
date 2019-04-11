import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import { Loader } from "semantic-ui-react";
import { JSONStats, fetchStatsFromServer } from "../Server/Stats";
import { AppState, GPDispatch } from "../Store/State";
import { StatsSettings, changeStatsSettings } from "../Store/Stats";
import { PersonSet, personDisplay } from "../Store/Person";
import { addToHistory, HistoryKind } from "../Store/History";
import { usePerson } from "../Server/Person";
import { DropTarget } from "../Draggable";
import { URL } from "../Links";
import StatsGeneration from "../Stats/Generations";
import StatsLifespan from "../Stats/Lifespan";
import StatsSide from "../Stats/Side";
import StatsTree from "../Stats/Tree";
import "../Stats/Stats.css";
import Page from "../Page";

interface PropsFromRoute {
   id: string;
}

interface StatsPageConnectedProps extends RouteComponentProps<PropsFromRoute> {
   dispatch: GPDispatch;
   settings: StatsSettings;
}

const StatsPage: React.FC<StatsPageConnectedProps> = (p) => {
   const decujusid = Number(p.match.params.id);
   const [data, setData] = React.useState<JSONStats|undefined>(undefined);
   const person = usePerson(decujusid);

   React.useEffect(
      () => {
         fetchStatsFromServer(decujusid, p.settings).then(setData);
      },
      [decujusid, p.settings]
   );

   React.useEffect(
      () => {
         p.dispatch(addToHistory({kind: HistoryKind.PERSON, id: decujusid }));
      },
      [decujusid, p.dispatch]
   );

   const onChange = React.useCallback(
      (diff: Partial<StatsSettings>) =>
         p.dispatch(changeStatsSettings({ diff })),
      [p.dispatch]
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
         {p.settings.show_treestats && (
            <StatsTree
               decujus={person}
               totalInDatabase={data.total_persons}
               totalInTree={data.total_ancestors}
               fatherAncestors={data.total_father}
               motherAncestors={data.total_mother}
            />
         )}

         {p.settings.show_generations && (
            <StatsGeneration
               ranges={data.ranges}
               decujus={person}
            />
         )}

         {p.settings.show_lifespan && (
            <StatsLifespan
               ages={data.ages}
               settings={p.settings}
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
               settings={p.settings}
               onChange={onChange}
            />
         }
      />
   );
}

export default connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      settings: state.stats,
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
   })
)(StatsPage);

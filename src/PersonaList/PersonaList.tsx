import * as React from "react";
import { connect } from "react-redux";
import InfiniteList, { InfiniteRowRenderer } from '../InfiniteList';
import Page from "../Page";
import { AppState, GPDispatch, themeNameGetter } from "../Store/State";
import { fetchPersonsFromServer } from '../Server/Person';
import * as GP_JSON from "../Server/JSON";
import { Person } from "../Store/Person";
import { GenealogyEventSet } from "../Store/Event";
import { PersonaLink } from "../Links";
import PersonaListSide from "../PersonaList/Side";
import { extractYear } from "../Store/Event";
import {
   PersonaListSettings,
   changePersonaListSettings
} from "../Store/PersonaList";
import ColorTheme from "../Store/ColorTheme";
import "./PersonaList.css";

const fetchCount = (p: {filter: string}) =>
   fetch(`/data/persona/count?filter=${encodeURI(p.filter)}`)
   .then((r: Response) => r.json());

interface PersonaListProps {
   dispatch: GPDispatch;
   settings: PersonaListSettings;
   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}
const PersonaListConnected: React.FC<PersonaListProps> = p => {
   const onSettingsChange = React.useCallback(
      (diff: Partial<PersonaListSettings>) =>
         p.dispatch(changePersonaListSettings({ diff })),
      [p.dispatch]
   );

   const fetchRows = React.useCallback(
      (params: {filter: string, offset: number, limit: number}) =>
         fetchPersonsFromServer({ colors: p.settings.colors, ...params }),
      [p.settings.colors]
   );

   document.title = 'List of persons';

   const renderRow: InfiniteRowRenderer<Person> = React.useCallback(
      (params) => {
         const b = extractYear(params.row.birthISODate);
         const d = extractYear(params.row.deathISODate);
         return (
            <div style={params.style} className="person" key={params.key}>
               <span
                  style={ColorTheme.forPerson(
                     p.settings.colors,
                     1 /* maxgen */,
                     params.row
                  ).toStr("dom")}
               >
                  <PersonaLink person={params.row} />
               </span>
               <span className="lifespan">
                  <span>{b || ''}</span>
                  {b || d ? " - " : ""}
                  <span>{d || ''}</span>
               </span>
            </div>
         );
      },
      [p.settings]
   );

   return (
      <Page
         leftSide={
            <PersonaListSide
               settings={p.settings}
               onChange={onSettingsChange}
               themeNameGet={p.themeNameGet}
            />
         }
         main={
            <InfiniteList
               title="Person"
               fetchRows={fetchRows}
               fetchCount={fetchCount}
               renderRow={renderRow}
               resetOn={[p.settings.colors]}
            />
         }
      />
   );
};

export default connect(
   (state: AppState) => ({
      settings: state.personalist,
      themeNameGet: themeNameGetter(state)
   }),
   (dispatch: GPDispatch) => ({ dispatch })
)(PersonaListConnected);

import * as React from "react";
import { connect } from "react-redux";
import InfiniteList, { InfiniteRowRenderer } from '../InfiniteList';
import Page from "../Page";
import { AppState, GPDispatch, themeNameGetter } from "../Store/State";
import { fetchPersonsCount, fetchPersonsFromServer } from '../Server/Person';
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

const renderRow: InfiniteRowRenderer<Person, PersonaListSettings> = (p) => {
   const b = extractYear(p.row.birthISODate);
   const d = extractYear(p.row.deathISODate);
   return (
      <div style={p.style} className="person" key={p.key}>
         <span
            style={
               ColorTheme.forPerson(p.settings.colors, 1 /* maxgen */, p.row)
               .toStr("dom")
            }
         >
            <PersonaLink person={p.row} />
         </span>
         <span className="lifespan">
            <span>{b || ''}</span>
            {b || d ? " - " : ""}
            <span>{d || ''}</span>
         </span>
      </div>
   );
};

interface PersonaListProps {
   dispatch: GPDispatch;
   settings: PersonaListSettings;
   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}
const PersonaList: React.FC<PersonaListProps> = p => {
   const onSettingsChange = React.useCallback(
      (diff: Partial<PersonaListSettings>) =>
         p.dispatch(changePersonaListSettings({ diff })),
      [p.dispatch]
   );

   document.title = 'List of persons';

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
               fetchRows={fetchPersonsFromServer}
               fetchCount={fetchPersonsCount}
               renderRow={renderRow}
               settings={p.settings}
               onSettingsChange={onSettingsChange}
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
)(PersonaList);

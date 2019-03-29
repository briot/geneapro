import * as React from "react";
import { connect } from "react-redux";
import { InfiniteListFilter, InfiniteRowRenderer } from '../InfiniteList';
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

interface PersonaListProps {
   dispatch: GPDispatch;
   settings: PersonaListSettings;
   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}
const PersonaList: React.FC<PersonaListProps> = p => {
   const [count, setCount] = React.useState(0);

   const onSettingsChange = React.useCallback(
      (diff: Partial<PersonaListSettings>) =>
         p.dispatch(changePersonaListSettings({ diff })),
      [p.dispatch]
   );

   const onFilterChange = React.useCallback(
      (filter: string) => onSettingsChange({ filter }),
      [onSettingsChange]
   );

   const renderRow: InfiniteRowRenderer<Person> = React.useCallback(
      (pers) => {
         const b = extractYear(pers.row.birthISODate);
         const d = extractYear(pers.row.deathISODate);
         return (
            <div style={pers.style} className="person" key={pers.key}>
               <span
                  style={
                     ColorTheme.forPerson(
                        p.settings.colors, 1 /* maxgen */, pers.row)
                     .toStr("dom")
                  }
               >
                  <PersonaLink person={pers.row} />
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

   React.useEffect(
      () => {
         fetchPersonsCount({filter: p.settings.filter}).then(c => setCount(c));
      },
      [p.settings]
   );

   //  Changing this callback resets the list
   const fetchPersons = React.useCallback(
      (a) => {
         return fetchPersonsFromServer({ ...a, filter: p.settings.filter });
      },
      [p.settings.filter]
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
            <InfiniteListFilter
               title="Person"
               fetchRows={fetchPersons}
               filter={p.settings.filter}
               renderRow={renderRow}
               rowCount={count}
               onFilterChange={onFilterChange}
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

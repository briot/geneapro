import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import { InfiniteListFilter, InfiniteRowRenderer } from '../InfiniteList';
import Page from "../Page";
import { AppState, themeNameGetter } from "../Store/State";
import { fetchPersonsCount, fetchPersonsFromServer } from '../Server/Person';
import { Person } from "../Store/Person";
import { PersonaLink } from "../Links";
import PersonaListSide from "../PersonaList/Side";
import { extractYear } from "../Store/Event";
import {
   PersonaListSettings,
   changePersonaListSettings
} from "../Store/PersonaList";
import ColorTheme from "../Store/ColorTheme";
import "./PersonaList.css";

const PersonaList: React.FC<unknown> = () => {
   const [count, setCount] = React.useState(0);
   const dispatch = useDispatch();
   const settings = useSelector((s: AppState) => s.personalist);
   const themeNameGet = useSelector((s: AppState) => themeNameGetter(s));

   const onSettingsChange = React.useCallback(
      (diff: Partial<PersonaListSettings>) =>
         dispatch(changePersonaListSettings({ diff })),
      [dispatch]
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
            <div style={pers.style} className="person" key={pers.row.id} >
               <span
                  style={
                     ColorTheme.forPerson(
                        settings.colors, 1 /* maxgen */, pers.row)
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
      [settings]
   );

   React.useEffect(
      () => {
         fetchPersonsCount({filter: settings.filter}).then(c => setCount(c));
      },
      [settings.filter]
   );

   //  Changing this callback resets the list
   const fetchPersons = React.useCallback(
      (a: {offset: number; limit: number}) => {
         return fetchPersonsFromServer({ ...a, filter: settings.filter });
      },
      [settings.filter]
   );

   document.title = 'List of persons';

   return (
      <Page
         leftSide={
            <PersonaListSide
               settings={settings}
               onChange={onSettingsChange}
               themeNameGet={themeNameGet}
            />
         }
         main={
            <InfiniteListFilter
               title="Person"
               fetchRows={fetchPersons}
               filter={settings.filter}
               fullHeight={true}
               renderRow={renderRow}
               rowCount={count}
               onFilterChange={onFilterChange}
            />
         }
      />
   );
};

export default PersonaList;

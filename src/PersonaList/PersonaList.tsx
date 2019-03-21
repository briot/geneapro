import * as React from "react";
import { connect } from "react-redux";
import { FixedSizeList } from "react-window";
import Page from "../Page";
import { AppState, GPDispatch, themeNameGetter } from "../Store/State";
import { Input, InputProps, Segment } from "semantic-ui-react";
import * as GP_JSON from "../Server/JSON";
import { Person, PersonSet } from "../Store/Person";
import { GenealogyEventSet } from "../Store/Event";
import { useComponentSize, useDebounce } from "../Hooks";
import { PersonaLink } from "../Links";
import PersonaListSide from "../PersonaList/Side";
import { extractYear } from "../Store/Event";
import {
   PersonaListSettings,
   changePersonaListSettings
} from "../Store/PersonaList";
import { fetchPersons } from "../Store/Sagas";
import ColorTheme from "../Store/ColorTheme";
import "./PersonaList.css";

interface PersonaListProps {
   persons: PersonSet;
   allEvents: GenealogyEventSet;
   dispatch: GPDispatch;

   settings: PersonaListSettings;
   onChange: (diff: Partial<PersonaListSettings>) => void;

   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}
const PersonaListConnected: React.FC<PersonaListProps> = p => {
   const container = React.useRef<HTMLDivElement>(null);
   const [filter, setFilter] = React.useState("");
   const [sorted, setSorted] = React.useState<Person[]>([]);
   const size = useComponentSize(container);

   // Fetch the list of persons, using current color theme
   // ??? No need to reload if the colors changed to a built-in theme (<0)
   React.useEffect(
      () =>
         fetchPersons.execute(p.dispatch, {
            colors: p.settings.colors
            // limit: 50,
            // offset: 5000,
         }),
      [p.dispatch, p.settings.colors]
   );

   // Filter the list of persons
   React.useEffect(() => {
      let list = Object.values(p.persons);
      if (filter) {
         const lc_filter = filter.toLowerCase();
         list = list.filter(
            p2 => p2.display_name.toLowerCase().indexOf(lc_filter) >= 0
         );
      }
      setSorted(
         list.sort((p1, p2) => p1.display_name.localeCompare(p2.display_name))
      );
   }, [p.persons, filter]);

   // Called when the filter is modified
   const onFilterChange = React.useCallback(
      useDebounce(
         (e: {}, val: InputProps) => setFilter(val.value as string),
         250
      ),
      []
   );

   const itemKey = React.useCallback((index: number) => sorted[index].id, [
      sorted
   ]);

   document.title = "List of persons";

   return (
      <Page
         leftSide={
            <PersonaListSide
               settings={p.settings}
               onChange={p.onChange}
               themeNameGet={p.themeNameGet}
            />
         }
         main={
            <div className="PersonaList List" ref={container}>
               <Segment color="blue" attached={true}>
                  <span>
                     {sorted.length} / {Object.keys(p.persons).length} Persons
                  </span>
                  <Input
                     icon="search"
                     placeholder="Filter..."
                     onChange={onFilterChange}
                     style={{ position: "absolute", right: "5px", top: "5px" }}
                  />
               </Segment>

               <FixedSizeList
                  width={size.width}
                  height={size.height}
                  itemCount={sorted.length}
                  itemKey={itemKey}
                  itemSize={30}
                  overscanCount={5}
               >
                  {({ index, style }: { index: number; style: object }) => {
                     const pers = sorted[index];
                     const b = extractYear(pers.birthISODate);
                     const d = extractYear(pers.deathISODate);
                     return (
                        <div style={style} className="person">
                           <span
                              style={ColorTheme.forPerson(
                                 p.settings.colors,
                                 pers
                              ).toStr("dom")}
                           >
                              <PersonaLink id={pers.id} />
                           </span>
                           <span className="lifespan">
                              {pers.sex}
                              <span>{b}</span>
                              {b || d ? " - " : ""}
                              <span>{d}</span>
                           </span>
                        </div>
                     );
                  }}
               </FixedSizeList>
            </div>
         }
      />
   );
};

const PersonaList = connect(
   (state: AppState) => ({
      persons: state.persons,
      allEvents: state.events,
      settings: state.personalist,
      themeNameGet: themeNameGetter(state)
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<PersonaListSettings>) => {
         dispatch(changePersonaListSettings({ diff }));
      }
   })
)(PersonaListConnected);
export default PersonaList;

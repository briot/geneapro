import * as React from "react";
import { connect } from "react-redux";
import {
   Index,
   IndexRange,
   InfiniteLoader,
   InfiniteLoaderChildProps,
   List,
   ListRowRenderer
} from "react-virtualized";
import Page from "../Page";
import { AppState, GPDispatch, themeNameGetter } from "../Store/State";
import { Input, InputProps, Segment } from "semantic-ui-react";
import { fetchPersonsFromServer } from '../Server/Person';
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
import ColorTheme from "../Store/ColorTheme";
import "./PersonaList.css";

const MIN_BATCH_SIZE = 300;

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
   const size = useComponentSize(container);
   const [filter, setFilter] = React.useState("");
   const [itemCount, setItemCount] = React.useState(0);
   const infiniteLoaderRef = React.useRef<InfiniteLoader>(null);

   // Set to a Person when it has finished loading.
   // Set to 'false' while loading.
   // Set to undefined when we never requested its loading
   const [rows, setRows] = React.useState<(Person|boolean|undefined)[]>([]);

   // Fetch the list of persons, using current color theme
   const loadMoreItems = React.useCallback(
      (rg: IndexRange) => {
         // Prepare the list of rows to indicate which ones we are loading,
         // and thus avoid double-loading
         setRows(s => {
            const result = new Array(Math.max(s.length, rg.stopIndex));
            s.forEach((p, idx) => result[idx] = p);
            for (let idx = rg.startIndex; idx <= rg.stopIndex; idx++) {
               if (result[idx - 1] === undefined) {
                  result[idx - 1] = false;
               }
            }
            return result;
         });

         // Fetch rows
         return fetchPersonsFromServer({
            colors: p.settings.colors,
            filter: filter,
            offset: rg.startIndex,
            limit: rg.stopIndex - rg.startIndex + 1
         }).then(newPersons => {
            setRows(s => {
               const result = [...s];
               newPersons.forEach((p, idx) => result[idx + rg.startIndex] = p);
               return result;
            });
         }).catch(reason => {
            alert('Error while loading persons\n' + reason);
         });
      },
      [p.settings.colors, filter]
   );

   const reset = () => {
      window.fetch(`/data/persona/count?filter=${encodeURI(filter)}`)
         .then((r: Response) => r.json())
         .then((count: number) => setItemCount(count));
      setRows([]);
      document.title = `List of persons ${filter}`;
      if (infiniteLoaderRef.current) {
         //  Do not let infinite loader auto-reload. If we had scrolled
         //  down, it would still be requesting items 2000..3000, even
         //  though there might only be 10 items left after filtering.
         infiniteLoaderRef.current.resetLoadMoreRowsCache();
         loadMoreItems({startIndex: 0, stopIndex: MIN_BATCH_SIZE});
      }
   };

   // When colors change, should reset the list of persons
   React.useEffect(reset, [p.settings.colors, filter]);

   const isRowLoaded = React.useCallback(
      (q: Index) => q.index < rows.length && rows[q.index] !== undefined,
      [rows]
   );

   // Called when the filter is modified
   const onFilterChange = React.useCallback(
      useDebounce(
         (e: {}, val: InputProps) => setFilter(val.value as string),
         250
      ),
      []
   );

   const renderCell: ListRowRenderer = React.useCallback(
      ({ index, key, style }) => {
         const pers = rows[index] as Person;
         if (!pers) {
            return (
               <div key={key} className="loading" style={style}>
                  loading...
               </div>
            );
         }

         const b = extractYear(pers.birthISODate);
         const d = extractYear(pers.deathISODate);
         return (
            <div style={style} className="person" key={key}>
               <span
                  style={ColorTheme.forPerson(
                     p.settings.colors,
                     pers
                  ).toStr("dom")}
               >
                  <PersonaLink person={pers} />
               </span>
               <span className="lifespan">
                  <span>{b || ''}</span>
                  {b || d ? " - " : ""}
                  <span>{d || ''}</span>
               </span>
            </div>
         );
      },
      [rows, p.settings]
   );

   const renderList = React.useCallback(
      ({onRowsRendered, registerChild}: InfiniteLoaderChildProps) => (
         <List
            width={size.width}
            height={size.height}
            rowCount={itemCount}
            rowHeight={30}
            rowRenderer={renderCell}
            onRowsRendered={onRowsRendered}
            ref={registerChild}
         />
      ),
      [renderCell, itemCount, size]
   );

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
                  <span>{itemCount} Persons</span>
                  <Input
                     icon="search"
                     placeholder="Filter..."
                     onChange={onFilterChange}
                     style={{ position: "absolute", right: "5px", top: "5px" }}
                  />
               </Segment>

               <InfiniteLoader
                  isRowLoaded={isRowLoaded}
                  rowCount={itemCount}
                  loadMoreRows={loadMoreItems}
                  minimumBatchSize={MIN_BATCH_SIZE}
                  threshold={MIN_BATCH_SIZE / 2}
                  ref={infiniteLoaderRef}
               >
                  {renderList}
               </InfiniteLoader>
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

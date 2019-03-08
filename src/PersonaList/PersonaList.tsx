import * as React from 'react';
import { connect } from 'react-redux';
import Page from '../Page';
import { AppState, GPDispatch, themeNameGetter } from '../Store/State';
import { Input, Segment } from 'semantic-ui-react';
import * as GP_JSON from '../Server/JSON';
import { Person, PersonSet } from '../Store/Person';
import { GenealogyEventSet } from '../Store/Event';
import { PersonaLink } from '../Links';
import PersonaListSide from '../PersonaList/Side';
import { extractYear } from '../Store/Event';
import { PersonaListSettings,
         changePersonaListSettings } from '../Store/PersonaList';
import { fetchPersons } from '../Store/Sagas';
import Style from '../Store/Styles';
import SmartTable, { ColumnDescr } from '../SmartTable';
import ColorTheme from '../Store/ColorTheme';
import './PersonaList.css';

type Column = ColumnDescr<Person, Person, PersonaListSettings|undefined>;

const ColId: Column = {
   headerName: 'Id',
   get: (p: Person) => p,
   format: (p: Person) => <PersonaLink id={p.id} />,
   inlineStyle: (p: Person, settings: PersonaListSettings|undefined) =>
      settings && ColorTheme.forPerson(settings.colors, p).toStr('dom'),
};

const ColLife: Column = {
   headerName: 'Lifespan',
   defaultWidth: 20,
   get: (p: Person) => p,
   format: (p: Person) => {
      const b = extractYear(p.birthISODate);
      const d = extractYear(p.deathISODate);
      return (
         <span className="lifespan">
            <span>{b}</span>
            {(b || d) ? ' - ' : ''}
            <span>{d}</span>
         </span>
      );
   },
};

interface PersonaListProps {
   persons: PersonSet;
   allEvents: GenealogyEventSet;
   dispatch: GPDispatch;

   settings: PersonaListSettings;
   onChange: (diff: Partial<PersonaListSettings>) => void;

   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}

interface PersonaListState {
   filter?: string;
   persons: Person[];  // sorted
}

class PersonaListConnected
extends React.PureComponent<PersonaListProps, PersonaListState> {
   state: PersonaListState = {
      filter: '',
      persons: [],
   };

   readonly cols: Column[] = [ColId, ColLife];

   componentDidUpdate(old: PersonaListProps) {
      if (old.persons !== this.props.persons ||
          old.settings.colors !== this.props.settings.colors
      ) {
         this.setState((s: PersonaListState) => ({
            ...s,
            persons: this.computePersons(this.props.persons, s.filter),
         }));
      }
   }

   componentDidMount() {
      fetchPersons.execute(
         this.props.dispatch, {colors: this.props.settings.colors});
   }

   computePersons(set: PersonSet, filter?: string): Person[] {
      let list = Object.values(set)
         .sort((p1, p2) => p1.name.localeCompare(p2.name));

      if (filter) {
         list = list.filter(
            (p: Person) => p.name.toLowerCase().indexOf(filter) >= 0
         );
      }

      return list;
   }

   filterChange = (e: React.FormEvent<HTMLElement>, val: {value: string}) => {
      this.setState({
         filter: val.value,
         persons: this.computePersons(this.props.persons, val.value),
      });
   }

   render() {
      const width = 900;
      document.title = 'List of persons';

      const persons = this.state.persons;

      return (
         <Page
            leftSide={
               <PersonaListSide
                  settings={this.props.settings}
                  onChange={this.props.onChange}
                  themeNameGet={this.props.themeNameGet}
               />
            }
            main={
               <div className="PersonaList List">
                  <Segment
                     style={{width: width}}
                     color="blue"
                     attached={true}
                  >
                     <span>
                        {persons.length} / {Object.keys(this.props.persons).length} Persons
                     </span>
                     <Input
                        icon="search"
                        placeholder="Filter..."
                        onChange={this.filterChange}
                        style={{position: 'absolute', right: '5px', top: '5px'}}
                     />
                  </Segment>

                  <SmartTable<Person, Person, PersonaListSettings>
                     width={width}
                     rowHeight={30}
                     rows={persons}
                     data={this.props.settings}
                     columns={this.cols}
                     resizableColumns={true}
                  />
               </div>
            }
         />
      );
   }
}

const PersonaList = connect(
   (state: AppState) => ({
      persons: state.persons,
      allEvents: state.events,
      settings: state.personalist,
      themeNameGet: themeNameGetter(state),
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
      onChange: (diff: Partial<PersonaListSettings>) => {
         dispatch(changePersonaListSettings({diff}));
      },
   }),
)(PersonaListConnected);
export default PersonaList;

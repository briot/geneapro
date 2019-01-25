import * as React from 'react';
import { connect } from 'react-redux';
import Page from './Page';
import { AppState, GPDispatch } from './Store/State';
import { Input, Segment } from 'semantic-ui-react';
import { Person, PersonSet } from './Store/Person';
import { GenealogyEventSet } from './Store/Event';
import { PersonaLink } from './Links';
import { extractYear } from './Store/Event';
import { fetchPersons } from './Store/Sagas';
import SmartTable, { ColumnDescr } from './SmartTable';
import './PersonaList.css';

type Column = ColumnDescr<Person, number|Person>;

const ColId: Column = {
   headerName: 'Id',
   get: (p: Person) => p.id,
   format: (pid: number|Person) => <PersonaLink id={pid as number} />,
};

const ColLife: Column = {
   headerName: 'Lifespan',
   defaultWidth: 20,
   get: (p: Person) => p,
   format: (p: number|Person) => {
      const p2 = p as Person;
      const b = extractYear(p2.birthISODate);
      const d = extractYear(p2.deathISODate);
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
      if (old.persons !== this.props.persons) {
         this.setState((s: PersonaListState) => ({
            ...s,
            persons: this.computePersons(this.props.persons, s.filter),
         }));
      }
   }

   componentDidMount() {
      this.props.dispatch(fetchPersons.request({}));
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

                  <SmartTable<Person, Person|number>
                     width={width}
                     rowHeight={30}
                     rows={persons}
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
   }),
   (dispatch: GPDispatch) => ({
      dispatch
   }),
)(PersonaListConnected);
export default PersonaList;

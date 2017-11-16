import * as React from 'react';
import { connect } from 'react-redux';
import 'fixed-data-table/dist/fixed-data-table.css';
import Page from './Page';
import { AppState, GPDispatch } from './Store/State';
import { Input, Segment } from 'semantic-ui-react';
import { Person, PersonSet } from './Store/Person';
import { GenealogyEventSet } from './Store/Event';
import { PersonaLink } from './Links';
import { Table, CellProps, Column, Cell } from 'fixed-data-table';
import { event_to_string } from './Store/Event';
import { fetchPersons } from './Store/Sagas';

import './PersonaList.css';

interface PersonaListProps {
   persons: PersonSet;
   allEvents: GenealogyEventSet;
   dispatch: GPDispatch;
}

interface PersonaListState {
   filter?: string;
   persons: Person[];
}

class PersonaListConnected extends React.PureComponent<PersonaListProps, PersonaListState> {
   constructor() {
      super();
      this.state = {
         filter: '',
         persons: [],
      };
   }

   componentWillReceiveProps(nextProps: PersonaListProps) {
      if (nextProps.persons !== this.props.persons) {
         this.setState((s: PersonaListState) => ({
            ...s,
            persons: this.computePersons(nextProps.persons, s.filter),
         }));
      }
   }

   componentWillMount() {
      this.props.dispatch(fetchPersons.request({}));
   }

   computePersons(set: PersonSet, filter?: string): Person[] {
      let list = Object.entries(set)
         .map(
            ([key, val]: [string, Person]) => val).sort(
            (p1: Person, p2: Person) => p1.surn.localeCompare(p2.surn) ||
                                        p1.givn.localeCompare(p2.givn));

      if (filter) {
         list = list.filter(
            (p: Person) => p.surn.toLowerCase().indexOf(filter) >= 0 ||
                           p.givn.toLowerCase().indexOf(filter) >= 0
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

      const idWidth = 100;
      const nameWidth = width - idWidth;
      const persons = this.state.persons;

      return (
         <Page
            main={
               <div className="PersonaList">
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
                  <Table
                     rowHeight={30}
                     rowsCount={persons.length}
                     width={width}
                     height={600}
                     footerHeight={0}
                     headerHeight={30}
                  >
                     <Column
                             header={<Cell>Surname</Cell>}
                             cell={({rowIndex, ...props}: CellProps) => {
                                const p: Person = persons[rowIndex as number];
                                const b: string = event_to_string(
                                   p.birthEventId ?
                                      this.props.allEvents[p.birthEventId] :
                                      undefined,
                                   false, true);
                                const d: string = event_to_string(
                                   p.deathEventId ?
                                      this.props.allEvents[p.deathEventId] :
                                      undefined,
                                   false, true);
                                return (
                                   <Cell {...props}>
                                      <PersonaLink
                                         className="name"
                                         id={p.id}
                                         surn={p.surn}
                                         givn={p.givn}
                                      />
                                     <span className="lifespan">
                                        <span>{b}</span>
                                        {(b || d) ? ' - ' : ''}
                                        <span>{d}</span>
                                     </span>
                                   </Cell>
                                );
                             }}
                             isResizable={false}
                             width={nameWidth}
                     />
                     <Column
                             header={<Cell>Id</Cell>}
                             cell={({rowIndex, ...props}: CellProps) => {
                                const p: Person = persons[rowIndex as number];
                                return (
                                   <Cell {...props}>
                                      <PersonaLink
                                         className="id"
                                         id={p.id}
                                         givn={p.id.toString()}
                                      />
                                   </Cell>
                                );
                             }}
                             isResizable={false}
                             width={idWidth}
                     />
                  </Table>
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

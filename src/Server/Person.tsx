import { BasePerson, Person, EventAndRole, Characteristic } from '../Store/Person';
import { GenealogyEventSet } from '../Store/Event';

interface JSONPersons {
   persons: BasePerson[];
}

export function* fetchPersonsFromServer() {
   const resp: Response = yield window.fetch('/data/persona/list');
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }

   const data: JSONPersons = yield resp.json();
   return data.persons;
}

interface JSONPerson {
   id: number;
   name: string;
   description: string;
   last_change: string;
}

interface JSONEventType {
   id: number;
   name: string;  // "birth"
   gedcom: string;
}

interface JSONPlace {
   id: number;
   name: string;
}

interface JSONEvent {
   id: number;
   date: string;
   date_sort: string;
   name: string;
   place?: JSONPlace;
   type: JSONEventType;
}

interface JSONSource {
}

interface JSONCharacteristic {
   date?: string;
   date_sort?: string;
   name: string;
   place?: JSONPlace;
   sources: JSONSource[]; 
}

interface JSONCharPart {
   name: string;
   value: string;
}

export interface JSONResearcher {
   id: number;
   name: string;
   comment: string;
}

export interface JSONAssertion {
   disproved: boolean;
   rationale: string;
   last_change: string;
   source_id: number;
   surety: number;
   researcher: JSONResearcher;
}

interface P2E extends JSONAssertion {
   p1: {person: JSONPerson};
   p2: {role: string;
        event: JSONEvent};
}

interface P2C extends JSONAssertion {
   p1: {person: JSONPerson};
   p2: {char: JSONCharacteristic;
        parts: JSONCharPart[]};
}

interface P2P extends JSONAssertion {
   p1: {person: JSONPerson};
   p2: {person: JSONPerson};
}

interface P2G extends JSONAssertion {
   p1: {person: JSONPerson};
}

interface JSONPersonDetails {
   person: BasePerson;
   p2c: P2C[];
   p2e: P2E[];
   p2g: P2G[];
   p2p: P2P[];
   sources: {[id: number]: JSONSource};
}

export interface DetailsResult {
   events: GenealogyEventSet; // All events seen in the result
   person: Person;
}

export function* fetchPersonDetailsFromServer(id: number) {
   const resp: Response = yield window.fetch('/data/persona/' + id);
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }
   const data: JSONPersonDetails = yield resp.json();
   const pEvents: EventAndRole[] = [];
   const events: GenealogyEventSet = {};
   const chars: Characteristic[] = [];

   for (const e of data.p2e) {
      events[e.p2.event.id] = e.p2.event;
      pEvents.push({
         role: e.p2.role,
         eventId: e.p2.event.id});
   }

   for (const c of data.p2c) {
      chars.push({
         date: c.p2.char.date,
         date_sort: c.p2.char.date_sort,
         name: c.p2.char.name,
         place: c.p2.char.place,
         parts: c.p2.parts,
      });
   }

   const r: DetailsResult = {
      person: {...data.person, events: pEvents, chars: chars},
      events: events,
   };
   return r;
}

import { BasePerson, Person, PersonSet, EventAndRole, Characteristic } from '../Store/Person';
import { GenealogyEventSet } from '../Store/Event';
import { PlaceSet } from '../Store/Place';

export interface JSONPerson {
   id: number;
   givn: string;
   surn: string;
   sex: string;
   generation: number;
   parents: (number|null)[];
   children: (number|null)[];
   style: number;
   birth: JSONEvent;
   marriage: JSONEvent;
   death: JSONEvent;
}

export interface JSONPersons {
   persons: JSONPerson[];
}

export interface FetchPersonsResult {
   persons: PersonSet;
   events: GenealogyEventSet;
}

export function jsonPersonToPerson(json: JSONPersons): FetchPersonsResult {
   let persons: PersonSet = {};
   let events: GenealogyEventSet = {};
   for (const pid of Object.keys(json.persons)) {
      const jp: JSONPerson = json.persons[pid];
      persons[pid] = {
         id: jp.id,
         givn: jp.givn,
         surn: jp.surn,
         birthEventId: jp.birth ? jp.birth.id : undefined,
         deathEventId: jp.death ? jp.death.id : undefined,
         marriageEventId: jp.marriage ? jp.marriage.id : undefined,
         knownAncestors: 0,
         knownDescendants: 0,
         parents: jp.parents,
         children: jp.children,
      };

      if (jp.birth) {
         events[jp.birth.id] = jp.birth;
      }
      if (jp.death) {
         events[jp.death.id] = jp.death;
      }
      if (jp.marriage) {
         events[jp.marriage.id] = jp.marriage;
      }
   }
   return {persons, events};
}

export function* fetchPersonsFromServer() {
   const resp: Response = yield window.fetch('/data/persona/list');
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }

   const data: JSONPersons = yield resp.json();
   return jsonPersonToPerson(data);
}

interface JSONPersonForAssertion {
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
   p1: {person: JSONPersonForAssertion};
   p2: {role: string;
        event: JSONEvent};
}

interface P2C extends JSONAssertion {
   p1: {person: JSONPersonForAssertion};
   p2: {char: JSONCharacteristic;
        parts: JSONCharPart[]};
}

interface P2P extends JSONAssertion {
   p1: {person: JSONPersonForAssertion};
   p2: {person: JSONPersonForAssertion};
}

interface P2G extends JSONAssertion {
   p1: {person: JSONPersonForAssertion};
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
   places: PlaceSet;
}

export function* fetchPersonDetailsFromServer(id: number) {
   const resp: Response = yield window.fetch('/data/persona/' + id);
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }
   const data: JSONPersonDetails = yield resp.json();
   const pEvents: EventAndRole[] = [];
   const events: GenealogyEventSet = {};
   const places: PlaceSet = {};
   const chars: Characteristic[] = [];

   for (const e of data.p2e) {
      let placeId: number|undefined;
      const ev: JSONEvent = e.p2.event;
      if (ev.place) {
         placeId = ev.place.id;
         places[placeId] = ev.place;
      }
      events[ev.id] = {
         id: ev.id,
         date: ev.date,
         date_sort: ev.date_sort,
         name: ev.name,
         placeId: placeId,
         type: ev.type,
      };
      pEvents.push({
         role: e.p2.role,
         eventId: e.p2.event.id});
   }

   for (const c of data.p2c) {
      const p: JSONPlace|undefined = c.p2.char.place;
      if (p) {
         places[p.id] = {
            id: p.id,
            name: p.name
         };
      }
      chars.push({
         date: c.p2.char.date,
         date_sort: c.p2.char.date_sort,
         name: c.p2.char.name,
         placeId: p ? p.id : undefined,
         parts: c.p2.parts,
      });
   }

   const r: DetailsResult = {
      person: {...data.person, events: pEvents, chars: chars},
      places: places,
      events: events,
   };
   return r;
}

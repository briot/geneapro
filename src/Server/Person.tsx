import * as d3Color from 'd3-color';
import { BasePerson, Person, PersonSet } from '../Store/Person';
import { Assertion, AssertionList, P2E, P2C, P2P, P2G } from '../Store/Assertion';
import { GenealogyEventSet } from '../Store/Event';
import { PlaceSet } from '../Store/Place';
import { JSONPlace } from '../Server/Place';

export interface JSONStyle  {
   [cssName: string]: string;
}

export interface JSONPerson {
   id: number;
   givn: string;
   surn: string;
   sex: string;
   generation: number;
   parents: (number|null)[];
   children: (number|null)[];
   birth: JSONEvent;
   marriage: JSONEvent;
   death: JSONEvent;
   style: number;  // index into the styles array
}

export interface JSONPersons {
   persons: JSONPerson[];
}

export interface FetchPersonsResult {
   persons: PersonSet;
   events: GenealogyEventSet;
}

export function jsonPersonToPerson(
   json: JSONPersons,
   styles: JSONStyle[],
): FetchPersonsResult {
   let persons: PersonSet = {};
   let events: GenealogyEventSet = {};
   for (const pid of Object.keys(json.persons)) {
      const jp: JSONPerson = json.persons[pid];
      const s: JSONStyle = styles[jp.style];
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
         style: {
            fill: s && d3Color.color(s.fill),
            stroke: s && d3Color.color(s.stroke),
            color: s && d3Color.color(s.color),
            fontWeight: s && s['font-weight'],
         }
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
   return jsonPersonToPerson(data, [] /* styles */);
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

export interface JSONEvent {
   id: number;
   date: string;
   date_sort: string;
   name: string;
   place?: number;
   type: JSONEventType;
}

interface JSONSource {
}

interface JSONCharacteristic {
   date?: string;
   date_sort?: string;
   name: string;
   place?: number;
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

interface P2EJSON extends JSONAssertion {
   p1: {person: number};
   p2: {role: string; event: number};
}
function p2eFromJSON(e: P2EJSON) {
   return new P2E(
      e.surety /* surety */,
      e.researcher.name /* researcher */,
      e.rationale /* rationale */,
      e.disproved /* disproved */,
      e.last_change /* lastChanged */,
      e.p1.person /* personId */,
      e.p2.event /* eventId */,
      e.p2.role /* role */,
      e.source_id /* sourceId */
   );
}

interface P2CJSON extends JSONAssertion {
   p1: {person: number};
   p2: {char: JSONCharacteristic; parts: JSONCharPart[]};
}
function p2cFromJSON(c: P2CJSON) {
   return new P2C(
      c.surety /* surety */,
      c.researcher.name /* researcher */,
      c.rationale /* rationale */,
      c.disproved /* disproved */,
      c.last_change /* lastChanged */,
      c.p1.person /* personId */,
      {
         date: c.p2.char.date,
         date_sort: c.p2.char.date_sort,
         name: c.p2.char.name,
         placeId: c.p2.char.place,
         parts: c.p2.parts,
      } /* characteristic */,
      c.source_id /* sourceId */,
   );
}

interface P2PJSON extends JSONAssertion {
   p1: {person: number};
   p2: {person: number};
}
function p2pFromJSON(a: P2PJSON) {
   return new P2P(
      a.surety /* surety */,
      a.researcher.name /* researcher */,
      a.rationale /* rationale */,
      a.disproved /* disproved */,
      a.last_change /* astChanged */,
      a.p1.person /* person1Id */,
      a.p2.person /* person2Id */,
      a.source_id /* sourceId */,
   );
}

interface P2GJSON extends JSONAssertion {
   p1: {person: number};
}
function p2gFromJSON(a: P2GJSON) {
   return new P2G(
      a.surety /* surety */,
      a.researcher.name /* researcher */,
      a.rationale /* rationale */,
      a.disproved /* disproved */,
      a.last_change /* astChanged */,
      a.p1.person /* personId */,
      -1 /* groupId */,
      a.source_id /* sourceId */,
   );
}

function isP2E(a: JSONAssertion): a is P2EJSON {
   return (a as P2EJSON).p1.person !== undefined &&
          (a as P2EJSON).p2.event !== undefined;
}

function isP2C(a: JSONAssertion): a is P2CJSON {
   return (a as P2CJSON).p1.person !== undefined &&
          (a as P2CJSON).p2.char !== undefined;
}

function isP2P(a: JSONAssertion): a is P2PJSON {
   return (a as P2PJSON).p1.person !== undefined &&
          (a as P2PJSON).p2.person !== undefined;
}

export function assertionFromJSON(a: JSONAssertion): Assertion {
   if (isP2E(a)) {
      return p2eFromJSON(a);
   } else if (isP2C(a)) {
      return p2cFromJSON(a);
   } else if (isP2P(a)) {
      return p2pFromJSON(a);
   } else {
      return p2gFromJSON(a as P2GJSON);
   }
}

export interface AssertionEntitiesJSON {
   events: JSONEvent[];  // All events mentioned in the asserts
   persons: JSONPersonForAssertion[];
   places: JSONPlace[];
}

interface JSONPersonDetails extends AssertionEntitiesJSON {
   person: BasePerson;
   asserts: JSONAssertion[];
   sources: {[id: number]: JSONSource};
}

export interface AssertionEntities {
   events: GenealogyEventSet; // All events seen in the result
   persons: PersonSet;
   places: PlaceSet;
}

export interface DetailsResult extends AssertionEntities {
   person: Person;
}

export function setAssertionEntities(
   entities: AssertionEntitiesJSON,
   into: AssertionEntities,
   
) {
   for (const p of entities.places) {
      into.places[p.id] = {
         id: p.id,
         name: p.name,
         // p.date,
         // p.date_sort,
         // p.parent_place_id,
      };
   }

   for (const e of entities.events) {
      into.events[e.id] = {
         id: e.id,
         date: e.date,
         date_sort: e.date_sort,
         name: e.name,
         placeId: e.place,
         type: e.type,
      };
   }

   for (const p of entities.persons) {
      into.persons[p.id] = {
         id: p.id,
         givn: p.name,
         surn: '',
         knownAncestors: 0,
         knownDescendants: 0,
         // p.description ?
         // p.last_change ?
      };
   }

}

export function* fetchPersonDetailsFromServer(id: number) {
   const resp: Response = yield window.fetch('/data/persona/' + id);
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }
   const data: JSONPersonDetails = yield resp.json();
   let r: DetailsResult = {
      person: {...data.person,
               asserts: new AssertionList(
                  data.asserts.map(a => assertionFromJSON(a))),
              },
      persons: {},
      events: {},
      places: {},
   };
   setAssertionEntities(data, r);
   return r;
}

import * as d3Color from 'd3-color';
import { BasePerson, Person, PersonSet } from '../Store/Person';
import { Assertion, AssertionList, P2E, P2C, P2P, P2G } from '../Store/Assertion';
import { GenealogyEventSet } from '../Store/Event';
import { SourceSet } from '../Store/Source';
import { sourceFromJSON } from '../Server/Source';
import { PlaceSet } from '../Store/Place';
import { JSON } from '../Server/JSON';

export interface FetchPersonsResult {
   persons: PersonSet;
   events: GenealogyEventSet;
}

export function jsonPersonToPerson(
   json: JSON.Persons,
   styles: JSON.Style[],
): FetchPersonsResult {
   let persons: PersonSet = {};
   let events: GenealogyEventSet = {};
   for (const pid of Object.keys(json.persons)) {
      const jp: JSON.Person = json.persons[pid];
      const s: JSON.Style = styles[jp.style];
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

   const data: JSON.Persons = yield resp.json();
   return jsonPersonToPerson(data, [] /* styles */);
}

function p2eFromJSON(e: JSON.P2E) {
   return new P2E(
      e.surety /* surety */,
      e.researcher /* researcher */,
      e.rationale /* rationale */,
      e.disproved /* disproved */,
      e.last_change /* lastChanged */,
      e.p1.person /* personId */,
      e.p2.event /* eventId */,
      e.p2.role /* role */,
      e.source_id /* sourceId */
   );
}

function p2cFromJSON(c: JSON.P2C) {
   return new P2C(
      c.surety /* surety */,
      c.researcher /* researcher */,
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

function p2pFromJSON(a: JSON.P2P) {
   return new P2P(
      a.surety /* surety */,
      a.researcher /* researcher */,
      a.rationale /* rationale */,
      a.disproved /* disproved */,
      a.last_change /* astChanged */,
      a.p1.person /* person1Id */,
      a.p2.person /* person2Id */,
      a.source_id /* sourceId */,
   );
}

function p2gFromJSON(a: JSON.P2G) {
   return new P2G(
      a.surety /* surety */,
      a.researcher /* researcher */,
      a.rationale /* rationale */,
      a.disproved /* disproved */,
      a.last_change /* astChanged */,
      a.p1.person /* personId */,
      -1 /* groupId */,
      a.source_id /* sourceId */,
   );
}

function isP2E(a: JSON.Assertion): a is JSON.P2E {
   return (a as JSON.P2E).p1.person !== undefined &&
          (a as JSON.P2E).p2.event !== undefined;
}

function isP2C(a: JSON.Assertion): a is JSON.P2C {
   return (a as JSON.P2C).p1.person !== undefined &&
          (a as JSON.P2C).p2.char !== undefined;
}

function isP2P(a: JSON.Assertion): a is JSON.P2P {
   return (a as JSON.P2P).p1.person !== undefined &&
          (a as JSON.P2P).p2.person !== undefined;
}

export function assertionFromJSON(a: JSON.Assertion): Assertion {
   if (isP2E(a)) {
      return p2eFromJSON(a);
   } else if (isP2C(a)) {
      return p2cFromJSON(a);
   } else if (isP2P(a)) {
      return p2pFromJSON(a);
   } else {
      return p2gFromJSON(a as JSON.P2G);
   }
}

export interface AssertionEntitiesJSON {
   events: JSON.Event[];  // All events mentioned in the asserts
   persons: JSON.PersonForAssertion[];
   places: JSON.Place[];
   sources: JSON.Source[];
   researchers: JSON.Researcher[];
}

interface JSONPersonDetails extends AssertionEntitiesJSON {
   person: BasePerson;
   asserts: JSON.Assertion[];
}

export interface AssertionEntities {
   events: GenealogyEventSet; // All events seen in the result
   persons: PersonSet;
   places: PlaceSet;
   sources: SourceSet;
   researchers: {[key: number]: JSON.Researcher};
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

   for (const s of entities.sources) {
      into.sources[s.id] = sourceFromJSON(s);
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
      sources: {},
      researchers: {},
   };
   setAssertionEntities(data, r);
   return r;
}

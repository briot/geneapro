import * as d3Color from 'd3-color';
import { BasePerson, Person, PersonSet } from '../Store/Person';
import { Assertion, AssertionList, P2E, P2C, P2P, P2G } from '../Store/Assertion';
import { GenealogyEventSet } from '../Store/Event';
import { SourceSet } from '../Store/Source';
import { sourceFromJSON } from '../Server/Source';
import { PlaceSet } from '../Store/Place';
import * as JSON from '../Server/JSON';
import { ResearcherSet } from '../Store/Researcher';
import { PersonStyle, jsonStyleToStyle } from '../Store/Styles';

export interface FetchPersonsResult {
   persons: PersonSet;
}

interface IPersonaListRaw extends JSON.Persons {
   allstyles: {[index: number]: JSON.Style},
   styles: {[person: number]: number}
};

export function jsonPersonToPerson(
   p: JSON.Person,
   style: PersonStyle|undefined,
): Person {
   return {
      id: p.id,
      name: p.name,
      birthISODate: p.birthISODate,
      deathISODate: p.deathISODate,
      marriageISODate: p.marriageISODate,
      knownAncestors: 0,
      knownDescendants: 0,
      parents: p.parents,
      children: p.children,
      style: style,
   };
}

export function jsonPersonsToPerson(
   json: JSON.Persons,
   allStyles?: {[index: number]: JSON.Style},   // definition for styles
   styles?: {[pid: number]: number},   // person to style index
): FetchPersonsResult {

   let allS: {[id: number]: PersonStyle|undefined} = {};
   if (allStyles && styles) {
      for (const [id, s] of Object.entries(allStyles)) {
         allS[Number(id)] = jsonStyleToStyle(s);
      }
   }

   let persons: PersonSet = {};
   for (const jp of json.persons) {
      persons[jp.id] = jsonPersonToPerson(
         jp,
         styles ? allS[styles[jp.id]] : undefined /* style */,
      );
   }

   return {persons};
}

export function* fetchPersonsFromServer() {
   const resp: Response = yield window.fetch('/data/persona/list');
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }

   const raw: IPersonaListRaw = yield resp.json();
   return jsonPersonsToPerson(raw, raw.allstyles, raw.styles);
}

function p2eFromJSON(e: JSON.P2E) {
   return new P2E(
      e.id,
      e.surety /* surety */,
      e.researcher /* researcher */,
      e.rationale /* rationale */,
      e.disproved /* disproved */,
      new Date(e.last_change) /* lastChanged */,
      e.p1.person /* personId */,
      e.p2.event /* eventId */,
      e.p2.role /* role */,
      e.source_id /* sourceId */
   );
}

function p2cFromJSON(c: JSON.P2C) {
   return new P2C(
      c.id,
      c.surety /* surety */,
      c.researcher /* researcher */,
      c.rationale /* rationale */,
      c.disproved /* disproved */,
      new Date(c.last_change) /* lastChanged */,
      c.p1.person /* personId */,
      {
         date: c.p2.char.date,
         date_sort: c.p2.char.date_sort,
         name: c.p2.char.name,
         placeId: c.p2.char.place,
         parts: c.p2.parts,
         medias: c.p2.repr ? c.p2.repr.map(m => JSON.toMedia(m)) : undefined,
      } /* characteristic */,
      c.source_id /* sourceId */,
   );
}

function p2pFromJSON(a: JSON.P2P) {
   return new P2P(
      a.id,
      a.surety /* surety */,
      a.researcher /* researcher */,
      a.rationale /* rationale */,
      a.disproved /* disproved */,
      new Date(a.last_change) /* lastChanged */,
      a.p1.person /* person1Id */,
      a.p2.person /* person2Id */,
      a.type /* relation */,
      a.source_id /* sourceId */,
   );
}

function p2gFromJSON(a: JSON.P2G) {
   return new P2G(
      a.id,
      a.surety /* surety */,
      a.researcher /* researcher */,
      a.rationale /* rationale */,
      a.disproved /* disproved */,
      new Date(a.last_change) /* lastChanged */,
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
   events?: JSON.Event[];  // All events mentioned in the asserts
   persons?: JSON.Person[];
   places?: JSON.Place[];
   researchers?: JSON.Researcher[];
   sources?: JSON.Source[];
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
   researchers: ResearcherSet;
}

export interface DetailsResult extends AssertionEntities {
   person: Person;
}

export function setAssertionEntities(
   entities: AssertionEntitiesJSON,
   into: AssertionEntities,

) {
   if (entities.places) {
      for (const p of entities.places) {
         into.places[p.id] = {
            id: p.id,
            name: p.name,
            // p.date,
            // p.date_sort,
            // p.parent_place_id,
         };
      }
   }

   if (entities.events) {
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
   }

   if (entities.persons) {
      for (const p of entities.persons) {
         into.persons[p.id] = {
            id: p.id,
            name: p.name,
            knownAncestors: 0,
            knownDescendants: 0,
         };
      }
   }

   if (entities.sources) {
      for (const s of entities.sources) {
         into.sources[s.id] = sourceFromJSON(s);
      }
   }

   if (entities.researchers) {
      for (const r of entities.researchers) {
         into.researchers[r.id] = {name: r.name};
      }
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
               asserts: data.asserts ? new AssertionList(
                  data.asserts.map(a => assertionFromJSON(a))) :
                  undefined,
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

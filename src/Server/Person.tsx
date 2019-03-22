import { BasePerson, Person, PersonSet } from "../Store/Person";
import {
   Assertion,
   AssertionList,
   P2E,
   P2C,
   P2P,
   P2G
} from "../Store/Assertion";
import { GenealogyEventSet } from "../Store/Event";
import { SourceSet } from "../Store/Source";
import { sourceFromJSON } from "../Server/Source";
import { PlaceSet } from "../Store/Place";
import * as GP_JSON from "../Server/JSON";
import { ResearcherSet } from "../Store/Researcher";
import Style from "../Store/Styles";

export interface FetchPersonsResult {
   persons: PersonSet;
}

interface PersonaListRaw extends GP_JSON.Persons {
   allstyles: { [index: number]: GP_JSON.Style };
   styles: { [person: number]: number };
}

export function jsonPersonToPerson(
   p: GP_JSON.Person,
   style: Style | undefined
): Person {
   return {
      id: p.id,
      display_name: p.display_name,
      birthISODate: p.birthISODate,
      deathISODate: p.deathISODate,
      marriageISODate: p.marriageISODate,
      sex: p.sex,
      knownAncestors: 0,
      knownDescendants: 0,
      parents: p.parents,
      children: p.children,
      style: style
   };
}

function prepareStyles(
   allStyles?: { [index: number]: GP_JSON.Style }, // definition for styles
   styles?: { [pid: number]: number } // person to style index
) {
   let allS: { [id: number]: Style | undefined } = {};
   if (allStyles && styles) {
      for (const [id, s] of Object.entries(allStyles)) {
         allS[Number(id)] = new Style(s);
      }
   }
   return allS;
}

export function jsonPersonsToPerson(
   json: GP_JSON.Persons,
   allStyles?: { [index: number]: GP_JSON.Style }, // definition for styles
   styles?: { [pid: number]: number } // person to style index
): FetchPersonsResult {
   const allS = prepareStyles(allStyles, styles);
   let persons: PersonSet = {};
   for (const jp of json.persons) {
      persons[jp.id] = jsonPersonToPerson(
         jp,
         styles ? allS[styles[jp.id]] : undefined /* style */
      );
   }

   return { persons };
}

interface FetchPersonsParams {
   colors: GP_JSON.ColorSchemeId;
   limit?: number; // maximum number of persons to return
   offset?: number;
   filter?: string;
}
export function fetchPersonsFromServer(p: FetchPersonsParams): Promise<Person[]> {
   const url =
      `/data/persona/list?theme=${p.colors}` +
      (p.filter ? `&filter=${encodeURI(p.filter)}` : "") +
      (p.offset ? `&offset=${p.offset}` : "") +
      (p.limit ? `&limit=${p.limit}` : "");
   return window.fetch(url)
      .then((resp: Response) => resp.json())
      .then((raw: PersonaListRaw) => {
         const allS = prepareStyles(raw.allstyles, raw.styles);
         return raw.persons.map(jp => jsonPersonToPerson(
            jp,
            raw.styles ? allS[raw.styles[jp.id]] : undefined
         ));
      });
}

function p2eFromJSON(e: GP_JSON.P2E) {
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

function p2cFromJSON(c: GP_JSON.P2C) {
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
         medias: c.p2.repr ? c.p2.repr.map(m => GP_JSON.toMedia(m)) : undefined
      } /* characteristic */,
      c.source_id /* sourceId */
   );
}

function p2pFromJSON(a: GP_JSON.P2P) {
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
      a.source_id /* sourceId */
   );
}

function p2gFromJSON(a: GP_JSON.P2G) {
   return new P2G(
      a.id,
      a.surety /* surety */,
      a.researcher /* researcher */,
      a.rationale /* rationale */,
      a.disproved /* disproved */,
      new Date(a.last_change) /* lastChanged */,
      a.p1.person /* personId */,
      -1 /* groupId */,
      a.source_id /* sourceId */
   );
}

function isP2E(a: GP_JSON.Assertion): a is GP_JSON.P2E {
   return (
      (a as GP_JSON.P2E).p1.person !== undefined &&
      (a as GP_JSON.P2E).p2.event !== undefined
   );
}

function isP2C(a: GP_JSON.Assertion): a is GP_JSON.P2C {
   return (
      (a as GP_JSON.P2C).p1.person !== undefined &&
      (a as GP_JSON.P2C).p2.char !== undefined
   );
}

function isP2P(a: GP_JSON.Assertion): a is GP_JSON.P2P {
   return (
      (a as GP_JSON.P2P).p1.person !== undefined &&
      (a as GP_JSON.P2P).p2.person !== undefined
   );
}

export function assertionFromJSON(a: GP_JSON.Assertion): Assertion {
   if (isP2E(a)) {
      return p2eFromJSON(a);
   } else if (isP2C(a)) {
      return p2cFromJSON(a);
   } else if (isP2P(a)) {
      return p2pFromJSON(a);
   } else {
      return p2gFromJSON(a as GP_JSON.P2G);
   }
}

export interface AssertionEntitiesJSON {
   events?: GP_JSON.Event[]; // All events mentioned in the asserts
   persons?: GP_JSON.Person[];
   places?: GP_JSON.Place[];
   researchers?: GP_JSON.Researcher[];
   sources?: GP_JSON.Source[];
}

interface JSONPersonDetails extends AssertionEntitiesJSON {
   person: BasePerson;
   asserts: GP_JSON.Assertion[];
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
   into: AssertionEntities
) {
   if (entities.places) {
      for (const p of entities.places) {
         into.places[p.id] = {
            id: p.id,
            name: p.name
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
            type: e.type
         };
      }
   }

   if (entities.persons) {
      for (const p of entities.persons) {
         into.persons[p.id] = {
            id: p.id,
            display_name: p.display_name,
            knownAncestors: 0,
            knownDescendants: 0
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
         into.researchers[r.id] = { name: r.name };
      }
   }
}

export function* fetchPersonDetailsFromServer(id: number) {
   const resp: Response = yield window.fetch("/data/persona/" + id);
   if (resp.status !== 200) {
      throw new Error("Server returned an error");
   }
   const data: JSONPersonDetails = yield resp.json();
   let r: DetailsResult = {
      person: {
         ...data.person,
         asserts: data.asserts
            ? new AssertionList(data.asserts.map(a => assertionFromJSON(a)))
            : undefined
      },
      persons: {},
      events: {},
      places: {},
      sources: {},
      researchers: {}
   };
   setAssertionEntities(data, r);
   return r;
}

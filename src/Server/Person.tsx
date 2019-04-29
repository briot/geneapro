import * as React from "react";
import { BasePerson, Person, PersonSet } from "../Store/Person";
import {
   Assertion,
   P2E,
   P2C,
   P2P,
   P2G
} from "../Store/Assertion";
import { GenealogyEventSet } from "../Store/Event";
import { SourceSet } from "../Store/Source";
import { sourceFromJSON } from "../Server/Source";
import { Place, PlaceSet } from "../Store/Place";
import * as GP_JSON from "../Server/JSON";
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
   colors?: GP_JSON.ColorSchemeId;
   limit?: number; // maximum number of persons to return
   offset?: number;
   filter?: string;
   ids?: number[];
}
export function fetchPersonsFromServer(p: FetchPersonsParams): Promise<Person[]> {
   const url =
      `/data/persona/list?theme=${p.colors || -1}` +
      (p.filter ? `&filter=${encodeURI(p.filter)}` : "") +
      (p.ids ? `&ids=${p.ids.join(',')}` : "") +
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

/**
 * Retrieve the total number of persons matching the filter
 */
export const fetchPersonsCount = (p: {filter: string}): Promise<number> =>
   fetch(`/data/persona/count?filter=${encodeURI(p.filter)}`)
   .then((r: Response) => r.json());

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
      return new P2E(a);
   } else if (isP2C(a)) {
      return new P2C(a);
   } else if (isP2P(a)) {
      return new P2P(a);
   } else {
      return new P2G(a as GP_JSON.P2G);
   }
}

export interface AssertionEntitiesJSON {
   events?: GP_JSON.Event[]; // All events mentioned in the asserts
   persons?: GP_JSON.Person[];
   places?: Place[];
   sources?: GP_JSON.Source[];
   asserts: GP_JSON.Assertion[];
}

interface JSONPersonDetails {
   person: BasePerson;
}

export interface AssertionEntities {
   events: GenealogyEventSet; // All events seen in the result
   persons: PersonSet;
   places: PlaceSet;
   sources: SourceSet;
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
         into.places[p.id] = p;
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
}

function mergeSet<T extends {id: number}>(
   set1: {[id: number]: T},
   set2: {[id: number]: T}
) {
   let result = { ...set1 };
   for (const [id, p] of Object.entries(set2)) {
      const n = Number(id);
      result[n] = { ...result[n], ...p };
   }
   return result;
}

export function mergeAssertionEntities(
   e1: AssertionEntities, e2: AssertionEntities
): AssertionEntities {
   return {
      events: mergeSet(e1.events, e2.events),
      places: mergeSet(e1.places, e2.places ),
      sources: mergeSet(e1.sources, e2.sources),
      persons: mergeSet(e1.persons, e2.persons)
   };
}

/**
 * Fetch details about a specific person
 */
export const usePerson = (id: number): Person|undefined => {
   const [person, setPerson] = React.useState<Person|undefined>(undefined);
   React.useEffect(
      () => {
         fetch(`/data/persona/${id}`)
            .then(r => r.json())
            .then(setPerson, () => setPerson(undefined));
      },
      [id]
   );
   return person;
};

/**
 * Fetch the number of assertions known for a given person
 */
export const usePersonAssertsCount = (id: number) => {
   const [count, setCount] = React.useState(0);
   React.useEffect(
      () => {
         fetch(`/data/persona/${id}/asserts/count`)
            .then(r => r.json())
            .then(setCount);
      },
      [id]
   );
   return count;
};

/**
 * Fetch a subset of the asserts for a given person
 */
export const fetchPersonAsserts = (p: {
   id: number; limit?: number; offset?: number;
}): Promise<AssertionEntitiesJSON> => {
   return fetch(`/data/persona/${p.id}/asserts?` +
      (p.limit ? `limit=${p.limit}&` : '') +
      (p.offset ? `offset=${p.offset}&` : '')
   ).then(r => r.json());
};

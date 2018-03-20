import { PlaceSet } from '../Store/Place';
import { Assertion } from '../Store/Assertion';
import { JSONAssertion, AssertionEntities, AssertionEntitiesJSON,
         assertionFromJSON,
         setAssertionEntities } from '../Server/Person';

export interface JSONPlace {
   id: number;
   name: string;
   date: string|null;
   date_sort: string|null;
   parent_place_id: number;
}

export interface FetchPlacesResult {
   places: PlaceSet;
}

export function* fetchPlacesFromServer() {
   const resp: Response = yield window.fetch('/data/places/list');
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }

   const data: JSONPlace[] = yield resp.json();
   let places: PlaceSet = {};
   for (const p of data) {
      places[p.id] = {
         id: p.id,
         name: p.name,
      };
   }
   return {places};
}

export interface PlaceDetails extends AssertionEntities {
   asserts: Assertion[];
}

interface JSONResult extends AssertionEntitiesJSON {
   asserts: JSONAssertion[];
}

export function* fetchPlaceFromServer(id: number) {
   const resp: Response = yield window.fetch('/data/place/' + id);
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }

   const data: JSONResult = yield resp.json();

   let result: PlaceDetails = {
      asserts: data.asserts.map(a => assertionFromJSON(a)),
      events: {},
      persons: {},
      places: {},
   };
   setAssertionEntities(data, result);

   if (result.places[id]) {
      result.places[id].asserts = result.asserts;
   }

   return result;
}

import { PlaceSet } from "../Store/Place";
import { AssertionList } from "../Store/Assertion";
import {
   AssertionEntities,
   AssertionEntitiesJSON,
   assertionFromJSON,
   setAssertionEntities
} from "../Server/Person";
import * as JSON from "../Server/JSON";

export interface FetchPlacesResult {
   places: PlaceSet;
}

export function* fetchPlacesFromServer() {
   const resp: Response = yield window.fetch("/data/places/list");
   if (resp.status !== 200) {
      throw new Error("Server returned an error");
   }

   const data: JSON.Place[] = yield resp.json();
   let places: PlaceSet = {};
   for (const p of data) {
      places[p.id] = {
         id: p.id,
         name: p.name
      };
   }
   return { places };
}

export interface PlaceDetails extends AssertionEntities {
   asserts: AssertionList;
}

interface JSONResult extends AssertionEntitiesJSON {
   asserts: JSON.Assertion[];
}

export function* fetchPlaceFromServer(id: number) {
   const resp: Response = yield window.fetch("/data/place/" + id);
   if (resp.status !== 200) {
      throw new Error("Server returned an error");
   }

   const data: JSONResult = yield resp.json();

   let result: PlaceDetails = {
      asserts: new AssertionList(data.asserts.map(a => assertionFromJSON(a))),
      events: {},
      persons: {},
      places: {},
      sources: {},
      researchers: {}
   };
   setAssertionEntities(data, result);

   if (result.places[id]) {
      result.places[id].asserts = result.asserts;
   }

   return result;
}

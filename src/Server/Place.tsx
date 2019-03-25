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

interface FetchPlacesFromServerArgs {
   limit?: number;
   offset?: number;
   filter?: string;
   ids?: number[];
}

export function fetchPlacesFromServer(
   p: FetchPlacesFromServerArgs
): Promise<JSON.Place[]> {
   const url =
      '/data/places/list?' +
      (p.filter ? `&filter=${encodeURI(p.filter)}` : '') +
      (p.ids ? `&ids=${p.ids.join(',')}` : '') +
      (p.offset ? `&offset=${p.offset}` : '') +
      (p.limit ? `&limit=${p.limit}` : '');
   return window.fetch(url)
      .then((resp: Response) => resp.json());
}

/**
 * Fetch the number of places matching the filter
 */
export const fetchPlacesCount = (p: {filter: string}): Promise<number> =>
   fetch(`/data/places/count?filter=${encodeURI(p.filter)}`)
   .then((r: Response) => r.json());

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

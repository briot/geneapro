import * as React from "react";
import { Place, PlaceSet } from "../Store/Place";
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
): Promise<Place[]> {
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

/**
 * Fetch details about a specific place
 */
export const usePlace = (id: number): Place|undefined => {
   const [place, setPlace] = React.useState<Place|undefined>(undefined);
   React.useEffect(
      () => {
         window.fetch(`/data/places/${id}`)
            .then(r => r.json())
            .then(setPlace, () => setPlace(undefined));
      },
      [id]
   );
   return place;
};

/**
 * Compute the number of assertions known for the given place
 */
export const usePlaceAssertsCount = (id: number|undefined) => {
   const [count, setCount] = React.useState(0);
   React.useEffect(
      () => {
         if (id !== undefined) {
            fetch(`/data/places/${id}/asserts/count`)
               .then(r => r.json())
               .then(setCount);
         }
      },
      [id]
   );
   return count;
}

/**
 * Fetch asserts from the server
 */
export function fetchPlaceAsserts(p: {
   id: number; limit?: number; offset?: number;
}): Promise<AssertionEntitiesJSON> {
   return fetch(
      `/data/places/${p.id}/asserts?` +
      (p.limit ? `limit=${p.limit}&` : '') +
      (p.offset !== undefined ? `offset=${p.offset}&` : '')
   ).then(r => r.json());
}

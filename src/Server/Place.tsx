import { PlaceSet } from '../Store/Place';

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

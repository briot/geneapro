import { jsonPersonsToPerson } from "../Server/Person";
import { ChildrenAndParentsSet } from "../Store/Pedigree";
import { FetchPedigreeResult } from "../Store/Sagas";
import * as GP_JSON from "./JSON";

/**
 * Sent back by the server
 */

interface JSONPedigree {
   decujus: number; // main_id for the request person, in case the user
   // provided the id of a base persona instead
   persons: GP_JSON.Person[];
   layout: ChildrenAndParentsSet;
   allstyles?: { [id: number]: GP_JSON.Style }; // all used styles
   styles?: { [person: number]: number }; // person-to-style mapping
}

/**
 * get pedigree information for `decujus`, up to a number of
 * generations.
 */
export function* fetchPedigreeFromServer(
   decujus: number,
   ancestors: number,
   descendants: number,
   theme: GP_JSON.ColorSchemeId
) {
   const resp: Response = yield window.fetch(
      `/data/pedigree/${decujus}?gens=${ancestors +
         1}&descendant_gens=${descendants}&theme=${theme}`
   );
   if (resp.status !== 200) {
      throw new Error("Server returned an error");
   }

   const data: JSONPedigree = yield resp.json();
   const result: FetchPedigreeResult = {
      ...jsonPersonsToPerson(data, data.allstyles, data.styles),
      events: {},
      layout: data.layout
   };

   result.persons[data.decujus].knownAncestors = ancestors;
   result.persons[data.decujus].knownDescendants = descendants;
   return result;
}

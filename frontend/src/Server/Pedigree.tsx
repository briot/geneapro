import { jsonPersonsToPerson } from "../Server/Person";
import { ChildrenAndParentsSet } from "../Store/Pedigree";
import * as GP_JSON from "./JSON";
import { PersonSet } from "../Store/Person";
import { GenealogyEventSet } from "../Store/Event";

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

export interface FetchPedigreeParams {
   decujus: number;
   ancestors: number;
   descendants: number;
   theme: GP_JSON.ColorSchemeId;
}
export interface FetchPedigreeResult {
   persons: PersonSet;
   events: GenealogyEventSet;
   layout: ChildrenAndParentsSet;
}

/**
 * get pedigree information for `decujus`, up to a number of
 * generations.
 */
export function fetchPedigreeFromServer(p: FetchPedigreeParams) {
   return window.fetch(
      `/data/pedigree/${p.decujus}?gens=${p.ancestors + 1}` +
      `&descendant_gens=${p.descendants}&theme=${p.theme}`
   ).then((resp: Response) => {
      if (!resp.ok) {
         throw new Error("Server returned an error");
      }
      return resp.json();
   }).then((data: JSONPedigree) => {
      const result: FetchPedigreeResult = {
         ...jsonPersonsToPerson(data, data.allstyles, data.styles),
         events: {},
         layout: data.layout
      };
      result.persons[data.decujus].knownAncestors = p.ancestors;
      result.persons[data.decujus].knownDescendants = p.descendants;
      return result;
   });
}

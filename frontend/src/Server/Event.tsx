import { AssertionList } from "../Store/Assertion";
import {
   AssertionEntities,
   AssertionEntitiesJSON,
   setAssertionEntities,
   assertionFromJSON
} from "../Server/Person";

export interface EventDetails extends AssertionEntities {
   id: number;
   asserts: AssertionList;
}

interface JSONEventDetails extends AssertionEntitiesJSON {
   id: number;
}

export interface FetchEventDetailsParams {
   id: number;
}

export function fetchEventFromServer(p: FetchEventDetailsParams) {
   return window.fetch("/data/event/" + p.id
   ).then((resp: Response) => {
      if (!resp.ok) {
         throw new Error("Server returned an error");
      }
      return resp.json();
   }).then((data: JSONEventDetails) => {
      const result: EventDetails = {
         id: data.id,
         asserts: new AssertionList(data.asserts.map(a => assertionFromJSON(a))),
         persons: {},
         events: {},
         places: {},
         sources: {},
      };
      setAssertionEntities(data, result /* into */);
      return result;
   });
}

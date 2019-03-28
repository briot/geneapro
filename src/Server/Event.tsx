import * as JSON from "../Server/JSON";
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
   asserts: JSON.Assertion[];
}

export function* fetchEventFromServer(id: number) {
   const resp: Response = yield window.fetch("/data/event/" + id);
   if (resp.status !== 200) {
      throw new Error("Server returned an error");
   }

   const data: JSONEventDetails = yield resp.json();
   let result: EventDetails = {
      id: data.id,
      asserts: new AssertionList(data.asserts.map(a => assertionFromJSON(a))),
      persons: {},
      events: {},
      places: {},
      sources: {},
   };
   setAssertionEntities(data, result /* into */);
   return result;
}

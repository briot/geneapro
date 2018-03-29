import { JSON } from '../Server/JSON';
import { Assertion } from '../Store/Assertion';
import { AssertionEntities, AssertionEntitiesJSON,
         setAssertionEntities, assertionFromJSON } from '../Server/Person';

export interface EventDetails extends AssertionEntities {
   id: number;
   asserts: Assertion[];
}

// interface PartialP2E {   // should be JSONAssertion, need change in server
//    disproved: boolean;
//    rationale: string;
//    role_name: string;
//    source: {
//       id: number;
//    };
//    surety: number;
//    person: {
//       name: string;
//       id: number;
//    };
// }

interface JSONEventDetails extends AssertionEntitiesJSON {
   id: number;
   asserts: JSON.Assertion[];
}

export function* fetchEventFromServer(id: number) {
   const resp: Response = yield window.fetch('/data/event/' + id);
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }

   const data: JSONEventDetails = yield resp.json();
   let result: EventDetails = {
      id: data.id,
      asserts: data.asserts.map(a => assertionFromJSON(a)),
      persons: {},
      events: {},
      places: {},
      sources: {},
      researchers: {},
   };
   setAssertionEntities(data, result /* into */);
   return result;
}

import { PersonInEvent } from '../Store/Event';

export interface EventDetails {
   id: number;
   persons: PersonInEvent[];
}

interface PartialP2E {   // should be JSONAssertion, need change in server
   disproved: boolean;
   rationale: string;
   role_name: string;
   source: {
      id: number;
   };
   surety: number;
   person: {
      name: string;
      id: number;
   };
}

interface JSONEvent {
   p2e: PartialP2E[];
}

export function* fetchEventFromServer(id: number) {
   const resp: Response = yield window.fetch('/data/event/' + id);
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }

   const data: JSONEvent = yield resp.json();
   const result: EventDetails = {
      id,
      persons: data.p2e.map(
         (p: PartialP2E) => ({
            id: p.person.id,
            name: p.person.name,
            rationale: p.rationale,
            surety: p.surety,
            sourceId: p.source.id,
            role: p.role_name,
         })),
   };
   return result;
}

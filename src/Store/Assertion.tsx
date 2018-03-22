import { GenealogyEventSet } from '../Store/Event';

export interface CharacteristicPart {
   name: string;
   value: string;
}

export interface Characteristic {
   date?: string;
   date_sort?: string;
   name: string;
   placeId?: number;  // points to a Place in the state
   parts: CharacteristicPart[];
}

export class Assertion {
   constructor(
      public surety:      number,
      public researcher:  string,
      public rationale:   string,
      public disproved:   boolean,
      public lastChanged: string,
      public sourceId?:   number   // points to a Source in the state
   ) {
   }

   /**
    * Return the sort order for timelines. The format of the date should
    * be ISO: yyyy-mm-dd
    */
   getSortDate(events: GenealogyEventSet): string|undefined {
      return undefined;
   }
}

export class P2P extends Assertion {
   constructor(
      public surety:      number,
      public researcher:  string,
      public rationale:   string,
      public disproved:   boolean,
      public lastChanged: string,
      public person1Id:   number,  // points to a Persona in the state
      public person2Id:   number,  // points to a Persona in the state
      public sourceId?:   number   // points to a Source in the state
   )  {
      super(surety, researcher, rationale, disproved, lastChanged, sourceId);
   }
}

export class P2G extends Assertion {
   constructor(
      public surety:      number,
      public researcher:  string,
      public rationale:   string,
      public disproved:   boolean,
      public lastChanged: string,
      public personId:    number,  // points to a Persona in the state
      public groupId:     number,  // points to a Group in the state
      public sourceId?:   number   // points to a Source in the state
   )  {
      super(surety, researcher, rationale, disproved, lastChanged, sourceId);
   }
}

export class P2C extends Assertion {
   constructor(
      public surety:         number,
      public researcher:     string,
      public rationale:      string,
      public disproved:      boolean,
      public lastChanged:    string,
      public personId:       number,  // points to a Persona in the state
      public characteristic: Characteristic,
      public sourceId?:      number   // points to a Source in the state
   )  {
      super(surety, researcher, rationale, disproved, lastChanged, sourceId);
   }

   /** overriding */
   getSortDate(events: GenealogyEventSet): string|undefined {
      return this.characteristic.date_sort;
   }
}

export class P2E extends Assertion {
   constructor(
      public surety:        number,
      public researcher:    string,
      public rationale:     string,
      public disproved:     boolean,
      public lastChanged:   string,
      public personId:      number,  // points to a Persona in the state
      public eventId:       number,  // points to a GenealogyEvent in the state
      public role:          string,
      public sourceId?:     number   // points to a Source in the state
   )  {
      super(surety, researcher, rationale, disproved, lastChanged, sourceId);
   }

   /** overriding */
   getSortDate(events: GenealogyEventSet): string|undefined {
      const e = events[this.eventId];
      return e ? e.date_sort : undefined;
   }
}

export class AssertionList {
   constructor(private asserts: Assertion[]) {
   }

   get(): Assertion[] {
      return this.asserts;
   }

   sortByDate(events: GenealogyEventSet) {
      const items: {d: string|undefined, a: Assertion}[] =
         this.asserts.map(a => ({d: a.getSortDate(events), a: a}));
      items.sort((a1, a2) => (
         !a1.d ? -1 : !a2.d ? 1 : a1.d!.localeCompare(a2.d!)));
      this.asserts = items.map(i => i.a);
   }
}

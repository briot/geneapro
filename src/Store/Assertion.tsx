import { GenealogyEventSet } from '../Store/Event';
import { SourceMedia } from '../Store/Source';

export interface CharacteristicPart {
   name: string;
   value: string;
}

export interface Characteristic {
   date?: string;
   date_sort?: string|null;
   name: string;
   placeId?: number;  // points to a Place in the state
   parts: CharacteristicPart[];

   medias?: SourceMedia[];  // Only set when name == "image"
}

export abstract class Assertion {
   constructor(
      public surety:      number,
      public researcher:  number,  // xref
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
   getSortDate(events: GenealogyEventSet): string|null {
      return null;
   }

   /**
    * Return a key to use when sorting assertions. This is the secondary key
    * in timelines, where the dates have been checked first
    */
   abstract getSortKey(events: GenealogyEventSet): string;

}

export class P2P extends Assertion {
   constructor(
      public surety:      number,
      public researcher:  number,  // xref
      public rationale:   string,
      public disproved:   boolean,
      public lastChanged: string,
      public person1Id:   number,  // points to a Persona in the state
      public person2Id:   number,  // points to a Persona in the state
      public sourceId?:   number   // points to a Source in the state
   )  {
      super(surety, researcher, rationale, disproved, lastChanged, sourceId);
   }

   /** overriding */
   getSortKey(_: GenealogyEventSet): string {
      return 'same as';
   }
}

export class P2G extends Assertion {
   constructor(
      public surety:      number,
      public researcher:  number,  // xref
      public rationale:   string,
      public disproved:   boolean,
      public lastChanged: string,
      public personId:    number,  // points to a Persona in the state
      public groupId:     number,  // points to a Group in the state
      public sourceId?:   number   // points to a Source in the state
   )  {
      super(surety, researcher, rationale, disproved, lastChanged, sourceId);
   }

   /** overriding */
   getSortKey(_: GenealogyEventSet): string {
      return 'group';
   }
}

export class P2C extends Assertion {
   constructor(
      public surety:         number,
      public researcher:     number,  // xref
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
   getSortDate(_: GenealogyEventSet): string|null {
      return this.characteristic.date_sort || null;
   }

   /** overriding */
   getSortKey(_: GenealogyEventSet): string {
      return this.characteristic.name;
   }
}

export class P2E extends Assertion {
   constructor(
      public surety:        number,
      public researcher:    number,  // xref
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
   getSortDate(events: GenealogyEventSet): string|null {
      const e = events[this.eventId];
      return e ? e.date_sort || null : null;
   }

   /** overriding */
   getSortKey(events: GenealogyEventSet): string {
      const e = events[this.eventId];
      return e && e.type ? e.type.name : '';
   }
}

export class AssertionList {
   constructor(private asserts: Assertion[]) {
   }

   get(): Assertion[] {
      return this.asserts;
   }

   sortByDate(events: GenealogyEventSet) {
      this.asserts.sort((a, b) => {
         const da = a.getSortDate(events);
         const db = b.getSortDate(events);
         if (!da) {
            if (db) {
               return -1;
            }
            const ka = a.getSortKey(events);
            const kb = b.getSortKey(events);
            return ka.localeCompare(kb);
         } else if (!db) {
            return 1;
         } else {
            return da.localeCompare(db);
         }
      });

      // const items: {d: string|undefined, a: Assertion}[] =
      //    this.asserts.map(a => ({d: a.getSortDate(events), a: a}));
      // items.sort((a1, a2) => (
      //    !a1.d ? -1 : !a2.d ? 1 : a1.d!.localeCompare(a2.d!)));
      // this.asserts = items.map(i => i.a);
   }
}

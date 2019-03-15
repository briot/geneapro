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
   public constructor(
      public id:          number,
      public surety:      number,
      public researcher:  number,  // xref
      public rationale:   string,
      public disproved:   boolean,
      public lastChanged: Date,
      public sourceId?:   number   // points to a Source in the state
   ) {
   }

   /**
    * Return the sort order for timelines. The format of the date should
    * be ISO: yyyy-mm-dd
    */
   public getSortDate(events: GenealogyEventSet): string|null { // eslint-disable-line @typescript-eslint/no-unused-vars
      return null;
   }

   /**
    * Return a key to use when sorting assertions. This is the secondary key
    * in timelines, where the dates have been checked first
    */
   public abstract getSortKey(events: GenealogyEventSet): string;

}

export class P2P extends Assertion {
   public constructor(
      public id:          number,
      public surety:      number,
      public researcher:  number,  // xref
      public rationale:   string,
      public disproved:   boolean,
      public lastChanged: Date,
      public person1Id:   number,  // points to a Persona in the state
      public person2Id:   number,  // points to a Persona in the state
      public relation:    string,  // type of relationship
      public sourceId?:   number   // points to a Source in the state
   )  {
      super(id, surety, researcher, rationale, disproved, lastChanged, sourceId);
   }

   /** overriding */
   public getSortKey(): string {
      return 'same as';
   }
}

export class P2G extends Assertion {
   public constructor(
      public id:          number,
      public surety:      number,
      public researcher:  number,  // xref
      public rationale:   string,
      public disproved:   boolean,
      public lastChanged: Date,
      public personId:    number,  // points to a Persona in the state
      public groupId:     number,  // points to a Group in the state
      public sourceId?:   number   // points to a Source in the state
   )  {
      super(id, surety, researcher, rationale, disproved, lastChanged, sourceId);
   }

   /** overriding */
   public getSortKey(): string {
      return 'group';
   }
}

export class P2C extends Assertion {
   public constructor(
      public id:             number,
      public surety:         number,
      public researcher:     number,  // xref
      public rationale:      string,
      public disproved:      boolean,
      public lastChanged:    Date,
      public personId:       number,  // points to a Persona in the state
      public characteristic: Characteristic,
      public sourceId?:      number   // points to a Source in the state
   )  {
      super(id, surety, researcher, rationale, disproved, lastChanged, sourceId);
   }

   /** overriding */
   public getSortDate(): string|null {
      return this.characteristic.date_sort || null;
   }

   /** overriding */
   public getSortKey(): string {
      return this.characteristic.name;
   }
}

export class P2E extends Assertion {
   public constructor(
      public id:          number,
      public surety:        number,
      public researcher:    number,  // xref
      public rationale:     string,
      public disproved:     boolean,
      public lastChanged:   Date,
      public personId:      number,  // points to a Persona in the state
      public eventId:       number,  // points to a GenealogyEvent in the state
      public role:          string,
      public sourceId?:     number   // points to a Source in the state
   )  {
      super(id, surety, researcher, rationale, disproved, lastChanged, sourceId);
   }

   /** overriding */
   public getSortDate(events: GenealogyEventSet): string|null {
      const e = events[this.eventId];
      return e ? e.date_sort || null : null;
   }

   /** overriding */
   public getSortKey(events: GenealogyEventSet): string {
      const e = events[this.eventId];
      return e && e.type ? e.type.name : '';
   }
}

export class AssertionList {
   public constructor(private asserts: Assertion[]) {
   }

   public get(): Assertion[] {
      return this.asserts;
   }

   public sortStrings(s1: string|null, s2: string|null): number {
      return !s1 ? (!s2 ? 0 : -1) :
             !s2 ?  1 :
             s1.localeCompare(s2);
   }

   public sortByDate(events: GenealogyEventSet) {
      this.asserts.sort((a, b) => {
         let result = this.sortStrings(
            a.getSortDate(events), b.getSortDate(events));
         if (result === 0) {
            result = this.sortStrings(
               a.getSortKey(events), b.getSortKey(events));
         }
         if (result === 0) {
            //  Keep stable sort
            result = a.id - b.id;
         }
         return result;
      });
   }
}

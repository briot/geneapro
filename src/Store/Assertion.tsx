import { GenealogyEventSet } from "../Store/Event";
import * as GP_JSON from '../Server/JSON';

export interface Characteristic extends GP_JSON.Characteristic {
   parts: GP_JSON.CharacteristicPart[];
   medias?: GP_JSON.SourceRepr[]; // Only set when name == "image"
}

export abstract class Assertion {
   public id: number;
   public surety: number;
   public researcher: number; // points to researcher
   public rationale: string;
   public disproved: boolean;
   public lastChanged: Date;
   public sourceId: number; // points to a Source in the state

   public constructor(a: GP_JSON.Assertion) {
      this.id = a.id;
      this.disproved = a.disproved;
      this.rationale = a.rationale;
      this.lastChanged = new Date(a.last_change);
      this.sourceId = a.source_id;
      this.surety = a.surety;
      this.researcher = a.researcher;
   }

   /**
    * Return the sort order for timelines. The format of the date should
    * be ISO: yyyy-mm-dd
    */
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   public getSortDate(events: GenealogyEventSet): string | null {
      return null;
   }

   /**
    * Return a key to use when sorting assertions. This is the secondary key
    * in timelines, where the dates have been checked first
    */
   public abstract getSortKey(events: GenealogyEventSet): string;
}

export class P2P extends Assertion {
   public person1Id: number; // points to a Persona in the state
   public person2Id: number; // points to a Persona in the state
   public relation: number;  // points to P2P_Type

   public constructor(a: GP_JSON.P2P) {
      super(a);
      this.person1Id = a.p1.person;
      this.person2Id = a.p2.person;
      this.relation = a.type;
   }

   /** overriding */
   public getSortKey(): string {
      return "same as";
   }
}

export class P2G extends Assertion {
   public personId: number; // points to a Persona in the state
   public groupId: number; // points to a Group in the state
   public role: number

   public constructor(a: GP_JSON.P2G) {
      super(a);
      this.personId = a.p1.person;
      this.groupId = a.p2.group;
      this.role = a.p2.role;
   }

   /** overriding */
   public getSortKey(): string {
      return "group";
   }
}

export class P2C extends Assertion {
   public personId: number; // points to a Persona in the state
   public characteristic: Characteristic;

   public constructor(a: GP_JSON.P2C) {
      super(a);
      this.personId = a.p1.person;
      this.characteristic = {
         ...a.p2.char,
         parts: a.p2.parts,
         medias: a.p2.repr,
      };
   }

   /** overriding */
   public getSortDate(): string | null {
      return this.characteristic.date_sort || null;
   }

   /** overriding */
   public getSortKey(): string {
      return this.characteristic.name;
   }
}

export class P2E extends Assertion {
   public personId: number; // points to a Persona in the state
   public eventId: number; // points to a GenealogyEvent in the state
   public role: number;    // points to EventTypeRole in the state

   public constructor(a: GP_JSON.P2E) {
      super(a);
      this.personId = a.p1.person;
      this.eventId = a.p2.event;
      this.role = a.p2.role;
   }

   /** overriding */
   public getSortDate(events: GenealogyEventSet): string | null {
      const e = events[this.eventId];
      return e ? e.date_sort || null : null;
   }

   /** overriding */
   public getSortKey(events: GenealogyEventSet): string {
      const e = events[this.eventId];
      return e && e.type ? e.type.name : "";
   }
}

export class AssertionList {
   public constructor(private asserts: Assertion[]) {}

   public get(): Assertion[] {
      return this.asserts;
   }

   public sortStrings(s1: string | null, s2: string | null): number {
      return !s1 ? (!s2 ? 0 : -1) : !s2 ? 1 : s1.localeCompare(s2);
   }

   public sortByDate(events: GenealogyEventSet) {
      this.asserts.sort((a, b) => {
         let result = this.sortStrings(
            a.getSortDate(events),
            b.getSortDate(events)
         );
         if (result === 0) {
            result = this.sortStrings(
               a.getSortKey(events),
               b.getSortKey(events)
            );
         }
         if (result === 0) {
            //  Keep stable sort
            result = a.id - b.id;
         }
         return result;
      });
   }
}

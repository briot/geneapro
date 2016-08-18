import {IPerson, IEvent, IGroup, IResearcher, ICharacteristic, ICharacteristicPart} from './basetypes';

export interface IAssertionSubjectFromServer {
   event     ?: IEvent;
   person    ?: IPerson;
   group     ?: IGroup;
   role      ?: string;   // for event or group
   char      ?: ICharacteristic;
   parts     ?: ICharacteristicPart[];  // for characteristic
}
export interface IAssertionFromServer {
   // event ?: IEvent;   // ??? should be removed
   disproved   : boolean;
   rationale   : string;
   researcher  : IResearcher;
   last_change : Date,
   source_id   : number;
   surety      : number;  // SuretyScheme
   p1          : IAssertionSubjectFromServer;
   p2          : IAssertionSubjectFromServer;
}

enum AssertSubjectKind {
   UNKNOWN = 0,   // must be 0
   PERSON = 1,    // exact values are used in the templates
   EVENT = 2,
   CHAR = 3,
   GROUP = 4
}

/******************************************
 * Assert subjects
 ******************************************/

export abstract class AssertSubject {
   constructor(public kind = AssertSubjectKind.UNKNOWN,
               public name = '') {
   }

   /**
    * Name of the group to use in the <select> box
    */
   group() {
      switch(this.kind) {
         case AssertSubjectKind.UNKNOWN: return '';
         case AssertSubjectKind.PERSON:  return 'Persons';
         case AssertSubjectKind.EVENT:   return 'Events';
         case AssertSubjectKind.GROUP:   return 'Groups';
         case AssertSubjectKind.CHAR:    return 'Characteristics';
      }
   }

   /**
    * Build a subject from the server's response
    */
   static buildFromServer(s : IAssertionSubjectFromServer) : AssertSubject {
      if (s.person) {
         return new AssertSubjectPerson(s.person);
      } else if (s.event) {
         return new AssertSubjectEvent(s.event, s.role);
      } else if (s.group) {
         return new AssertSubjectGroup(s.group, s.role);
      }
   }
}

export class AssertSubjectPerson extends AssertSubject {
   constructor(public person : IPerson,
               name ?: string)
   {
      super(AssertSubjectKind.PERSON, name || person.name + ' (' + person.id + ')');
   }
}

export class AssertSubjectEvent extends AssertSubject {
   constructor(public event : IEvent,
               public role  : string = '',
               name ?: string)
   {
      super(AssertSubjectKind.EVENT,
            name || (event.name || event.type.name) + ' (' + event.id + ')');
   }
}

export class AssertSubjectGroup extends AssertSubject {
   constructor(public gr    : IGroup,
               public role  : string = '',
               name ?: string)
   {
      super(AssertSubjectKind.GROUP, name || gr.name + ' (' + gr.id + ')');
   }
}

export class AssertSubjectChar extends AssertSubject {
   constructor(public char : ICharacteristic,
               public parts : ICharacteristicPart[],
               name ?: string)
   {
      super(AssertSubjectKind.CHAR, name);
   }
}

// type AssertSubject = AssertSubjectPerson |
//                      AssertSubjectEvent |
//                      AssertSubjectGroup |
//                      AssertSubjectChar;

/**
 * Various user-defined type guards.
 * They make the user of AssertSubject more convenient, since we can then
 * write:
 *     if (isPerson(s)) {
 *         s.person = ...    // no need for additional cast
 *     }
 */
function isPerson(s : AssertSubject) : s is AssertSubjectPerson {
   return s.kind == AssertSubjectKind.PERSON;
}
function isEvent(s : AssertSubject) : s is AssertSubjectEvent {
   return s.kind == AssertSubjectKind.EVENT;
}
function isGroup(s : AssertSubject) : s is AssertSubjectGroup {
   return s.kind == AssertSubjectKind.GROUP;
}
function isChar(s : AssertSubject) : s is AssertSubjectChar {
   return s.kind == AssertSubjectKind.CHAR;
}

/***************************************************************************
 * One specific assertion
 */

export class Assertion {
   disproved   : boolean;
   rationale   : string;
   researcher  : IResearcher;
   last_change : Date;
   source_id   : number;
   surety      : number;  // SuretyScheme
   p1          : AssertSubject;
   p2          : AssertSubject;

   $open    : boolean = false;  // whether to show the details of the event
   $details : any;      // extra details
   $edited  : boolean = false;   // whether this is being edited

   /**
    * Convert a server's response
    */
   static buildFromServer(assert : IAssertionFromServer) {
      let r = new Assertion;
      r.disproved = assert.disproved;
      r.rationale = assert.rationale;
      r.researcher = assert.researcher;
      r.last_change = assert.last_change;
      r.source_id = assert.source_id;
      r.surety = assert.surety;
      r.p1 = AssertSubject.buildFromServer(assert.p1);
      r.p2 = AssertSubject.buildFromServer(assert.p2);
      return r;
   }
}

/***************************************************************************
 * This class represents a list of assertions (as read from the server)
 * with extra query capabilities
 */

export class AssertionList {
   allPersons : AssertSubjectPerson[];
   allEvents  : AssertSubjectEvent[];
   allGroups  : AssertSubjectGroup[];

   constructor(public allAsserts : Assertion[]) {
      this.allPersons = [];
      this.allEvents = [];
      this.allGroups = [];

      let seenP : { [id : number]: boolean } = {};
      let seenE : { [id : number]: boolean } = {};
      let seenG : { [id : number]: boolean } = {};
      const addSubject = (s : AssertSubject) => {
         if (isPerson(s)) {
            if (!seenP[s.person.id]) {
               seenP[s.person.id] = true;
               this.allPersons.push(s);
            }
         } else if (isGroup(s)) {
            if (!seenG[s.gr.id]) {
               seenG[s.gr.id] = true;
               this.allGroups.push(s);
            }
         } else if (isEvent(s)) {
            if (!seenE[s.event.id]) {
               seenE[s.event.id] = true;
               this.allEvents.push(s);
            }
         }
      };

      allAsserts.forEach(a => {
         addSubject(a.p1);
         addSubject(a.p2);
      });
   }

   /**
    * Convert the server's response
    */
   static buildFromServer(asserts : IAssertionFromServer[]) {
      let allAsserts : Assertion[] = [];
      asserts.forEach(assert => {
         allAsserts.push(Assertion.buildFromServer(assert));
      });
      return new AssertionList(allAsserts);
   }
}

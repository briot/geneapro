import {IAssertion, ICharacteristic, IGroup, IEvent,
   ICharacteristicPart, IPerson, IAssertionSubject} from './basetypes';
import {app} from './app';
import {} from 'angular';
import {} from 'angular-ui-router';

const SUBJECT_AS = {
   UNKNOWN: 0,  // must be 0
   PERSON: 1,
   EVENT: 2,
   CHAR: 3,
   GROUP: 4
};

interface AssertOption {
   kind  : number;  // SUBJECT_AS.*
   name  : string;  // display name
   group : string;  // group by
   person ?: IPerson;
   gr     ?: IGroup;
   event  ?: IEvent;
   role   ?: string;
   char   ?: ICharacteristic;
   parts  ?: ICharacteristicPart[];
}

class AllAsserts {
   allAsserts : IAssertion[];
   allPersons : AssertOption[] = [];
   allEvents  : AssertOption[]  = [];
   allGroups  : AssertOption[]  = [];

   constructor(allAsserts : IAssertion[]) {
      this.allAsserts = allAsserts;
      this.computeEntities();
   }

   /**
    * Create a record for a person.
    * This record is used for the <select> box when editing.
    * @param name     Optional default name.
    */
   static createPerson(p : IPerson, name ?: string) : AssertOption {
      return {kind: SUBJECT_AS.PERSON,
              name: name || p.name + ' (' + p.id + ')',
              group: 'Persons',
              person: p};
   }

   /**
    * Create a record for an event
    * This record is used for the <select> box when editing.
    * @param name     Optional default name.
    */
   static createEvent(e : IEvent, role ?: string, name ?: string) : AssertOption {
      return {kind: SUBJECT_AS.EVENT,
              name: name || (e.name || e.type.name) + ' (' + e.id + ')',
              event: e, role: role,
              group: 'Events'};
   }

   /**
    * Create a record for a group
    * This record is used for the <select> box when editing.
    * @param name     Optional default name.
    */
   static createGroup(g : IGroup, role ?: string, name ?: string) : AssertOption {
      return {kind: SUBJECT_AS.GROUP,
              name: name || g.name + ' (' + g.id + ')',
              gr: g, role: role,
              group: 'Groups'};
   }

   /**
    * Create a record for a characteristic
    * This record is used for the <select> box when editing.
    */
   static createChar(
      char : ICharacteristic, parts : ICharacteristicPart[], name ?: string)
      : AssertOption
   {
      return {kind: SUBJECT_AS.CHAR, name: name,
              group: 'Characteristics',
              char: char, parts: parts};
   }

   /**
    * Compute the list of entities
    */
   computeEntities() {
      this.allPersons = [];
      this.allEvents = [];
      this.allGroups = [];
      let seenP : { [id : number]: boolean } = {};
      let seenE : { [id : number]: boolean } = {};
      let seenG : { [id : number]: boolean } = {};

      const addPerson = (p : IPerson) => {
         if (!seenP[p.id]) {
            seenP[p.id] = true;
            this.allPersons.push(AllAsserts.createPerson(p));
         }
      }
      const addEvent = (e : IEvent) => {
         if (!seenE[e.id]) {
            seenE[e.id] = true;
            this.allEvents.push(AllAsserts.createEvent(e));
         }
      }
      const addGroup = (g : IGroup) => {
         if (!seenG[g.id]) {
            seenG[g.id] = true;
            this.allGroups.push(AllAsserts.createGroup(g));
         }
      }

      angular.forEach(this.allAsserts, assert => {
         if (assert.p1.person) { addPerson(assert.p1.person); }
         if (assert.p2.person) { addPerson(assert.p2.person); }
         if (assert.p1.event) { addEvent(assert.p1.event); }
         if (assert.p2.event) { addEvent(assert.p2.event); }
         if (assert.p1.group) { addGroup(assert.p1.group); }
         if (assert.p2.group) { addGroup(assert.p2.group); }
      });
   }
}
 

/**
 * Manipulating assertion subjects
 */
const DEFAULT_PLACE = {
   id: 1, name: 'Somewhere'};
const DEFAULT_ROLE = 'principal';

const DEFAULT_PERSON = AllAsserts.createPerson(
   {id: 1, name: 'Me'}, ' New person');
const DEFAULT_EVENT = AllAsserts.createEvent(
   {name: 'Birth', type: {name: 'Birth'}, date_sort: '', date: '',
    place: DEFAULT_PLACE}, DEFAULT_ROLE, ' New event');
const DEFAULT_GROUP = AllAsserts.createGroup(
   {id : -1,
    name: 'Some group',
    criteria: '',
    date_sort: '', date: '', place: DEFAULT_PLACE},
   DEFAULT_ROLE, ' New group');
const DEFAULT_CHAR = AllAsserts.createChar(
   {name: 'Sex', date_sort: '', date: '', place: DEFAULT_PLACE},
   [{name: 'sex', value: 'M'}], ' New characteristic');
const DEFAULT_UNKNOWN = {
   kind: SUBJECT_AS.UNKNOWN,
   group : 'Unknown',
   name: ' Unknown'};

class gpSubject {
   num   : number;
   s     : IAssertionSubject;
   saved : IAssertionSubject = {};
   info  : AssertOption;  // info on subject

   /**
    * @param assert     The description of the assertion.
    * @param num        Either 1 or 2, indicating which subject.
    * @param allAsserts All asserts to consider for completion.
    */
   constructor(
      public assert     : IAssertion,
      num               : number|string,
      public allAsserts : AllAsserts)
   {
      this.num = +num;
      this.s = (this.num == 1 ? assert.p1 : assert.p2);
      this.computeInfo();
   }

   /**
    * Return the list of valid subject types, depending on whether we
    * are manipulating the first or second subject, and the value alread
    * set for the other subject
    */
   validTypes() : AssertOption[] {
      if (this.num == 1) {
         return [DEFAULT_PERSON].
            concat(this.allAsserts.allPersons);
      } else {
         return [DEFAULT_PERSON].
            concat(this.allAsserts.allPersons,
                   [DEFAULT_EVENT],
                   this.allAsserts.allEvents,
                   [DEFAULT_GROUP],
                   this.allAsserts.allGroups,
                   [DEFAULT_CHAR,
                    DEFAULT_UNKNOWN]);
      }
   }

   /**
    * Given an object representing an assertion subject, return its
    */
   computeInfo() {
      this.info = (
         this.s.person ? AllAsserts.createPerson(this.s.person)
       : this.s.event ? AllAsserts.createEvent(this.s.event, this.s.role)
       : this.s.char ? AllAsserts.createChar(this.s.char, this.s.parts)
       : this.s.group ? AllAsserts.createGroup(this.s.group, this.s.role)
       : this.num == 1 ? DEFAULT_PERSON  // default for subject1
       : DEFAULT_UNKNOWN // default for subject2
       );
   }

   /**
    * Change the type of a subject.
    * We preserve the values currently set by the user, in case he selects
    * the same type again later.
    */
   setType(info : AssertOption) {
      switch (this.info.kind) {
         case SUBJECT_AS.PERSON:
            this.saved.person = this.s.person;
            break;
         case SUBJECT_AS.EVENT:
            this.saved.event = this.s.event;
            this.saved.role = this.s.role;
            break;
         case SUBJECT_AS.CHAR:
            this.saved.char = this.s.char;
            this.saved.parts = this.s.parts;
            break;
         case SUBJECT_AS.GROUP:
            this.saved.group = this.s.group;
            this.saved.role = this.s.role;
            break;
      }

      this.info = info;
      switch (info.kind) {
         case SUBJECT_AS.PERSON:
            this.s.person = info.person || this.saved.person;
            break;
         case SUBJECT_AS.EVENT:
            this.s.event = info.event || this.saved.event;
            this.s.role = info.role || this.saved.role;
            break;
         case SUBJECT_AS.CHAR:
            this.s.char = info.char || this.saved.char;
            this.s.parts = info.parts || this.saved.parts;
            break;
         case SUBJECT_AS.GROUP:
            this.s.group = info.gr || this.saved.group;
            this.s.role = info.role || this.saved.role;
            break;
      }
   }
}

/**
 * Display an assertion
 */
class AssertController {
   asserts   : AllAsserts;

   static $inject = ['$scope'];
   constructor(
      $scope : angular.IScope)
   {
      $scope.$watch('asserts', (a : IAssertion[]) => {
         if (a) {
            this.asserts = new AllAsserts(a);
         }
      });
   }
}

const html_asserts = require('geneaprove/asserts.html');

app.directive('gpAsserts', function() {
   return {
      scope: {
         asserts: '=gpAsserts',   // List of assertions
      },
      controller: AssertController,
      templateUrl: html_asserts
   };
});

/**
 * Dispay/Edit one of the subjects of an assertion.
 * This modifies the subject to add a $partType field
 */
interface AssertSubjectScope extends angular.IScope {
   assert     : IAssertion;
   subjectNum : number;
   sub        : gpSubject;
   validTypes : AssertOption[];
}

const html_assert_subject = require('geneaprove/assert_subject.html');
app.directive('gpAssertSubject', function() {
   return {
      scope: {
         assert: '=gpAssertSubject',   // An assert
         subjectNum: '@'
      },
      require: '^gpAsserts',
      link: function(
         scope      : AssertSubjectScope,
         element    : angular.IAugmentedJQuery,
         attrs      : any,
         assertCtrl : AssertController)
      {
         scope.sub = new gpSubject(
            scope.assert, scope.subjectNum, assertCtrl.asserts);
         scope.validTypes = scope.sub.validTypes();
         scope.$watch('sub.info', (info : AssertOption) => scope.sub.setType(info));
      },
      templateUrl: html_assert_subject
   };
});

const SUBJECT_AS = {
   UNKNOWN: 0,  // must be 0
   PERSON: 1,
   EVENT: 2,
   CHAR: 3,
   GROUP: 4
};

app.

/**
 * Manipulating a list of assertions
 */
service('gpAllAsserts', function() {

   class gpAllAsserts {
      constructor(allAsserts) {
         this.allAsserts = allAsserts;
         this.allPersons = [];
         this.allEvents = [];
         this.allgroups = [];
         this.computeEntities();
      }

      /**
       * Create a record for a person.
       * This record is used for the <select> box when editing.
       * @param {String=} name     Optional default name.
       */
      static createPerson(p, name) {
         return {kind: SUBJECT_AS.PERSON,
                 name: name || p.name + ' (' + p.id + ')',
                 group: 'Persons',
                 person: p};
      }

      /**
       * Create a record for an event
       * This record is used for the <select> box when editing.
       * @param {String=} name     Optional default name.
       */
      static createEvent(e, role, name) {
         return {kind: SUBJECT_AS.EVENT,
                 name: name || (e.name || e.type.name) + ' (' + e.id + ')',
                 event: e, role: role,
                 group: 'Events'};
      }

      /**
       * Create a record for a group
       * This record is used for the <select> box when editing.
       * @param {String=} name     Optional default name.
       */
      static createGroup(g, role, name) {
         return {kind: SUBJECT_AS.GROUP,
                 name: name || g.name + ' (' + g.id + ')',
                 group: g.id, role: role,
                 group: 'Groups'};
      }

      /**
       * Create a record for a characteristic
       * This record is used for the <select> box when editing.
       */
      static createChar(char, parts, name) {
         return {kind: SUBJECT_AS.CHAR, name: name, char: char, parts: parts};
      }

      /**
       * Compute the list of entities
       */
      computeEntities() {
         this.allPersons = [];
         this.allEvents = [];
         this.allGroups = [];
         let seenP = {}, seenE = {}, seenG = {};

         const addPerson = p => {
            if (!seenP[p.id]) {
               seenP[p.id] = true;
               this.allPersons.push(gpAllAsserts.createPerson(p));
            }
         }
         const addEvent = e => {
            if (!seenE[e.id]) {
               seenE[e.id] = true;
               this.allEvents.push(gpAllAsserts.createEvent(e));
            }
         }
         const addGroup = g => {
            if (!seenG[g.id]) {
               seenG[g.id] = true;
               this.allGroups.push(gpAllAsserts.createGroup(g));
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

   return gpAllAsserts;
}).

/**
 * Manipulating assertion subjects
 */
service('gpSubject', function(gpAllAsserts) {

   const DEFAULT_PLACE = {
      id: 1, name: 'Somewhere'};
   const DEFAULT_ROLE = 'principal';

   const DEFAULT_PERSON = gpAllAsserts.createPerson(
      {id: 1, name: 'Me'}, ' New person');
   const DEFAULT_EVENT = gpAllAsserts.createEvent(
      {name: 'Birth', type: {name: 'Birth'}, date_sort: '', date: '',
       place: DEFAULT_PLACE}, DEFAULT_ROLE, ' New event');
   const DEFAULT_GROUP = gpAllAsserts.createGroup(
      {name: 'Some group', date_sort: '', date: '', place: DEFAULT_PLACE},
      DEFAULT_ROLE, ' New group');
   const DEFAULT_CHAR = gpAllAsserts.createChar(
      {name: 'Sex', date_sort: '', date: '', place: DEFAULT_PLACE},
      [{name: 'sex', value: 'M'}], ' New characteristic');
   const DEFAULT_UNKNOWN = {kind: SUBJECT_AS.UNKNOWN, name: ' Unknown'};

   class gpSubject {

      /**
       * @param {Object} assert           The description of the assertion.
       * @param {Number|String} num       Either 1 or 2, indicating which subject.
       * @param {gpAllAsserts} allAsserts All asserts to consider for completion.
       */
      constructor(assert, num, allAsserts) {
         this.assert = assert;
         this.num = Number(num);
         this.allAsserts = allAsserts;
         this.s = (this.num == 1 ? assert.p1 : assert.p2);
         this.computeInfo();
      }

      /**
       * Return the list of valid subject types, depending on whether we
       * are manipulating the first or second subject, and the value alread
       * set for the other subject
       */
      validTypes() {
         if (this.num == 1) {
            return [DEFAULT_PERSON].
               concat(this.allAsserts.allPersons);
         } else {
            return [DEFAULT_PERSON].
               concat(this.allAsserts.allPersons,
                      DEFAULT_EVENT,
                      this.allAsserts.allEvents,
                      DEFAULT_GROUP,
                      this.allAsserts.allGroups,
                      DEFAULT_CHAR,
                      DEFAULT_UNKNOWN);
         }
      }

      /**
       * Given an object representing an assertion subject, return its
       */
      computeInfo() {
         this.s.$info = (
            this.s.person ? gpAllAsserts.createPerson(this.s.person)
          : this.s.event ? gpAllAsserts.createEvent(this.s.event, this.s.role)
          : this.s.char ? gpAllAsserts.createChar(this.s.char, this.s.parts)
          : this.s.group ? gpAllAsserts.createGroup(this.s.group, this.s.role)
          : this.num == 1 ? DEFAULT_PERSON  // default for subject1
          : DEFAULT_UNKNOWN // default for subject2
          );
      }

      /**
       * Change the type of a subject.
       * We preserve the values currently set by the user, in case he selects
       * the same type again later.
       */
      setType(info) {
         switch (this.s.$info.kind) {
            case SUBJECT_AS.PERSON:
               this.s.$person = this.s.person;
               break;
            case SUBJECT_AS.EVENT:
               this.s.$event = this.s.event;
               this.s.$role = this.s.role;
               break;
            case SUBJECT_AS.CHAR:
               this.s.$char = this.s.char;
               this.s.$parts = this.s.parts;
               break;
            case SUBJECT_AS.GROUP:
               this.s.$group = this.s.group;
               this.s.$role = this.s.role;
               break;
         }

         this.s.$info = info;
         switch (info.kind) {
            case SUBJECT_AS.PERSON:
               this.s.person = info.person || this.s.$person || {};
               break;
            case SUBJECT_AS.EVENT:
               this.s.event = info.event || this.s.$event || {};
               this.s.role = info.role || this.s.$role || {};
               break;
            case SUBJECT_AS.CHAR:
               this.s.char = info.char || this.s.$char || {};
               this.s.parts = info.parts || this.s.$parts || {};
               break;
            case SUBJECT_AS.GROUP:
               this.s.group = info.group || this.s.$group || {};
               this.s.role = info.role || this.s.$role || {};
               break;
         }
      }
   }

   return gpSubject;
}).

/**
 * Display an assertion
 */
directive('gpAsserts', function(gpAllAsserts) {
   return {
      scope: {
         asserts: '=gpAsserts',   // List of assertions
      },
      controller: function($scope) {
         $scope.$watch('asserts', a => {
            if (a) {
               this.asserts = new gpAllAsserts(a);
            }
         });
      },
      templateUrl: 'geneaprove/asserts.html'
   };
}).

/**
 * Dispay/Edit one of the subjects of an assertion.
 * This modifies the subject to add a $partType field
 */
directive('gpAssertSubject', function(gpSubject) {
   return {
      scope: {
         assert: '=gpAssertSubject',   // An assert
         subjectNum: '@'
      },
      require: '^gpAsserts',
      link: function(scope, element, attrs, assertCtrl) {
         const s = new gpSubject(
            scope.assert, scope.subjectNum, assertCtrl.asserts);
         scope.sub = s.s;
         scope.validTypes = s.validTypes();
         scope.$watch('sub.$info', info => s.setType(info));
      },
      templateUrl: 'geneaprove/assert_subject.html'
   };
});

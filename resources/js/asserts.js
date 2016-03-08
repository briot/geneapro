/**
 * Manipulating assertion subjects
 */
app.
service('gpSubject', function() {

   var SUBJECT_AS = {
      UNKNOWN: 0,
      PERSON: 1,
      EVENT: 2,
      CHAR: 3,
      GROUP: 4
   };

   var DEFAULT_PERSON = {
      id: 1, name: 'Me'};
   var DEFAULT_PLACE = {
      id: 1, name: 'Somewhere'};
   var DEFAULT_EVENT = {
      name: 'Birth of me',
      type: {name: 'Birth'},
      date_sort: '',
      date: '',
      place: DEFAULT_PLACE};
   var DEFAULT_ROLE = 'principal';
   var DEFAULT_CHAR = {
      name: 'Sex',
      date_sort: '',
      date: '',
      place: DEFAULT_PLACE};
   var DEFAULT_CHAR_PARTS = [
      {name: 'sex', value: 'M'}];
   var DEFAULT_GROUP = {
      name: 'Some group',
      date_sort: '',
      date: '',
      place: DEFAULT_PLACE};

   /**
    * @param {Object} s     The description of the subject.
    * @param {Number} num   Either 1 or 2, indicating which subject.
    * @constructor
    */
   function gpSubject(s, num) {
      this.s = s;
      this.num = num;
      this.computeType();
   }

   /**
    * Return the list of valid subject types, depending on whether we
    * are manipulating the first or second subject, and the value alread
    * set for the other subject
    */
   gpSubject.prototype.validTypes = function() {
      if (this.num == 1) {
         return [{id: SUBJECT_AS.PERSON,  name: 'person'}];
      } else {
         return [{id: SUBJECT_AS.PERSON,  name: 'person'},
                 {id: SUBJECT_AS.EVENT,   name: 'event'},
                 {id: SUBJECT_AS.CHAR,    name: 'characteristic'},
                 {id: SUBJECT_AS.GROUP,   name: 'group'},
                 {id: SUBJECT_AS.UNKNOWN, name: 'unknown'}];
      }
   };

   /**
    * Given an object representing an assertion subject, return its
    */
   gpSubject.prototype.computeType = function() {
      this.s.$subjectType = (this.s.person ? SUBJECT_AS.PERSON
              : this.s.event ? SUBJECT_AS.EVENT
              : this.s.char ? SUBJECT_AS.CHAR
              : this.s.group ? SUBJECT_AS.GROUP
              : this.num == 1 ? SUBJECT_AS.PERSON  // default for subject1
              : SUBJECT_AS.UNKNOWN);
   };

   /**
    * Change the type of a subject.
    * We preserve the values currently set by the user, in case he selects
    * the same type again later.
    */
   gpSubject.prototype.setType = function(type) {
      switch (this.s.$subjectType) {
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

      this.s.$subjectType = type;

      switch (type) {
         case SUBJECT_AS.PERSON:
            this.s.person = this.s.$person || DEFAULT_PERSON;
            break;
         case SUBJECT_AS.EVENT:
            this.s.event = this.s.$event || DEFAULT_EVENT;
            this.s.role = this.s.$role || DEFAULT_ROLE;
            break;
         case SUBJECT_AS.CHAR:
            this.s.char = this.s.$char || DEFAULT_CHAR;
            this.s.parts = this.s.$parts || DEFAULT_CHAR_PARTS;
            break;
         case SUBJECT_AS.GROUP:
            this.s.group = this.s.$group || DEFAULT_GROUP;
            this.s.role = this.s.$role || DEFAULT_ROLE;
            break;
      }
   };

   return gpSubject;
}).

/**
 * Dispay/Edit one of the subjects of an assertion.
 * This modifies the subject to add a $partType field
 */
directive('gpAssertSubject', function(gpSubject) {
   return {
      scope: {
         sub: '=gpAssertSubject',
         edited: '=',
         subjectNum: '@'
      },
      controller: function($scope) {
         var s = new gpSubject($scope.sub, $scope.subjectNum);
         $scope.validTypes = s.validTypes();
         $scope.$watch('sub.$subjectType', function(type) {
            s.setType(type);
         });
      },
      templateUrl: 'geneaprove/assert_subject.html'
   };
});

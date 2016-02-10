app.

/**
 * A button used in the main menu bar
 */
directive('gpMenubutton', function(Pedigree) {
   return {
      scope: {
         url: '@gpMenubutton', // target url
         title: '@',
         font: '@',
         notImplemented: '@'
      },
      replace: true,
      controller: function($scope, $rootScope) {
         $rootScope.$watch('decujus', function(val) {
            $scope.target = '#' + $scope.url + '?id=' + val;
         });
      },
      template: '<li>' +
         '<a href="{{target}}" title="{{title}}" ng-class="{notImplemented:notImplemented}">' +
            '<span ng-if="!icon&&!font">{{title}}</span>' +
            '<i ng-if="font" class="fa {{font}}" style="font-size:1.4em"></i>' +
         '</a></li>'
   };
}).

/**
 * A link to a persona.
 */
directive('personaLink', function($state) {
   return {
      scope: {
         personId: '=personaLink',  // The id of the person
         name: '='                  // Defaults to Id
      },
      replace: true,
      template:
         '<a ui-sref="person({id:personId})" class="fa fa-user gpLink">' +
            '<span>{{name||personId}}</span>' +
         '</a>'
   };
}).

/**
 * A link to a source.
 */
directive('sourceLink', function($state) {
   return {
      scope: {
         sourceId: '=sourceLink',  // The id of the source
         name: '='                 // Default to Id
      },
      replace: true,  // content of element should use the outside scope
      template:
         '<a ui-sref="source({id:sourceId})" class="fa fa-book gpLink">' +
            '<span>{{name||sourceId}}</span>' +
         '</a>'
   };
}).

/**
 * A button that opens a file selection dialog, and then executes a callback.
 * The value of ngModel is set to either a single tuple or a list of tuples,
 * each of which of the form:   [name, <input_element>].
 * The input_element can be used with the upload service
 */
directive('ngFileImport', function($window) {
   return {
      scope: {
         text: '@ngFileImport',
         ngModel: '=',
         multiple: '@'
      },
      link: function(scope, elem) {
         scope.ngModel = scope.multiple ? [] : undefined;
         elem.find('input').bind('change', function() {
            var inputFile = angular.element(this);

            if (scope.multiple) {
               // Keep all inputs around so that we can submit the form
               var clone = inputFile.clone(true);
               clone.removeAttr('id');
               inputFile.after(clone).css('display', 'none');
               scope.ngModel.push([clone.val(), clone]);
            } else {
               scope.ngModel = [inputFile.val(), inputFile];
            }
            scope.$apply();
         });
      },
      template: '<label for="fileinput">' +
                '  <span class="btn btn-primary">{{text}}...</span>' +
                '  <input type="file" id="fileinput" ' +
                'style="opacity:0; filter:alpha(opacity=0)"></label>'
  };
}).

/**
 * Set this on a table header to make the <table> sortable.
 * <table sort-on='list'>
 *   <tr>
 *      <th sort-by='field_name1'>Title</th>
 *      <th sort-by='field_name2'>Title</th>
 *
 * Where 'list' is the name of the variable in the scope that should be
 * sorted (presumably it is used to build the table).
 */
directive('sortOn', function() {
   // Sorters that can be used by the 'sortBy' directive.
   //   'format' is a function that transform the value read from the model
   //      into the value to compare
   //   'compare' is a comparison function:  (a, b) -> (-1, 0, 1)
   function numericCompare(a, b) {return a - b; }
   function strCompare(a, b) {if (a < b) return -2; if (b < a) return 2; return 0}
   var sorters = {
      'text': {compare: strCompare, format: angular.identity},
      'numeric': {compare: numericCompare, format: function(s) { return Number(s)}},
      'date': {compare: numericCompare, format: function(s) {return Date.parse(s)}},
   };

   return {
      scope: {
         sortOn: '@',
         sortDefault: '@'
      },
      controller: function($scope, $parse, localStorageService) {
         var self = this;
         var listName = $scope.sortOn;
         self.sorters = {};     // for each field, the sort criteria
         self.sortCriteria = {  // referenced by headers to set ng-class
            field: '',
            ascending: true
         };
         /** If force is true, we always recompute the sort criteria */
         self.sort = function(field, force) {
            var list = $parse(listName)($scope.$parent);
            if (!angular.isArray(list)) {
               return;
            }
            if (!field) {
               var v = localStorageService.get('sort_' + listName);
               if (!v) {
                  return;
               }
               field = v.substring(1);
            }
            var sorter = sorters[self.sorters[field] || 'text'];

            if (self.sortCriteria.field == field && !force) {
               self.sortCriteria.ascending = !self.sortCriteria.ascending;
            } else {
               self.sortCriteria.ascending = (v && v[0] == '+') ? false : true;
               self.sortCriteria.field = field;
               var getter = $parse(field);
               angular.forEach(list, function(v) {
                  v.$sort = sorter.format(getter(v));
               });
            }
            if (self.sortCriteria.ascending) {
               localStorageService.set('sort_' + listName, '-' + field);
               list.sort(function(a, b) {return sorter.compare(a.$sort, b.$sort)});
            } else {
               localStorageService.set('sort_' + listName, '+' + field);
               list.sort(function(a, b) {return -sorter.compare(a.$sort, b.$sort)});
            }
         };
         $scope.$parent.$watch(listName, function() {
            // Called when the actual list changes, but not when sorting
            self.sort($scope.sortDefault, true);
         });
      }
   };
}).
directive('sortBy', function() {
   return {
      require: '^sortOn',
      scope: {
         field: '@sortBy',
         sorter: '@' // The name of one of the sorters above
      },
      replace: true,
      transclude: true,
      link: function(scope, element, attrs, sortOn) {
         sortOn.sorters[scope.field] = scope.sorter;
         scope.sortCriteria = sortOn.sortCriteria;
         scope.sort = function() {
            sortOn.sort(scope.field);
         };
      },
      template: '<th class="sortable"' +
         ' ng-class="{headerSortUp:!sortCriteria.ascending && sortCriteria.field==field,' +
                     'headerSortDown:sortCriteria.ascending && sortCriteria.field==field}"' +
         ' ng-click="sort()" ng-transclude></th>'
   };
});



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
         '<span>'
         + '<span ng-if=name style="margin-right:5px" ng-bind-html="name"></span>'
         + '<a ui-sref="person({id:personId})" class="fa fa-book gpLinkSuper" ng-show="personId">'
         +   '{{personId}}'
         + '</a>'
         + '</span>'
   };
}).

/**
 * A link to a place.
 */
directive('placeLink', function($state) {
   return {
      scope: {
         id: '=placeLink',  // The id of the place
         name: '='               // Defaults to Id
      },
      replace: true,
      template:
        '<a ui-sref="place({id:id})" class="fa fa-globe gpLink" ng-show="id">'
        +    '{{name||id}}'
        + '</a>'
   };
}).

/**
 * A link to a timeline.
 */
directive('timeLink', function($state) {
   return {
      scope: {
         date: '=timeLink',
         name: '='       // Defaults to date
      },
      replace: true,
      template:
        '<a ui-sref="timeline({date:date})" class="fa fa-calendar gpLink" ng-show="date">'
        +    '{{name||date}}'
        + '</a>'
   };
}).

/**
 * A link to a source.
 */
directive('sourceLink', function($state) {
   return {
      scope: {
         sourceId: '=sourceLink',  // The id of the source
         sourceName: '=',                // Default to Id
         sourceTitle: '='
      },
      replace: true,  // content of element should use the outside scope
      template:
         '<span>'
         + '<span ng-if=sourceName style="margin-right:5px" ng-bind-html="sourceName|linkyWithHtml"></span>'
         + '<a ui-sref="source({id:sourceId})" class="fa fa-book gpLinkSuper" title="{{sourceTitle}}" ng-show="sourceId">'
         +   '{{sourceId}}'
         + '</a>'
         + '</span>'
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
            const inputFile = angular.element(this);

            if (scope.multiple) {
               // Keep all inputs around so that we can submit the form
               const clone = inputFile.clone(true);
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
   const sorters = {
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
         const listName = $scope.sortOn;
         this.sorters = {};     // for each field, the sort criteria
         this.sortCriteria = {  // referenced by headers to set ng-class
            field: '',
            ascending: true
         };
         /** If force is true, we always recompute the sort criteria */
         this.sort = (field, force) => {
            const list = $parse(listName)($scope.$parent);
            if (!angular.isArray(list)) {
               return;
            }
            if (!field) {
               const v = localStorageService.get('sort_' + listName);
               if (!v) {
                  return;
               }
               field = v.substring(1);
            }
            const sorter = sorters[this.sorters[field] || 'text'];

            if (this.sortCriteria.field == field && !force) {
               this.sortCriteria.ascending = !this.sortCriteria.ascending;
            } else {
               this.sortCriteria.ascending = (v && v[0] == '+') ? false : true;
               this.sortCriteria.field = field;
               const getter = $parse(field);
               angular.forEach(list, function(v) {
                  v.$sort = sorter.format(getter(v));
               });
            }
            if (this.sortCriteria.ascending) {
               localStorageService.set('sort_' + listName, '-' + field);
               list.sort(function(a, b) {return sorter.compare(a.$sort, b.$sort)});
            } else {
               localStorageService.set('sort_' + listName, '+' + field);
               list.sort(function(a, b) {return -sorter.compare(a.$sort, b.$sort)});
            }
         };
         $scope.$parent.$watch(listName, () => {
            // Called when the actual list changes, but not when sorting
            this.sort($scope.sortDefault, true);
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
}).

/**
 * Convert number model to strings, for use in <select> boxes
 * http://stackoverflow.com/questions/19809717/ng-select-gives-only-string-but-i-want-integer
 */

directive('convertToNumber', function() {
   return {
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {
         ngModel.$parsers.push(function(val) {
            return parseInt(val, 10);
         });
         ngModel.$formatters.push(function(val) {
            return '' + val;
         });
      }
   };
}).

filter('linkyWithHtml', function($filter) {
   return function(str) {
      if (str) {
         const s = $filter('linky')(str);
         return s.replace(/\&gt;/g, '>').replace(/\&lt;/g, '<');
      }
   };
});

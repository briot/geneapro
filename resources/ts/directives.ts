/// <reference path="typings/angularjs/angular" />
/// <reference path="typings/angular-local-storage/angular-local-storage" />
/// <reference path="typings/angular-ui-router/angular-ui-router" />
/// <reference path="./pedigree.service.ts"/>

module GP {
   /**
    * A button used in the main menu bar
    */

   interface MenuButtonScope extends angular.IScope {
      url            : string,
      title          : string,
      font           : string,
      notImplemented : boolean
   }

   class MenuButtonController {
      target : string;
      url    : string;
      title  : string;
      font   : string;
      notImplemented : boolean;

      static $inject = ['$scope', '$rootScope'];
      constructor(
         $scope     : MenuButtonScope,
         $rootScope : IGPRootScope)
      {
         this.url = $scope.url;
         this.title = $scope.title;
         this.font  = $scope.font;
         this.notImplemented = $scope.notImplemented;
         $rootScope.$watch('decujus', (val : number) => {
            this.target = '#' + this.url + '?id=' + val;
         });
      }
   }

   app.directive('gpMenubutton', function(Pedigree) {
      return {
         scope: {
            url: '@gpMenubutton', // target url
            title: '@',
            font: '@',
            notImplemented: '@'
         },
         replace      : true,
         controller   : MenuButtonController,
         controllerAs : 'ctrl',
         template: '<li>' +
            '<a href="{{ctrl.target}}" title="{{ctrl.title}}" ng-class="{notImplemented:ctrl.notImplemented}">'
         + '<span ng-if="!ctrl.font">{{ctrl.title}}</span>'
         + '<i ng-if="font" class="fa {{ctrl.font}}" style="font-size:1.4em"></i>'
         + '</a></li>'
      };
   });

  
   /**
    * A link to a persona.
    */
   app.directive('personaLink', ($state : angular.ui.IStateService) => {
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
   directive('placeLink', ($state : angular.ui.IStateService) => {
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
   directive('timeLink', ($state : angular.ui.IStateService) => {
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
   directive('sourceLink', ($state : angular.ui.IStateService) => {
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
   });
   
   /**
    * A button that opens a file selection dialog, and then executes a callback.
    * The value of ngModel is set to either a single tuple or a list of tuples,
    * each of which of the form:   [name, <input_element>].
    * The input_element can be used with the upload service
    */
   interface NgFileImportScope extends angular.IScope {
      text     : string,
      ngModel  : any,
      multiple : boolean
   }

   app.directive('ngFileImport', ($window : angular.IWindowService) => {
      return {
         scope: {
            text: '@ngFileImport',
            ngModel: '=',
            multiple: '@'
         },
         link: function(
            scope : NgFileImportScope,
            elem  : angular.IAugmentedJQuery)
         {
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
   });
   
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
   interface SortOnScope extends angular.IScope {
      sortOn      : string,
      sortDefault : string
   }

   // Sorters that can be used by the 'sortBy' directive.
   const numericCompare = (a : number, b : number) => a - b;
   const strCompare = (a : string, b : string) => (a < b) ? -1 : (b < a) ? 1 : 0;
   interface Sorter<T> {
      compare : (a : T, b : T) => number,  /* -1, 0, 1 */
      format  : (s : string) => T  // transform value of model to compare value
   }
   const sorters : { [key : string] : Sorter<any> } = {
      'text':    {compare: strCompare, format: angular.identity},
      'numeric': {compare: numericCompare, format: (s : string) => +s},
      'date':    {compare: numericCompare, format: (s : string) => Date.parse(s)}
   };

   class SortOnController {
      // For each field, name of the sort criteria
      sorters : { [field : string] : string } = {};

      // The current sort criteria
      sortCriteria = {  // referenced by headers to set ng-class
         field: '',
         ascending: true
      };

      // Name of the variable that contains the list (to be found in the scope)
      listName : string;

      static $inject = ['$scope', '$parse', 'localStorageService'];
      constructor(
         public $scope              : SortOnScope,
         public $parse              : angular.IParseService,
         public localStorageService : angular.local.storage.ILocalStorageService)
      {
         this.listName = $scope.sortOn;
         $scope.$parent.$watch(this.listName, () => {
            // Called when the actual list changes, but not when sorting
            this.sort($scope.sortDefault, true);
         });
      }

      /**
       * If force is true, we always recompute the sort criteria
       */
      sort(field : string, force ?: boolean) {
         const list = this.$parse(this.listName)(this.$scope.$parent);
         if (!angular.isArray(list)) {
            return;
         }
         let v : string;

         if (!field) {
            v = this.localStorageService.get<string>('sort_' + this.listName);
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
            const getter = this.$parse(field);
            angular.forEach(list, (v) => {
               v.$sort = sorter.format(getter(v));
            });
         }
         if (this.sortCriteria.ascending) {
            this.localStorageService.set('sort_' + this.listName, '-' + field);
            list.sort((a : any, b : any) => sorter.compare(a.$sort, b.$sort));
         } else {
            this.localStorageService.set('sort_' + this.listName, '+' + field);
            list.sort((a : any, b : any) => -sorter.compare(a.$sort, b.$sort));
         }
      }
   }

   app.directive('sortOn', () => {
      return {
         scope: {
            sortOn: '@',
            sortDefault: '@'
         },
         controller: SortOnController,
         controllerAs : 'ctrl'
      };
   });

   interface SortByScope extends angular.IScope {
      field         : string,  // name of the field in the sort data
      sorter        : string, // name of the sorter to use
      sortCriteria ?: {field : string, ascending : boolean},
      sort          : Function
   }

   app.directive('sortBy', function() {
      return {
         require: '^sortOn',
         scope: {
            field: '@sortBy',
            sorter: '@' // The name of one of the sorters above
         },
         replace: true,
         transclude: true,
         link: function(
            scope   : SortByScope,
            element : any,
            attrs   : any,
            sortOn  : SortOnController)
         {
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
   
   /**
    * Convert number model to strings, for use in <select> boxes
    * http://stackoverflow.com/questions/19809717/ng-select-gives-only-string-but-i-want-integer
    */
   
   app.directive('convertToNumber', () => {
      return {
         require: 'ngModel',
         link: function(
            scope   : any,
            element : any,
            attrs   : any,
            ngModel : angular.INgModelController)
         {
            ngModel.$parsers.push((val : string) => parseInt(val, 10));
            ngModel.$formatters.push((val : string) => '' + val);
         }
      };
   }).
   
   filter('linkyWithHtml', function($filter : angular.IFilterService) {
      const linky = <(str:string) => string> $filter('linky');
      return function(str : string) {
         if (str) {
            const s = linky(str);
            return s.replace(/\&gt;/g, '>').replace(/\&lt;/g, '<');
         }
      };
   });
}

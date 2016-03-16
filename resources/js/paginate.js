app.factory('Paginated', function($rootScope, $filter, $http) {
   const rows = [{rows: 10, label: '10'},
                 {rows: 20, label: '20'},
                 {rows: 30, label: '30'},
                 {rows: 40, label: '40'},
                 {rows: 50, label: '50'},
                 {rows: 60, label: '60'},
                 {rows: 70, label: '70'},
                 {rows: 80, label: '80'},
                 {rows: 100, label: '100'},
                 {rows: 200, label: '200'},
                 {rows: undefined, label: 'All'}]

   class Paginated {

      /**
       * Instrument a scope to support a paginated view of data.
       *  @param{Object} $scope        The scope object.
       *  @param{string} url   The URL to download data from.
       *  @param{string} rowsPerPage  The name of the settings that indicates
       *     the number of rows per page.
       *  @param{function(object):object?} getData  extract the data to be
       *     filtered from the http response.
       */
      static instrument($scope, url, rowsPerPage, getData) {
         $scope.rows = rows;
         $scope.page = 1;
         $scope.filteredData = $scope.data = [];
         $scope.setPage = function(page) {
            const len = $scope.filteredData.length;
            if (len == 0) {
               $scope.offset = 0;
               $scope.offsetMax = 0;  // last on page
               $scope.maxPage = 1;
               return;
            }
            const s = $rootScope.$eval(rowsPerPage) || len; // page size
            $scope.maxPage = Math.ceil(len / s);
            page = Math.min($scope.maxPage, Math.max(1, page));
            $scope.page = page;
            $scope.offset = (page - 1) * s;
            $scope.offsetMax = Math.min($scope.offset + s, len - 1);
            $scope.pageRange = [];
            const min = Math.max(1, $scope.page - 3);
            const max = Math.min($scope.maxPage, min + 7);
            for (let r2 = min; r2 <= max; r2++) {
               $scope.pageRange.push(r2);
            }
         }

         $scope.filter = {value: ''};
         $scope.$watch('filter.value', function(val) {
            $scope.filteredData = $filter('filter')($scope.data, val);
            $scope.setPage($scope.page);
         });
         $rootScope.$watch(rowsPerPage, function() {
            $scope.setPage($scope.page);
         });

         $http.get(url).then(function(resp) {
            $scope.data = (getData ? getData(resp.data) : resp.data);
            $scope.filteredData =
               $filter('filter')($scope.data, $scope.$eval('filter.value'));
            $scope.setPage(1);
         });
      }
   }

   return Paginated;
}).

/**
 * Split a list into several pages, and return the items for a specific list
 */
filter('paginate', function() {
   return function(input, page, pageSize, filter) {
      if (pageSize === undefined) {
         return input;
      }
      if (input) {
         page = (Number(page, 1) - 1) * pageSize;
         return input.slice(page, page + pageSize);
      }
   };
}).

/**
 * Display the list of pages for a paginated view. This depends on several
 * variables set via Paginated.instrument.
 */
directive('gpPaginatePages', function() {
   return {
      replace: true,
      template:
         '<nav>' +
            '<ul class="pagination">' +
               '<li><a ng-click="setPage(1)">&laquo;</a></li>' +
               '<li><a ng-click="setPage(page-1)">&lsaquo;</a></li>' +
               '<li ng-repeat="p in pageRange" ng-class="{active:page==p}">' +
                  '<a ng-click="setPage(p)">{{p}}</a></li>' +
               '<li><a ng-click="setPage(page+1)">&rsaquo;</a></li>' +
               '<li><a ng-click="setPage(maxPage)">&raquo;</a></li>' +
            '</ul>' +
         '</nav>'
   };
}).

/**
 * Display the header for a paginated view. This depends on several variables
 * set via Paginated.instrument above.
 */
directive('gpPaginateHeader', function() {
   return {
      template:
         '<input placeholder="filter" ng-model="filter.value"' +
           ' style="float:right; width: 250px"/>' +
         '<span>({{offset + 1}} - {{offsetMax + 1}} / {{filteredData.length}})</span>'
   };
});


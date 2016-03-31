import {} from 'angular';
import {} from 'angular-ui-router';
import {app} from './app';
import {IGPRootScope} from './basetypes';

/**
 * Class that provides the infor needed to display paginated data
 */

class PaginateController {
    rows = [{rows: 10, label: '10'},
            {rows: 20, label: '20'},
            {rows: 30, label: '30'},
            {rows: 40, label: '40'},
            {rows: 50, label: '50'},
            {rows: 60, label: '60'},
            {rows: 70, label: '70'},
            {rows: 80, label: '80'},
            {rows: 100, label: '100'},
            {rows: 200, label: '200'},
            {rows: undefined, label: 'All'}];
    rowsPerPage  : number = 1; // number of rows per page
    page         : number = 1; // current page
    maxPage      : number = 1; // maximal page
    offset       : number = 0; // index of first displayed row
    offsetMax    : number = 0; // index of last displayed row
    data         : any[] = [];      // data to display
    filteredData : any[] = [];      // data after applying the filter
    pageRange    : number[];   // page numbers to display at bottom
    filter       : string = '';  // The currently applied filter

    /**
     * Paginate the data, so that only a small subset is displayed on
     * screen.
     */
    constructor(public $filter : angular.IFilterService) {
    }

    /**
     * Set the number of rows per page
     */
    setRowsPerPage(rows : number) {
       this.rowsPerPage = rows;
       this.setPage(this.page);
    }

    /**
     * Update the filter to apply on the data
     */
    setFilter(val : string) {
       this.filter = val;
       this.filteredData = this.$filter('filter')(this.data, val);
       this.setPage(this.page);
    }

    /**
     * Change the current page
     */
    setPage(page : number) {
       const len = this.filteredData.length;
       if (len == 0) {
          this.offset = 0;
          this.offsetMax = 0;  // last on page
          this.maxPage = 1;
          return;
       }
       const s = this.rowsPerPage || len; // page size
       this.maxPage = Math.ceil(len / s);
       page = Math.min(this.maxPage, Math.max(1, page));
       this.page = page;
       this.offset = (page - 1) * s;
       this.offsetMax = Math.min(this.offset + s, len - 1);
       this.pageRange = [];
       const min = Math.max(1, this.page - 3);
       const max = Math.min(this.maxPage, min + 7);
       for (let r2 = min; r2 <= max; r2++) {
          this.pageRange.push(r2);
       }
    }
}

export interface IPaginateScope extends angular.IScope {
   filter : {value : string },
   paginate : PaginateController,
}

export class PaginatedService {

   $inject = ['$rootScope', '$filter', '$http'];
   constructor(
      public $rootScope : IGPRootScope,
      public $filter    : angular.IFilterService,
      public $http      : angular.IHttpService)
   {
   }

   /**
    * Instrument a scope to support a paginated view of data.
    *  @param $scope  The scope on which the pagination takes place
    *  @param url   The URL to download data from.
    *  @param rowsPerPage  The name of the settings that indicates
    *     the number of rows per page.
    *  @param getData  extract the data to be filtered from the
    *     http response.
    */
   instrument(
      $scope      : IPaginateScope,
      url         : string,
      rowsPerPage : string,   // rootScope field to evaluate
      getData     ?: (resp : any) => any[])
   {
      let result = new PaginateController(this.$filter);

      $scope.paginate = result;
      $scope.$watch('paginate.filter', (val : string) => {
         result.setFilter(val);
      });
      this.$rootScope.$watch(rowsPerPage, (val : number) => {
         result.setRowsPerPage(val);
      });

      this.$http.get(url).then((resp) => {
         result.data = (getData ? getData(resp.data) : <any>resp.data);
         result.setFilter(result.filter);
      });
   }
}

app.service('Paginated', PaginatedService);

/**
 * Split a list into several pages, and return the items for a specific list
 */
app.filter('paginate', function() {
   return function(
      input : any[],
      page : number,
      pageSize : number)
   {
      if (pageSize === undefined) {
         return input;
      }
      if (input) {
         page = (page - 1) * pageSize;
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
               '<li><a ng-click="setPage(paginate.page-1)">&lsaquo;</a></li>' +
               '<li ng-repeat="p in paginate.pageRange" ng-class="{active:paginate.page==p}">' +
                  '<a ng-click="setPage(p)">{{p}}</a></li>' +
               '<li><a ng-click="setPage(paginate.page+1)">&rsaquo;</a></li>' +
               '<li><a ng-click="setPage(paginate.maxPage)">&raquo;</a></li>' +
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
         '<input placeholder="filter" ng-model="paginate.filter"' +
           ' style="float:right; width: 250px"/>' +
         '<span>({{paginate.offset + 1}} - {{paginate.offsetMax + 1}} / {{paginate.filteredData.length}})</span>'
   };
});

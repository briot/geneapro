import {} from 'angular';
import {} from 'angular-ui-router';
import {app} from './app';
import {ISource, IAssertion, IRepr, ISourcePart} from './basetypes';
import {ZoomImage} from './media';
import {IPaginateScope, PaginatedService} from './paginate';

interface ServerSourceViewData {
   source         : ISource,
   higher_sources ?: ISource[],
   asserts        ?: IAssertion[],
   repr           ?: IRepr[]
}
type ServerSourceViewResp = angular.IHttpPromiseCallbackArg<ServerSourceViewData>;

interface SourceControllerScope extends angular.IScope {
   source         : ISource,
   higher_sources ?: ISource[],
   asserts        ?: IAssertion[],
   repr           ?: IRepr[]
}

/**
 * Parse a JSON response from the server (the 'source' and 'parts' fields)
 */
function parse_SourceView_response(
   $scope : SourceControllerScope,
   resp   : ServerSourceViewResp)
{
   $scope.source = resp.data.source;
   $scope.higher_sources = resp.data.higher_sources;
   $scope.asserts = resp.data.asserts;
   $scope.repr = resp.data.repr;

   if ($scope.source.id == null) {
      $scope.source.id = -1;
   }
   if ($scope.source.medium == null) {
      $scope.source.medium = '';
   }
}

const html_sources = require('geneaprove/sources.html');
const html_source  = require('geneaprove/source.html');

app.config(($stateProvider : angular.ui.IStateProvider) => {
   $stateProvider.
   state('sources', {
      url: '/sources/list',
      templateUrl: html_sources,
      controller: SourcesController,
      data: {
         pageTitle: 'List of sources'
      }
   }).
   state('source_new', {
      url: '/sources/new',
      templateUrl: html_source,
      controller: SourceController,
      controllerAs: 'ctrl',
      data: {
         pageTitle: 'New Source'
      }
   }).
   state('source', {
      url: '/sources/:id',
      templateUrl: html_source,
      controller: SourceController,
      controllerAs: 'ctrl',
      data: {
         pageTitle: 'Source {{id}}'
      }
   });
});

/**
 * The template for a specific model.
 */
 const re_part = /\{([^}]+)\}/g;
 class CitationTemplate {
    fields : string[] = []; // list of customizable fields in the templates

    constructor(
       private full   : string = '',   // template for the full citation
       private biblio : string = '',   // template for the bibliography
       private abbrev : string = '')   // abbreviated version of the full template
    {
       // Use an explicit order for citations, to get better control
       // on the order of fields in the UI.
       let found : {[key : string]: boolean} = {};
       angular.forEach(
          [this.full, this.biblio, this.abbrev],
          cite => {
             let m : string[];
             while ((m = re_part.exec(cite)) != null) {
                if (!found[m[1]]) {
                   found[m[1]] = true;
                   this.fields.push(m[1]);
                }
             }
          });
    }

    /**
     * Resolve the template given some values for the fields.
     * @param vals    The values for the fields.
     */
    cite(vals : { [name : string] : string}) {
       let full = this.full;
       let biblio = this.biblio;
       let abbrev = this.abbrev;

       angular.forEach(this.fields, name => {
          // Use a function for the replacement, to protect "$" characters
          function repl() { return vals[name] || ''}
          full   = full.replace('{' + name + '}', repl);
          biblio = biblio.replace('{' + name + '}', repl);
          abbrev = abbrev.replace('{' + name + '}', repl);
       });

       /** Remove special chars like commas, quotes,... when they do not
        *  separate words, in case some parts has not been set.
        */
       function cleanup(str : string) {
          let s = ''
          while (s != str) {
             s = str;
             str = str.replace(/^ *[,:;.] */g, ''). // leading characters
                       replace(/"[,.]?"/g, '').
                       replace(/\( *[,.:;]? *\)/g, '').
                       replace("<I></I>", '').
                       replace(/[,:;] *$/, '').
                       replace(/([,:;.]) *[,:;.]/g, "$1");
          }
          return str;
       }

       return {full:   cleanup(full),
               biblio: cleanup(biblio),
               abbrev: cleanup(abbrev)};
    }
}

interface CitationModel {
   id       : string;
   type     : string;
   category : string
}

interface ServerCitationModelsData {
   source_types     : CitationModel[];    // List of source types
   repository_types : string[]            // List of repositories
}
type ServerCitationModelsResp =
   angular.IHttpPromiseCallbackArg<ServerCitationModelsData>;

interface ServerCitationModelData {
   full     : string;
   biblio   : string;
   abbrev   : string;
}
type ServerCitationModelResp =
   angular.IHttpPromiseCallbackArg<ServerCitationModelData>;

/**
 * A service that downloads, and caches, the list of citation templates.
 */
class CitationTemplates {
   models : CitationModel[] = [];
   details : { [id : string] : CitationTemplate } = {
      '' : new CitationTemplate};


   static $inject = ['$http', '$q'];
   constructor(
      public $http : angular.IHttpService,
      public $q    : angular.IQService)
   {
   }

   /**
    * Return a promise for the list of all known citation models
    */
   all_models() : angular.IPromise<CitationModel[]> {
      const d = this.$q.defer();
      if (this.models.length != 0) {
         d.resolve(this.models);
      } else {
         this.$http.get('/data/citationModels').then((resp : ServerCitationModelsResp) => {
            this.models = [{id: '',
                            type: 'Select citation template',
                            category: ''}].
                concat(resp.data.source_types);
            d.resolve(this.models);
         }, () => {
            d.reject();
         });
      }
      return d.promise;
   }

   /**
    * Return the templates for a specific model.
    * @return a promise for an instance of the CitationTemplate class
    */
   get_templates(model_id : string) : angular.IPromise<CitationTemplate> {
      const d = this.$q.defer();
      if (this.details[model_id]) {
         d.resolve(this.details[model_id]);
      } else {
         this.$http.get('/data/citationModel/' + model_id)
         .then((resp : ServerCitationModelResp) => {
            d.resolve(
               this.details[model_id] = new CitationTemplate(
                  resp.data.full, resp.data.biblio, resp.data.abbrev));
         }, () => {
            d.reject();
         });
      }
      return d.promise;
   }
}

app.service('CitationTemplates', CitationTemplates);

/**
 * The page that displays the list of sources
 */

class SourcesController {
   static $inject = ['$scope', 'Paginated'];
   constructor(
      public $scope    : IPaginateScope,
      public paginated : PaginatedService)
   {
      paginated.instrument(
         $scope, '/data/sources/list', 'settings.sources.rows');
   }
}

/**
 * Editing the citation for a source
 */

const html_citation = require('geneaprove/source_citation.html');

app.directive('gpSourceCitation', function(CitationTemplates, $http, $state) {
   return {
      scope: {
         source: '=gpSourceCitation',
         higherSources: '='
      },
      templateUrl: html_citation,
      controller : SourceCitationController,
      controllerAs : 'ctrl'
   }
});

interface ServerSourcePartsData {
   parts : ISourcePart[];
}
type ServerSourcePartsResp = angular.IHttpPromiseCallbackArg<ServerSourcePartsData>;

class SourceCitationController {
   // citation template for currently selected medium
   citation : CitationTemplate = undefined;
   source_types : CitationModel[];
   extra_parts  : ISourcePart[];  // extra citation parts
   source       : ISource;
   saved_citation : { full : string, abbrev : string, biblio : string};

   // The values that have been set by the user for the fields.
   // This might store information that are not used by the current
   // medium, but were entered for another medium, in case the user
   // goes back to that medium
   cache        : { [name : string]: string} = {};

   static $inject = ['$scope', 'CitationTemplates', '$http', '$state'];
   constructor(
      public $scope    : SourceControllerScope,
      public templates : CitationTemplates,
      public $http     : angular.IHttpService,
      public $state    : angular.ui.IStateService)
   {
      templates.all_models().then(models => {
         this.source_types = models;
      });

      $scope.$watch('ctrl.source.medium', (val : string) => {
         templates.get_templates(val).then((t : CitationTemplate) => {
            this.citation = t;
            this.computeCitation();
         });
      });

      var s = this.source = $scope.source;
      this.saved_citation = {
         full:   s.title,
         abbrev: s.abbrev,
         biblio: s.biblio};
      $http.get('/data/sources/' + s.id + '/parts').then(
         (resp : ServerSourcePartsResp) => {
            this.extra_parts = [];
            angular.forEach(resp.data.parts, p => {
               this.cache[p.name] = p.value;

               // The list of parts stored in DB but not part of the
               // template

               if (this.citation &&
                  !(p.name in this.citation.fields))
               {
                  this.extra_parts.push(p);
               }
            });
         });

      $scope.$watch('ctrl.cache', () => this.computeCitation(), true);
   }

   computeCitation() {
      const c = (
         (this.source.medium && this.citation)
         ? this.citation.cite(this.cache)
         : this.saved_citation);
      if (c) {
         this.source.title = c.full;
         this.source.biblio = c.biblio;
         this.source.abbrev = c.abbrev;
      }
   }

   saveParts() {
      const data : { [name:string]:any } = angular.copy(this.source);
      angular.forEach(this.citation.fields, name => {
         if (this.cache[name]) {
            data[name] = this.cache[name];
         }
      });

      this.$http.post('/data/sources/' + this.source.id + '/saveparts', data).
         then((resp : ServerSourceViewResp) => {
            parse_SourceView_response(this.$scope, resp);
            this.$state.transitionTo(
               'source',
               {id: this.source.id}, // update URL if needed
               {location:'replace', reload:false});
         });
   }
};

/**
 * Source asserts
 */

const html_asserts = require('geneaprove/source_asserts.html');

app.directive('gpSourceAsserts', function() {
   return {
      scope: {
         source: '=gpSourceAsserts',
         asserts: '='
      },
      templateUrl: html_asserts,
      controller : SourceAssertsController,
      controllerAs: 'ctrl'
   }
});

class SourceAssertsController {
   static $inject = ['$scope'];
   constructor(
      public $scope  : SourceControllerScope)
   {
   }

   newAssert() {
      this.$scope.asserts.unshift({
         $edited: true,
         disproved: false,
         rationale: '',
         researcher: {id: undefined, name: 'you'},
         last_change: new Date(),
         source_id: this.$scope.source.id,
         surety: undefined,
         p1: {},
         p2: {}
      });
   }
}

/**
 * Editing the media for a source
 */
const html_media = require('geneaprove/source_media.html');

app.directive('gpSourceMedia', function() {
   return {
      scope: {
         source: '=gpSourceMedia',
         repr: '='
      },
      templateUrl: html_media,
      controller : SourceMediaController,
      controllerAs : 'ctrl'
   }
});

interface ServerAllReprData {
   source : ISource,
   repr   : IRepr[]
}
type ServerAllReprResp = angular.IHttpPromiseCallbackArg<ServerAllReprData>;

class SourceMediaController {
   img    : ZoomImage;
   current_repr : number = 0;

   static $inject = ['$scope', '$http'];
   constructor(
      public $scope : SourceControllerScope,
      public $http  : angular.IHttpService)
   {
      this.img    = new ZoomImage;
   }

   prevMedia() {
      this.current_repr--;
      if (this.current_repr < 0) {
         this.current_repr = this.$scope.repr.length - 1;
      }
   }

   nextMedia() {
      this.current_repr++;
      if (this.current_repr >= this.$scope.repr.length) {
         this.current_repr = 0;
      }
   }

   deleteCurrentRepr() {
      if (confirm(
         "This will remove this media as a representation of the source.\n"
         + "You will be given a chance not to delete the file.\n"
         + "Are you sure ?"))
      {
         const del = confirm(
            "OK to delete the media from the disk\nCancel to keep it");

         this.$http.post(
            '/data/sources/' + this.$scope.source.id
            + "/delRepr/" + this.$scope.repr[this.current_repr].id
            + "?ondisk=" + del, {})
         .then(() => {
            this.onupload(true /* preserveSelected */);
         });
      }
   }

   // If preserveSelected is true, we keep the same number for the
   // selected message.
   onupload(preserveSelected : boolean = false) {
      this.$http.get('/data/sources/' + this.$scope.source.id + '/allRepr').then(
         (resp : ServerAllReprResp) => {
            this.$scope.repr = resp.data.repr;

            // Select last item, which has just been uploaded
            if (!preserveSelected) {
               this.current_repr = this.$scope.repr.length - 1;
            }
            this.current_repr = Math.max(
               0, Math.min(this.current_repr, this.$scope.repr.length - 1));
         });
   }
}

/**
 * The page that displays and edits the details for a single source
 */

class SourceController {
   showCitation   : boolean;
   source         : ISource;
   repr           : IRepr[];
   asserts        : IAssertion[];
   higher_sources : ISource[]

   static $inject = ['$scope', '$http', '$stateParams'];
   constructor(
      $scope       : SourceControllerScope,
      $http        : angular.IHttpService,
      $stateParams : angular.ui.IStateParamsService)
   {
      let id = $stateParams['id'];
      if (id === undefined) {
         id = -1;
      }
      // Always display the citation if the source does not exist yet
      this.showCitation = id == -1;

      // ??? Should use a service instead
      $http.get('/data/sources/' + id).then((resp : ServerSourceViewResp) => {
         parse_SourceView_response($scope, resp);
         this.source = $scope.source;
         this.repr   = $scope.repr;
         this.asserts = $scope.asserts;
         this.higher_sources = $scope.higher_sources;
      });
   }

}

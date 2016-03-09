/**
 * Parse a JSON response from the server (the 'source' and 'parts' fields)
 */
function parse_SourceView_response($scope, resp) {
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

app.
config(function($stateProvider) {
   $stateProvider.
   state('sources', {
      url: '/sources/list',
      templateUrl: 'geneaprove/sources.html',
      controller: 'sourcesCtrl',
      data: {
         pageTitle: 'List of sources'
      }
   }).
   state('source_new', {
      url: '/sources/new',
      templateUrl: 'geneaprove/source.html',
      controller: 'sourceCtrl',
      data: {
         pageTitle: 'New Source'
      }
   }).
   state('source', {
      url: '/sources/:id',
      templateUrl: 'geneaprove/source.html',
      controller: 'sourceCtrl',
      data: {
         pageTitle: 'Source {{id}}'
      }
   });
}).

/**
 * A service that downloads, and caches, the list of citation templates.
 */
factory('CitationTemplates', function($http, $q) {
   var re_part = /\{([^}]+)\}/g;

   /**
    * The templates for a specific model.
    * @param {{full:string, biblio:string, short:string}} data The template.
    */
   function CitationTemplate(data) {
      var self = this;
      self.full = data.full;
      self.biblio = data.biblio;
      self.abbrev = data.short;
      self.fields = [];

      // Use an explicit order for citations, to get better control
      // on the order of fields in the UI.
      var found = {};
      angular.forEach([self.full, self.biblio, self.abbrev], function(cite) {
         var m;
         while ((m = re_part.exec(cite)) != null) {
            if (!found[m[1]]) {
               found[m[1]] = 1;
               self.fields.push(m[1]);
            }
         }
      });
   };

   /**
    * Resolve the template given some values for the fields.
    * @param {Object} vals    The values for the fields.
    * @returns {{full:string, biblio:string, abbrev:string}}
    */
   CitationTemplate.prototype.cite = function(vals) {
      var full = this.full || '';
      var biblio = this.biblio || '';
      var abbrev = this.abbrev || '';

      angular.forEach(this.fields, function(name) {
         // Use a function for the replacement, to protect "$" characters
         function repl() { return vals[name] || ''}
         full   = full.replace('{' + name + '}', repl);
         biblio = biblio.replace('{' + name + '}', repl);
         abbrev = abbrev.replace('{' + name + '}', repl);
      });

      /** Remove special chars like commas, quotes,... when they do not
       *  separate words, in case some parts has not been set.
       */
      function cleanup(str) {
         var s = ''
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

      return {full: cleanup(full),
              biblio: cleanup(biblio),
              abbrev: cleanup(abbrev)};
   };

   /**
    * The list of models
    */
   function CitationTemplates() {
      this.models = [];
      this.details = {  // for each model, the CitationTemplate
         '': new CitationTemplate({full: '', biblio: '', abbrev: ''})
      };
   }

   /**
    * Return a promise for the list of all known citation models
    */
   CitationTemplates.prototype.all_models = function() {
      var self = this;
      var d = $q.defer();
      if (self.models.length != 0) {
         d.resolve(self.models);
      } else {
         $http.get('/data/citationModels').then(function(resp) {
            self.models = [{id: '',
                            type: 'Select citation template',
                            category: ''}].
                concat(resp.data.source_types);
            d.resolve(self.models);
         }, function() {
            d.reject();
         });
      }
      return d.promise;
   };

   /**
    * Return the templates for a specific model.
    * @return a promise for an instance of the CitationTemplate class
    */

   CitationTemplates.prototype.get_templates = function(model_id) {
      var self = this;
      var d = $q.defer();
      if (this.details[model_id]) {
         d.resolve(this.details[model_id]);
      } else {
         $http.get('/data/citationModel/' + model_id).then(function(resp) {
            d.resolve(
               self.details[model_id] = new CitationTemplate(resp.data));
         }, function() {
            d.reject();
         });
      }
      return d.promise;
   };

   return new CitationTemplates;
}).

/**
 * The page that displays the list of sources
 */

controller('sourcesCtrl', function($scope, Paginated) {
   Paginated.instrument($scope, '/data/sources/list', 'settings.sources.rows');
}).

/**
 * Editing the citation for a source
 */

directive('gpSourceCitation', function(CitationTemplates, $http, $state) {
   return {
      scope: {
         source: '=gpSourceCitation',
         higherSources: '='
      },
      templateUrl: 'geneaprove/source_citation.html',
      controller: function($scope) {
         // The CitationTemplate for the currently selected medium
         $scope.citation = undefined;

         CitationTemplates.all_models().then(function(models) {
            $scope.source_types = models;
         });

         $scope.$watch('source.medium', function(val) {
            CitationTemplates.get_templates(val).then(function(template) {
               $scope.citation = template;
               computeCitation();
            });
         });

         var s = $scope.source;
         var saved_citation = {
            full:   s.title,
            abbrev: s.abbrev,
            biblio: s.biblio};
         $http.get('/data/sources/' + s.id + '/parts').then(
            function(resp) {
               $scope.extra_parts = [];
               angular.forEach(resp.data.parts, function(p) {
                  $scope.cache[p.name] = p.value;

                  // The list of parts stored in DB but not part of the
                  // template

                  if ($scope.citation &&
                     !(p.name in $scope.citation.fields))
                  {
                     $scope.extra_parts.push(p);
                  }
               });
            });

         // The values that have been set by the user for the fields.
         // This might store information that are not used by the current
         // medium, but were entered for another medium, in case the user
         // goes back to that medium
         $scope.cache = {};
         $scope.$watch('cache', computeCitation, true);

         function computeCitation() {
            if (s.medium) {
               var c = $scope.citation.cite($scope.cache);
            } else {
               c = saved_citation;
            }
            if (c) {
               s.title = c.full;
               s.biblio = c.biblio;
               s.abbrev = c.abbrev;
            }
         }

         $scope.saveParts = function() {
           //  ??? Should use a service instead
           var data = angular.copy($scope.source);
           angular.forEach($scope.citation.fields, function(name) {
              if ($scope.cache[name]) {
                 data[name] = $scope.cache[name];
              }
           });

           $http.post('/data/sources/' + $scope.source.id + '/saveparts', data).
              then(function(resp) {
                 parse_SourceView_response($scope, resp);
                 $state.transitionTo(
                    'source',
                    {id: $scope.source.id}, // update URL if needed
                    {location:'replace', reload:false});
              });
         };
     }
   };
}).

/**
 * Source asserts
 */

directive('gpSourceAsserts', function() {
   return {
      scope: {
         source: '=gpSourceAsserts',
         asserts: '='
      },
      templateUrl: 'geneaprove/source_asserts.html',
      controller: function($scope) {
         $scope.newAssert = function() {
            $scope.asserts.unshift({
               $edited: true,
               disproved: false,
               rationale: '',
               researcher: {id: undefined, name: 'you'},
               last_change: new Date(),
               source_id: $scope.source.id,
               surety: undefined,
               p1: {},
               p2: {}
            });
         };
      }
   };
}).

/**
 * Editing the media for a source
 */
directive('gpSourceMedia', function() {
   return {
      scope: {
         source: '=gpSourceMedia',
         repr: '='
      },
      templateUrl: 'geneaprove/source_media.html',
      controller: function($scope, $http, ZoomImage) {
         $scope.img = new ZoomImage();
         $scope.current_repr = 0;
         $scope.prevMedia = function() {
            $scope.current_repr--;
            if ($scope.current_repr < 0) {
               $scope.current_repr = $scope.repr.length - 1;
            }
         };
         $scope.nextMedia = function() {
            $scope.current_repr++;
            if ($scope.current_repr >= $scope.repr.length) {
               $scope.current_repr = 0;
            }
         };

         $scope.deleteCurrentRepr = function() {
            if (confirm(
               "This will remove this media as a representation of the source.\n"
               + "You will be given a chance not to delete the file.\n"
               + "Are you sure ?"))
            {
               var del = confirm(
                     "OK to delete the media from the disk\nCancel to keep it");

               $http.post(
                  '/data/sources/' + $scope.source.id
                  + "/delRepr/" + $scope.repr[$scope.current_repr].id
                  + "?ondisk=" + del)
               .then(function() {
                  $scope.onupload(true /* preserveSelected */);
               });
            }
         };

         // If preserveSelected is true, we keep the same number for the
         // selected message.
         $scope.onupload = function(preserveSelected) {
            $http.get('/data/sources/' + $scope.source.id + '/allRepr').then(
                  function(resp) {
                     $scope.repr = resp.data.repr;

                     // Select last item, which has just been uploaded
                     if (!preserveSelected) {
                        $scope.current_repr = $scope.repr.length - 1;
                     }
                     $scope.current_repr = Math.max(
                        0, Math.min($scope.current_repr, $scope.repr.length - 1));
                  })
         };
      }
   };
}).

/**
 * The page that displays and edits the details for a single source
 */

controller('sourceCtrl', function($scope, $http, $state, $stateParams) {
   var id = $stateParams.id;
   if (id === undefined) {
      id = -1;
   }
   // Always display the citation if the source does not exist yet
   $scope.showCitation = id == -1;
   $scope.source = {}

   // ??? Should use a service instead
   $http.get('/data/sources/' + id).then(function(resp) {
      parse_SourceView_response($scope, resp);
   });

});

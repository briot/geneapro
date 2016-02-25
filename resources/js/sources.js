app.
config(function($stateProvider) {
   $stateProvider.
   state('sources', {
      url: '/sources/list',
      templateUrl: 'geneaprove/sources.html',
      controller: 'sourcesCtrl',
      data: {
         pageTitle: '[GeneaProve] List of sources'
      }
   }).
   state('source_new', {
      url: '/sources/new',
      templateUrl: 'geneaprove/source.html',
      controller: 'sourceCtrl',
      data: {
         pageTitle: '[GeneaProve] New Source'
      }
   }).
   state('source', {
      url: '/sources/:id',
      templateUrl: 'geneaprove/source.html',
      controller: 'sourceCtrl',
      data: {
         pageTitle: '[GeneaProve] Source {{id}}'
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
      var full = this.full;
      var biblio = this.biblio;
      var abbrev = this.abbrev;

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
 * The page that displays and edits the details for a single source
 */

controller('sourceCtrl', function(
         $scope, $http, $state, $stateParams, CitationTemplates, ZoomImage)
{
   var id = $stateParams.id;
   if (id === undefined) {
      id = -1;
   }
   // The values that have been set by the user for the fields. This might
   // store information that are not used by the current medium, but were
   // entered for another medium, in case the user goes back to that medium
   $scope.cache = {};

   // The CitationTemplate for the currently selected medium
   $scope.citation = undefined;

   // Always display the citation if the source does not exist yet
   $scope.showCitation = id == -1;
   $scope.source = {}
   $scope.img = new ZoomImage();

   // ??? Should use a service instead
   $http.get('/data/sources/' + id).then(function(resp) {
      parseJson(resp);
   });

   CitationTemplates.all_models().then(function(models) {
      $scope.source_types = models;
   });

   $scope.$watch('source.medium', function(val) {
      CitationTemplates.get_templates(val).then(function(template) {
         $scope.citation = template;
         computeCitation();
      });
   });

   $scope.$watch('cache', computeCitation, true);

   function computeCitation() {
      if ($scope.source.medium) {
         var c = $scope.citation.cite($scope.cache);
      } else {
         c = $scope.source._saved_citation;
      }
      if (c) {
         $scope.source.title = c.full;
         $scope.source.biblio = c.biblio;
         $scope.source.abbrev = c.abbrev;
      }
   }

   // Parse a JSON response from the server (the 'source' and 'parts'
   // fields)
   function parseJson(resp) {
      $scope.source = resp.data.source;
      $scope.asserts = resp.data.asserts;
      $scope.repr = resp.data.repr;
      $scope.current_repr = 0;

      if ($scope.source.id == null) {
         $scope.source.id = -1;
      }
      if ($scope.source.medium == null) {
         $scope.source.medium = '';
      }
      $scope.source._saved_citation = {
         full:  $scope.source.title,
         abbrev: $scope.source.abbrev,
         biblio: $scope.source.biblio};

      var parts = resp.data.parts; // [{fromHigher, name, value}]
      $scope.extra_parts = [];
      angular.forEach(parts, function(p) {
         $scope.cache[p.name] = p.value;

         // The list of parts stored in DB but not part of the template
         if ($scope.citation && !(p.name in $scope.citation.fields)) {
            $scope.extra_parts.push(p);
         }
      });
   }

   $scope.prevImage = function() {
      $scope.current_repr--;
   };
   $scope.nextImage = function() {
      $scope.current_repr++;
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
            $scope.onupload(true /* preserveSelected */);  //  refresh teh list
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
            parseJson(resp);
            $state.transitionTo(
               'source',
               {id: $scope.source.id},
               {location:'replace', reload:false});
         });
   };
});

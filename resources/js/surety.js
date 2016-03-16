/**
 * A service that downloads information about the surety schemes created
 * by the user, and provide that information asynchronously.
 * The service must be used asynchronously:
 *     function controller(suretySchemes) {
 *        suretySchemes.then(function(data) {
 *           // data is of type SuretySchemes, see below
 *         });
 *     }
 */
app.factory('suretySchemes', function($http, $q) {
   class SuretySchemes {
      constructor(schemes, parts) {
         this.schemes = schemes;
         this.parts = parts;
      }
      partFromId(id) {
         return this.parts[id];
      }
      schemeFromPart(partid) {
         const p = this.parts[partid];
         return p && this.schemes[p.scheme];
      }
   }

   const q = $q.defer();
   $http.get('data/suretySchemes').then(function(resp) {
      const schemes = resp.data;
      let parts = {};
      angular.forEach(schemes, function(s, s_idx) {
         angular.forEach(s.parts, function(p) {
            parts[p.id] = p;
            p.scheme = s_idx;
         });
      });
      q.resolve(new SuretySchemes(schemes, parts));
   }, function() {
      q.reject();
   });

   return q.promise;
}).

directive('gpSurety', function(suretySchemes) {
   return {
      scope: {
         surety: '=gpSurety'
      },
      replace: true,
      link: function(scope) {
         suretySchemes.then(function(data) {
            const scheme = data.schemeFromPart(scope.surety);
            const part = data.partFromId(scope.surety);
            if (scheme) {
               scope.parts = scheme.parts;
               scope.selected = part.sequence;
            }
         });
      },
      template: '<ul class="rating">' +
         '<li ng-repeat="p in parts" title="{{p.name}}&#10;{{p.description}}">' +
            '<i ng-if="p.sequence<=selected" class="filled fa fa-star"></i>' +
            '<i ng-if="p.sequence>selected" class="fa fa-circle"></i>' +
         '</li>' +
         '</ul>'
   };
});

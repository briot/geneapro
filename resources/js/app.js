const app = angular.module(
      'geneaprove',
      ['ui.router',
       'LocalStorageModule',
       'lr.upload',
       'ngSanitize', //'ngDialog', 'ngQuickDate', 'ngCsv',
      ]).

config(function($urlRouterProvider, $httpProvider) {
      $urlRouterProvider.otherwise('/');

      // Support for django csrf
      $httpProvider.defaults.xsrfCookieName = 'csrftoken';
      $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}).

run(function(gpd3, $rootScope, localStorageService, $state, $interpolate) {
   // (readonly, set via Pedigree.select())
   $rootScope.decujus = 1;

   $rootScope.$state = $state;

   // Change the window title automatically using state's data.pageTitle
   // parameter. Only the state data is available for substitution.
   $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams) {
      $rootScope.pageTitle = (
         toState.data ?
            $interpolate(toState.data.pageTitle)(toParams) : 'Geneaprove');
   });


   const defaultSettings = {
      // Show a tick mark next to events with a souce
      sourcedEvents: false,

      personas: {
         colorScheme: gpd3.colorScheme.TRANSPARENT,
         rows: 10    // Rows per page
      },

      sources: {
         rows: 10     // Rows per page
      },

      places: {
         colorScheme: gpd3.colorScheme.TRANSPARENT
      },

      pedigree: {
         layoutScheme: gpd3.layoutScheme.COMPACT,
         colorScheme: gpd3.colorScheme.PEDIGREE,
         appearance: gpd3.appearance.GRADIENT,
         linkStyle: gpd3.linkStyle.CURVE,

         // Number of generations to display
         gens: 4,
         descendant_gens: 1,

         // Whether to show marriages
         showMarriages: true,

         // Whether all boxes have the same size. Else the size decreases with
         // the generation.
         sameSize: true,

         // Whether to show additional details as we zoom in
         showDetails: true,

         // Padding on the side of each boxes.
         horizPadding: 40,

         // Minimal vertical space between two boxes
         vertPadding: 20   // same as textHeight
      },

      radial: {
         gens: 6,
         colorScheme: gpd3.colorScheme.WHITE,
         appearance: gpd3.appearance.FLAT,
         showText: true
      },

      fanchart: {
         colorScheme: gpd3.colorScheme.PEDIGREE,
         appearance: gpd3.appearance.GRADIENT,

         // Whether to show missing persons
         showMissing: false,

         // Whether to rotate the names on the lower half of the circle, to
         // make them more readable. If false, they are up-side down
         readableNames: true,

         // Number of generations to display
         gens: 4,

         // Size (in degrees) of the display
         angle: 200,

         // Space between couples
         space: 0,

         // Whether to show marriages
         showMarriages: false
      }
   };

   $rootScope.settings = angular.extend(
       {}, defaultSettings, localStorageService.get('settings'));

   $rootScope.$watch('settings', function() {
      $rootScope.cleanupSettings();
      localStorageService.set('settings', $rootScope.settings);
   }, true);

   /**
    * Reset the settings
    */
   $rootScope.resetSettings = function(which) {
      if (which == 'fanchart') {
         angular.extend($rootScope.settings.fanchart, defaultSettings.fanchart);
      } else if (which == 'pedigree') {
         angular.extend($rootScope.settings.fanchart, defaultSettings.fanchart);
      } else {
         angular.extend($rootScope.settings, defaultSettings);
      }
      $rootScope.cleanupSettings();
   };

   /** Ensure that the settings are consistent. In particular, convert
    * the enumeration types back to integers: when they have been modified
    * via the GUI, they might have been set as strings.
    */
   $rootScope.cleanupSettings = function() {
      let p = $rootScope.settings.pedigree;
      p.colorScheme = +p.colorScheme;
      p.appearance = +p.appearance;
      p.layoutScheme = +p.layoutScheme;
      p.linkStyle = +p.linkStyle;

      p = $rootScope.settings.fanchart;
      p.colorScheme = +p.colorScheme;
      p.appearance = +p.appearance;
      p.layoutScheme = +p.layoutScheme;

      p = $rootScope.settings.radial;
      p.colorScheme = +p.colorScheme;
      p.appearance = +p.appearance;

      p = $rootScope.settings.personas;
      p.colorScheme = +p.colorScheme;
   };
});

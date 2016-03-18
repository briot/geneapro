/**
 * Save persistent settings for the various views
 */

/// <reference path="./basetypes.ts" />
/// <reference path="typings/angular-local-storage/angular-local-storage" />

module GP {

   export class Settings {
      private static _default : IApplicationSettings = {
         sourcedEvents: false,
         personas: {
            colorScheme: colorScheme.TRANSPARENT,
            rows: 10 
         },
         sources: {
            rows: 10
         },
         places: {
            colorScheme: colorScheme.TRANSPARENT
         },
         pedigree: {
            layoutScheme: layoutScheme.COMPACT,
            colorScheme: colorScheme.PEDIGREE,
            appearance: appearance.GRADIENT,
            linkStyle: linkStyle.CURVE,
            gens: 4,
            descendant_gens: 1,
            showMarriages: true,
            sameSize: true,
            showDetails: true,
            horizPadding: 40,
            vertPadding: 20
         },
         radial: {
            gens: 6,
            colorScheme: colorScheme.WHITE,
            appearance: appearance.FLAT,
            showText: true
         },
         fanchart: {
            colorScheme: colorScheme.PEDIGREE,
            appearance: appearance.GRADIENT,
            showMissing: false,
            readableNames: true,
            gens: 4,
            angle: 200,
            space: 0,
            showMarriages: false
         }
      }

      public settings : IApplicationSettings;

      constructor(saved ?: IApplicationSettings) {
         this.settings = angular.extend({}, Settings._default, saved);
      }

      /**
       * Reset the settings for a particular view
       */
      reset(viewName : string) {
         switch(viewName) {
            case 'fanchart':
               this.settings.fanchart = Settings._default.fanchart;
               break;
            case 'pedigree':
               this.settings.pedigree = Settings._default.pedigree;
               break;
         }
         this.cleanup();
      }

      /**
       * Ensure that the settings are consistent. In particular, convert the
       * enumeration types back to integers: when they haev been modified via
       * the GUI, they might have been set as strings.
       */
      cleanup() {
         let p = this.settings.pedigree;
         p.colorScheme = +p.colorScheme;
         p.appearance = +p.appearance;
         p.layoutScheme = +p.layoutScheme;
         p.linkStyle = +p.linkStyle;

         let f = this.settings.fanchart;
         f.colorScheme = +f.colorScheme;
         f.appearance = +f.appearance;

         let r = this.settings.radial;
         r.colorScheme = +r.colorScheme;
         r.appearance = +r.appearance;

         let a = this.settings.personas;
         a.colorScheme = +a.colorScheme;
      }
   }

   app.run(['localStorageService', '$rootScope',
            function(localStorageService : angular.local.storage.ILocalStorageService,
                     $rootScope : IGPRootScope)
            {
               var s = new Settings(
                  localStorageService.get<IApplicationSettings>('settings'));
               $rootScope.settings = s.settings;
               $rootScope.$watch('settings', () => {
                  s.cleanup();
                  localStorageService.set('settings', s.settings)
               }, true);
            }]);
}

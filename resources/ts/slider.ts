import {} from 'angular';
import {app} from './app';

interface SliderScope extends angular.IScope {
   ngModel : any,
   min     : string,
   max     : string,
   val    ?: number;
}

/**
 * A horizontal slider
 */
app.directive('gpSlider', ($document : angular.IDocumentService) => {
   return {
      scope: {
         ngModel: '=',
         min: '@',
         max: '@'
      },
      link: (scope : SliderScope, element : angular.IAugmentedJQuery) => {
         const a = element.find('a');
         const min = parseFloat(scope.min);
         const range = parseFloat(scope.max) - min;
         scope.val = scope.ngModel;

         function update(val = min, notify : boolean = false) {
            const r = (val - min) / (range) * 100;
            a.css('left', r + '%');
            if (notify) {  // val != scope.val) {
               scope.val = Math.floor(val);
               scope.$apply();
            }
         }
         update(scope.ngModel, false);

         element.bind('click', function(event) {
            const r = element[0].getBoundingClientRect();
            let ratio = (event.clientX - r.left) / r.width;
            ratio = Math.max(Math.min(ratio, 1), 0);
            scope.ngModel = Math.floor(min + ratio * range);
            update(scope.ngModel, true /* notify */);
         });

         a.bind('mousedown', function(event) {
            event.stopPropagation();
            event.preventDefault();
            a.addClass('active');
            $document.bind('mousemove', function(event) {
               const r = element[0].getBoundingClientRect();
               let ratio = (event.clientX - r.left) / r.width;
               ratio = Math.max(Math.min(ratio, 1), 0);
               update(min + ratio * range, true /* notify */);
            });
            $document.bind('mouseup', function() {
               a.removeClass('active');
               $document.unbind('mousemove');
               $document.unbind('mouseup');
               scope.ngModel = scope.val;
               scope.$apply();
            });
         });

      },
      replace: true,
      template: '<div class="ui-slider horizontal">' +
         '<span>{{min}}</span>' +
         '<span class="right">{{max}}</span>' +
         '<a href=""><span class="handle"></span><span class="bubble">{{val}}</span></a>' +
         '</div>'
   };
});

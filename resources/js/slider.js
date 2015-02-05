/**
 * A horizontal slider
 */
app.directive('gpSlider', function($document) {
   return {
      scope: {
         ngModel: '=',
         min: '@',
         max: '@'
      },
      link: function(scope, element) {
         var a = element.find('a');
         var min = parseFloat(scope.min);
         var range = parseFloat(scope.max) - min;
         scope.val = scope.ngModel;

         function update(val, notify) {
            val = val || scope.min;
            var r = (val - scope.min) / (range) * 100;
            a.css('left', r + '%');
            if (notify) {  // val != scope.val) {
               scope.val = Math.floor(val);
               scope.$apply();
            }
         }
         update(scope.ngModel, false);

         element.bind('click', function(event) {
            var r = element[0].getBoundingClientRect();
            var ratio = (event.clientX - r.left) / r.width;
            ratio = Math.max(Math.min(ratio, 1), 0);
            scope.ngModel = Math.floor(min + ratio * range);
            update(scope.ngModel, true /* notify */);
         });

         a.bind('mousedown', function(event) {
            event.stopPropagation();
            event.preventDefault();
            a.addClass('active');
            $document.bind('mousemove', function(event) {
               var r = element[0].getBoundingClientRect();
               var ratio = (event.clientX - r.left) / r.width;
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

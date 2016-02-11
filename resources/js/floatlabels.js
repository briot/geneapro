app.

/**
 * A form input with a floating label on top of it.
 * The label plays the role of a placeholder, but is still displayed when
 * the input contains some input.
 */
directive('gpFloatLabel', function() {
   var id=0;

   return {
      scope: {
         model: '=',
         title: '@',
         label: '@',
         size: '@'   // number of columns, defaults to 6
      },
      replace: true,
      link: function(scope, element, attr) {
         scope.id = id++;
         scope.size = scope.size || 6;
      },
      template: function(elem, attrs) {
         if (attrs['lines']) {
            var type='textarea rows=' + attrs['lines'];
         } else {
            type='input type=text';
         }

         var r = (attrs['readonly']) ? ' readonly' : '';

         return '<div class="col-md-{{size}} form-group floatlabel">'
       +    '<' + type + r + ' class="form-control"'
       +        ' ng-class="{nonempty: model || model==0 || model.length>0}"'
       +        ' ng-model="model"'
       +        ' id="floatlabel{{id}}"'
       +        ' title="{{title}}"></' + type + '>'
       +    '<label for="floatlabel{{id}}">{{label}}</label>'
       + '</div>';
      }
   };
});

app.

/**
 * A form input with a floating label on top of it.
 * The label plays the role of a placeholder, but is still displayed when
 * the input contains some input.
 */
directive('gpFloatLabel', function() {
   let id=0;

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
         const type = (
            attrs['lines']
            ? 'textarea rows=' + attrs['lines']
            : 'input type=text');
         const r = (attrs['readonly']) ? ' readonly' : '';
         return '<div class="col-md-{{size}} form-group floatlabel">'
       +    '<' + type + r + ' class="form-control"'
       +        ' ng-class="{nonempty: model===0 || model.length}"'
       +        ' ng-model="model"'
       +        ' id="floatlabel{{id}}"'
       +        ' title="{{title}}"></' + type + '>'
       +    '<label for="floatlabel{{id}}">{{label}}</label>'
       + '</div>';
      }
   };
});

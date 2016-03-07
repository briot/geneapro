app.
directive('gpAssertPerson', function() {
   return {
      scope: {
         person: '=gpAssertPerson'
      },
      template:
        '<span persona-link="person.id" name="person.name"></span>'
   };
}).

directive('gpAssertEvent', function() {
   return {
      scope: {
         event: '=gpAssertEvent',
         role: '='
      },
      template:
         '<span'
       +    '<span>'
       +       '{{event.name || event.type.name}}'
       +       '<span ng-if="role!=\'principal\'" class="role">(as {{role || ""}})</span>'
       +    '</span>'
       +    '<br>'
       +    '<span time-link="event.date_sort" name="event.date" style="margin-right:10px"></span>'
       +    '<span place-link="event.place.id" name="event.place.name"></span>'
       + '</span>'
   };
}).

directive('gpAssertCharacteristic', function() {
   return {
      scope: {
         char: '=gpAssertCharacteristic',
         parts: '='
      },
      template:
         '<span>'
       +    '{{char.name}}'
       +    '<span ng-if="parts.length == 1">: {{parts[0].value}}'
       +    '</span>'
       +    '<span ng-if="parts.length != 1">'
       +       '<span ng-repeat="p in parts">'
       +          '<span class="char">{{p.name}}</span>: {{p.value}}<br>'
       +       '</span>'
       +    '</span>'
       +    '<br>'
       +    '<span time-link="char.date_sort" name="char.date" style="margin-right:10px"></span>'
       +    '<span place-link="char.place.id" name="char.place.name"></span>'
       + '</span>'
   };
}).

directive('gpAssertGroup', function() {
   return {
      scope: {
         group: '=gpAssertGroup',
         role: '='
      },
      template:
         '<span>'
       +    '{{group.name}} ({{role}})'
       +    '<br>'
       +    '<span time-link="group.date_sort" name="group.date" style="margin-right:10px"></span>'
       +    '<span place-link="group.place.id" name="group.place.name"></span>'
       + '</span>'
   };
});

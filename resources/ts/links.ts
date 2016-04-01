import {Component, Input, Pipe} from '@angular/core';
import {CORE_DIRECTIVES} from '@angular/common';
import {RouterLink} from '@angular/router-deprecated';

@Pipe({name: 'linky', pure: true})
export class Linky {
   transform(str : string) {
      return str && str.replace(/(https?:\/\/[a-zA-Z0-9:_+.]+)/, '<a href="$1">$1</a>');
   }
}

@Component({
   selector: 'persona-link',
   template: require('./links.persona.html'),
   directives: [CORE_DIRECTIVES, RouterLink]
})
export class PersonaLink {
   @Input() id : number;   //  The id of the person
   @Input() name : string; //  Default to Id
}

@Component({
   selector: 'place-link',
   template: require('./links.place.html'),
   directives: [CORE_DIRECTIVES, RouterLink]
})
export class PlaceLink {
   @Input() id : number;   //  The id of the place
   @Input() name : string; //  Default to Id
}

@Component({
   selector: 'source-link',
   template: require('./links.source.html'),
   directives: [CORE_DIRECTIVES, RouterLink],
   pipes:      [Linky]
})
export class SourceLink {
   @Input() id : number;   //  The id of the place
   @Input() name : string; //  Default to Id
   @Input() sourceTitle : string;
}


import {Component, Input} from '@angular/core';

@Component({
   selector: 'persona-link',
   template: require('./links.persona.html')
})
export class PersonaLink {
   @Input() id : number;   //  The id of the person
   @Input() name : string; //  Defaults to Id
}

@Component({
   selector: 'place-link',
   template: require('./links.place.html')
})
export class PlaceLink {
   @Input() id : number;   //  The id of the place
   @Input() name : string; //  Defaults to Id
}

@Component({
   selector: 'source-link',
   template: require('./links.source.html')
})
export class SourceLink {
   @Input() id : number;   //  The id of the place
   @Input() name : string; //  Defaults to Id
   @Input() sourceTitle : string;
}

@Component({
   selector: 'time-link',
   template: require('./links.time.html')
})
export class TimeLink {
   @Input() on : {date:string, date_sort:string};
}


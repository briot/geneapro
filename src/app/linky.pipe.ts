import {Pipe} from '@angular/core';

@Pipe({name: 'linky', pure: true})
export class Linky {
   transform(str : string) {
      return str && str.replace(/(https?:\/\/[a-zA-Z0-9:_+.]+)/, '<a href="$1">$1</a>');
   }
}

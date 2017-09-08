import * as React from 'react';
import { GenealogyEvent, event_to_string } from '../Store/Event';

class EventTextProps {
   prefix: string;
   showSources?: boolean;  // show tick for events with sources
   event?: GenealogyEvent;
}

export default function EventText(props: EventTextProps) {
   const event = props.event;
   return event ? (
      <tspan className="details" dy="1.2em" x="2" fontSize="0.8em">
         {props.prefix + ': ' + event_to_string(event, props.showSources) +
          (event.place ? ' - ' + event.place.name : '')}
      </tspan>
   ) : null;
}

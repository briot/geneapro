import * as React from 'react';
import { GenealogyEvent, event_to_string } from '../Store/Event';
import { PlaceSet } from '../Store/Place';

class EventTextProps {
   prefix: string;
   showSources?: boolean;  // show tick for events with sources
   event?: GenealogyEvent;
   allPlaces: PlaceSet;
}

export default function EventText(props: EventTextProps) {
   const event = props.event;
   return event ? (
      <tspan className="details" dy="1.2em" x="2" fontSize="0.8em">
         {props.prefix + ': ' +
          event_to_string(event, props.showSources) +
          (event.placeId && event.placeId in props.allPlaces ?
              ' - ' + props.allPlaces[event.placeId].name :
              '')}
      </tspan>
   ) : null;
}

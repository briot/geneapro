import * as React from "react";

interface EventTextProps {
   prefix: string;
   isoDate?: string;
}

export default function EventText(props: EventTextProps) {
   return props.isoDate ? (
      <tspan className="details" dy="1.2em" x="2" fontSize="0.8em">
         {props.prefix + ": " + props.isoDate}
      </tspan>
   ) : null;
}

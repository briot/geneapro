import * as React from 'react';
import { Loader, Rating, Segment } from 'semantic-ui-react';
import { GenealogyEvent } from '../Store/Event';
import { PersonaLink, SourceLink } from '../Links';

interface PersonaEventDetailsProps {
   event: GenealogyEvent;
}

export default function PersonaEventDetails(props: PersonaEventDetailsProps) {
   if (props.event.persons === undefined) {
      return <Loader active={true} size="small">Loading</Loader>;
   }
   return (
      <Segment.Group className="eventDetails">
         {props.event.persons.map(
            (p) => (
               <Segment key={p.id}>
                  <div>
                     <Rating
                        style={{float: 'right'}}
                        rating={1}   /* ??? Incorrect */
                        size="mini"
                        maxRating={5}
                     />
                     <span
                        style={{float: 'right'}}
                     >
                        <SourceLink id={p.sourceId} />
                     </span>
                     <span className="role">{p.role}</span>
                     <PersonaLink
                        className="name"
                        id={p.id}
                        givn={p.name}
                     />
                  </div>
                  <div className="rationale">
                     {p.rationale}
                  </div>
               </Segment>
            )
          )
         }
      </Segment.Group>
   );
}

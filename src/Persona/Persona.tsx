import * as React from "react";
import { Icon } from "semantic-ui-react";
import { GPDispatch, MetadataDict } from "../Store/State";
import { Assertion } from "../Store/Assertion";
import { Segment } from "semantic-ui-react";
import {
   AssertionEntities,
   AssertionEntitiesJSON,
   assertionFromJSON,
   usePersonAssertsCount,
   fetchPersonAsserts,
   mergeAssertionEntities,
   setAssertionEntities
} from "../Server/Person";
import { Person, personDisplay } from "../Store/Person";
import { extractYear } from "../Store/Event";
import { AssertionTimeline } from "../Assertions/AssertionTimeline";
import { InfiniteRowFetcher } from "../InfiniteList";
import "./Persona.css";

interface PersonaProps {
   dispatch: GPDispatch;
   metadata: MetadataDict;
   person: Person;
}

const Persona: React.FC<PersonaProps> = (p) => {
   const [entities, setEntities] = React.useState<AssertionEntities>({
      events: {}, persons: {}, places: {}, sources: {},
   });
   const person: Person = p.person;
   const birthYear = extractYear(person.birthISODate);
   const deathYear = extractYear(person.deathISODate);
   const count = usePersonAssertsCount(person.id);

   const fetchAsserts: InfiniteRowFetcher<Assertion> = React.useCallback(
      (fp) => {
         return fetchPersonAsserts({
            id: person.id,
            limit: fp.limit,
            offset: fp.offset
         }).then((a: AssertionEntitiesJSON) => {
            const r: AssertionEntities = {
               events: {},
               persons: {},
               places: {},
               sources: {}};
            setAssertionEntities(a, r);
            setEntities(e => mergeAssertionEntities(e, r));
            return a.asserts.map(assertionFromJSON);
         });
      },
      [person.id]
   );

   return (
      <div className="Persona">
         <Segment attached={true} className="pagetitle">
            <Icon
               className="gender"
               name={
                  person.sex === "M"
                     ? "man"
                     : person.sex === "F"
                     ? "woman"
                     : "genderless"
               }
            />
            {personDisplay(person)}
            <span className="lifespan">
               {birthYear} - {deathYear}
            </span>
         </Segment>
         <Segment attached={true} className="pageContent">
            {
               <AssertionTimeline
                  dispatch={p.dispatch}
                  entities={entities}
                  fetchAsserts={fetchAsserts}
                  fullHeight={true}
                  metadata={p.metadata}
                  refYear={birthYear}
                  hidePersonIf={person.id}
                  rowCount={count}
               />
            }
         </Segment>
      </div>
   );
}
export default Persona;

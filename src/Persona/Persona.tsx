import * as React from "react";
import { Icon } from "semantic-ui-react";
import { GPDispatch, MetadataDict } from "../Store/State";
import { P2C } from "../Store/Assertion";
import { Segment } from "semantic-ui-react";
import { AssertionEntities } from "../Server/Person";
import { Person, personDisplay } from "../Store/Person";
import { extractYear } from "../Store/Event";
import { AssertionTimelineFromList } from "../Assertions/AssertionTimeline";
import "./Persona.css";

interface PersonaProps {
   dispatch: GPDispatch;
   entities: AssertionEntities;
   metadata: MetadataDict;
   person: Person;
}

function Persona(props: PersonaProps) {
   const p: Person = props.person;
   const birthYear = extractYear(p.birthISODate);
   const deathYear = extractYear(p.deathISODate);

   let gender = "";
   if (p.asserts) {
      gender = p.asserts.get()
         .filter(a => a instanceof P2C)
         .flatMap(a => (a as P2C).characteristic.parts)
         .filter(part => part.type === props.metadata.char_part_SEX)
         .map(p => p.value)[0] || '';
   }

   return (
      <div className="Persona">
         <Segment attached={true} className="pagetitle">
            <Icon
               className="gender"
               name={
                  gender === "M"
                     ? "man"
                     : gender === "F"
                     ? "woman"
                     : "genderless"
               }
            />
            {personDisplay(p)}
            <span className="lifespan">
               {birthYear} - {deathYear}
            </span>
         </Segment>
         <Segment attached={true} className="pageContent">
            {
               p.asserts &&
               <AssertionTimelineFromList
                  asserts={p.asserts}
                  dispatch={props.dispatch}
                  entities={props.entities}
                  metadata={props.metadata}
                  refYear={birthYear}
                  hidePersonIf={p.id}
               />
            }
         </Segment>
      </div>
   );
}
export default Persona;

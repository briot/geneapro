import * as React from "react";
import { connect } from "react-redux";
import { Icon } from "semantic-ui-react";
import * as GP_JSON from "../Server/JSON";
import { AppState, GPDispatch, MetadataDict } from "../Store/State";
import { P2C } from "../Store/Assertion";
import { Segment } from "semantic-ui-react";
import { Person, personDisplay } from "../Store/Person";
import { GenealogyEventSet, extractYear } from "../Store/Event";
import AssertionTimeline from "../Assertions/AssertionTimeline";
import "./Persona.css";

interface PersonaProps {
   person: Person;
   events: GenealogyEventSet;
   metadata: MetadataDict;
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
            <AssertionTimeline
               asserts={p.asserts}
               refYear={birthYear}
               hidePersonIf={p.id}
            />
         </Segment>
      </div>
   );
}
export default Persona;

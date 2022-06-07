import * as React from "react";
import AssertionPart from "../Assertions/AssertionPart";
import { PersonaLink } from "../Links";
import { Person } from "../Store/Person";

/**
 * Person Part
 * One of the two components of an assertion, a person
 */

interface PersonProps {
   person: Person;
}
const AssertionPartPerson: React.FC<PersonProps> = (p) => {
   return <AssertionPart title={<PersonaLink person={p.person} />} />;
}
export default AssertionPartPerson;

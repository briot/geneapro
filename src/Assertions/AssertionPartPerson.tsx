import * as React from 'react';
import AssertionPart from '../Assertions/AssertionPart';
import { PersonaLink } from '../Links';

/**
 * Person Part
 * One of the two components of an assertion, a person
 */

interface PersonProps {
   personId: number;
}

export default class AssertionPartPerson extends React.PureComponent<PersonProps> {
   public render() {
      return (
         <AssertionPart title={<PersonaLink id={this.props.personId} />} />
      );
   }
}

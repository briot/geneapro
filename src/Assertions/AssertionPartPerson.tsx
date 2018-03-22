import * as React from 'react';
import { connect } from 'react-redux';
import { AppState, GPDispatch } from '../Store/State';
import { PersonSet, personDisplay } from '../Store/Person';
import AssertionPart from '../Assertions/AssertionPart';

/**
 * Person Part
 * One of the two components of an assertion, a person
 */

interface PersonProps {
   personId: number;
}
interface ConnectedPersonProps extends PersonProps {
   persons: PersonSet;
   dispatch: GPDispatch;
}

class ConnectedAssertionPartPerson extends React.PureComponent<ConnectedPersonProps> {
   render() {
      const p = this.props.persons[this.props.personId];
      return (
         <AssertionPart
            title={<div>{personDisplay(p)}</div>}
         />
      );
   }
}

const AssertionPartPerson = connect(
   (state: AppState, props: PersonProps) => ({
      ...props,
      persons: state.persons,
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(ConnectedAssertionPartPerson);
export default AssertionPartPerson;

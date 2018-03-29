import * as React from 'react';
import { Assertion } from '../Store/Assertion';
import { Source } from '../Store/Source';
import AssertionView from '../Assertions/Assertion';

interface SourceAssertionsProps {
   source: Source;
}

export default class SourceAssertions extends React.PureComponent<SourceAssertionsProps, {}> {

   render() {
      const a = this.props.source.asserts;

      if (!a) {
         return null;
      }

      return a.get().map(
         (b: Assertion, idx: number) => (
            <AssertionView key={idx} assert={b} />
         )
      );
   }
}

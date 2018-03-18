import * as React from 'react';
import { Assertion, P2E, P2C } from '../Store/Assertion';
import { Source } from '../Store/Source';
import P2EView from '../Assertions/P2E';
import P2CView from '../Assertions/P2C';

interface SourceAssertionsProps {
   source: Source;
}

export default class SourceAssertions extends React.PureComponent<SourceAssertionsProps, {}> {

   render() {
      const a = this.props.source.assertions;

      if (!a) {
         return null;
      }

      return a.map(
         (b: Assertion, idx: number) => (
            b instanceof P2E ? <P2EView key={idx} p2e={b} /> :
            b instanceof P2C ? <P2CView key={idx} p2c={b} /> :
             <span key={idx}>Assertion</span>
         )
      );
   }
}

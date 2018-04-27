import * as React from 'react';
import { Source } from '../Store/Source';
import AssertionTimeline from '../Assertions/AssertionTimeline';

interface SourceAssertionsProps {
   source: Source;
}

export default class SourceAssertions extends React.PureComponent<SourceAssertionsProps, {}> {

   render() {
      return <AssertionTimeline asserts={this.props.source.asserts} />;
   }
}

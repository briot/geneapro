import * as React from 'react';
import { connect } from 'react-redux';
import { Loader } from 'semantic-ui-react';
import { RouteComponentProps } from 'react-router';
import { AppState, GPDispatch } from '../Store/State';
import { addToHistory } from '../Store/History';
import { fetchSourceDetails } from '../Store/Sagas';
import { Source } from '../Store/Source';
import Page from '../Page';
import SourceDetails from '../Source/Source';

interface SourcePageProps {
   id: number;
   source: Source|undefined;
   dispatch: GPDispatch;
}

class SourcePageConnected extends React.PureComponent<SourcePageProps> {
   componentWillMount() {
      this.props.dispatch(addToHistory({source: this.props.source}));
      this.props.dispatch(fetchSourceDetails.request({id: this.props.id}));
   }

   componentDidUpdate(oldProps: SourcePageProps) {
      this.props.dispatch(addToHistory({source: this.props.source}));
      if (oldProps.id !== this.props.id) {
         this.props.dispatch(fetchSourceDetails.request({id: this.props.id}));
      }
   }

   render() {
      const s = this.props.source;
      document.title = s ?  s.abbrev : 'Source';
      return (
         <Page
            decujus={undefined}
            main={ s ?
               <SourceDetails
                   source={s}
               /> :
               <Loader active={true} size="large">Loading</Loader>
            }
         />
      );
   }
}

interface PropsFromRoute {
   id: string;
}

const SourcePage = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => ({
      id: Number(ownProps.match.params.id),
      source: state.sources[Number(ownProps.match.params.id)] as Source | undefined,
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(SourcePageConnected);

export default SourcePage;

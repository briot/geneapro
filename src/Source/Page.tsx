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

interface PropsFromRoute {
   id: string;
}

interface SourcePageProps extends RouteComponentProps<PropsFromRoute> {
   id: number;
   source: Source|undefined;
   dispatch: GPDispatch;
}

class SourcePageConnected extends React.PureComponent<SourcePageProps> {
   componentDidMount() {
      this.calculateData();
   }

   componentDidUpdate(old: SourcePageProps) {
      if (old.id !== this.props.id) {
         this.calculateData();
      }
      this.props.dispatch(addToHistory({source: this.props.source}));
   }

   calculateData() {
      if (this.props.id >= 0) {
         fetchSourceDetails.execute(this.props.dispatch, {id: this.props.id});
      }
   }

   render() {
      const s = this.props.source;
      document.title = s ?  s.abbrev : 'New Source';
      return (
         <Page
            decujus={undefined}
            main={ (s || this.props.id < 0) ?
               <SourceDetails source={s} /> :
               <Loader active={true} size="large">Loading</Loader>
            }
         />
      );
   }
}

const SourcePage = connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      id: Number(props.match.params.id),
      source: state.sources[Number(props.match.params.id)] as Source | undefined,
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(SourcePageConnected);

export default SourcePage;

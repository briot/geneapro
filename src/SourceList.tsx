import * as React from 'react';
import { connect } from 'react-redux';
import Page from './Page';
import { AppState, GPDispatch } from './Store/State';
import { Input, Segment } from 'semantic-ui-react';
import { Source, SourceSet } from './Store/Source';
import { SourceLink } from './Links';
import { fetchSources } from './Store/Sagas';
import SmartTable, { ColumnDescr } from './SmartTable';
import './SourceList.css';

const colName: ColumnDescr<Source, number> = {
   headerName: 'Name',
   get: (s: Source) => s.id,
   format: (sid: number) => <SourceLink id={sid} showAbbrev={true}/>,
};

interface SourceListProps {
   allSources: SourceSet;
   dispatch: GPDispatch;
}

interface SourceListState {
   filter?: string;
   sources: Source[];
}

class SourceListConnected extends React.PureComponent<SourceListProps, SourceListState> {
   state: SourceListState = {
      filter: '',
      sources: [],
   };

   readonly cols: ColumnDescr<Source, number>[] = [colName];

   componentDidUpdate(old: SourceListProps) {
      if (old.allSources !== this.props.allSources) {
         this.setState((s: SourceListState) => ({
            ...s,
            sources: this.computeSources(this.props.allSources, s.filter),
         }));
      }
   }

   componentDidMount() {
      this.props.dispatch(fetchSources.request({}));
   }

   computeSources(set: SourceSet, filter?: string): Source[] {
      let list = Object.entries(set)
         .map(
            ([key, val]: [string, Source]) => val).sort(
            (p1: Source, p2: Source) => p1.title.localeCompare(p2.title));

      if (filter) {
         list = list.filter(
            (p: Source) => p.title.toLowerCase().indexOf(filter) >= 0
         );
      }

      list.sort((s1, s2) => s1.abbrev.localeCompare(s2.abbrev));
      return list;
   }

   filterChange = (e: React.FormEvent<HTMLElement>, val: {value: string}) => {
      this.setState({
         filter: val.value,
         sources: this.computeSources(this.props.allSources, val.value),
      });
   }

   render() {
      const width = 900;
      document.title = 'List of sources';

      const sources = this.state.sources;

      return (
         <Page
            main={
               <div className="SourceList">
                  <Segment
                     style={{width: width}}
                     color="blue"
                     attached={true}
                  >
                     <span>
                        {sources.length} / {Object.keys(this.props.allSources).length} Sources
                     </span>
                     <Input
                        icon="search"
                        placeholder="Filter..."
                        onChange={this.filterChange}
                        style={{position: 'absolute', right: '5px', top: '5px'}}
                     />
                  </Segment>

                  <SmartTable
                     width={width}
                     height={600}
                     rowHeight={30}
                     rows={sources}
                     columns={this.cols}
                  />
               </div>
            }
         />
      );
   }
}

const SourceList = connect(
   (state: AppState) => ({
      allSources: state.sources,
   }),
   (dispatch: GPDispatch) => ({
      dispatch
   }),
)(SourceListConnected);
export default SourceList;

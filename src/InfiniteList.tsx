import * as React from "react";
import {
   Index,
   IndexRange,
   InfiniteLoader,
   InfiniteLoaderChildProps,
   List,
   ListRowProps
} from "react-virtualized";
import { Input, InputProps, Segment } from "semantic-ui-react";
import { useComponentSize, useDebounce } from "./Hooks";

export type InfiniteRowRenderer<T> =
   (p: {row: T, key: string, style: React.CSSProperties, isVisible: boolean }
   ) => React.ReactNode;

export type InfiniteRowFetcher<T> =
   (p: {filter: string, offset: number, limit: number}) => Promise<T[]>;

interface InfiniteListProps<T extends {}> {
   // Minimum number of elements to fetch per query
   minBatchSize?: number;

   // Fetch more rows
   fetchRows: InfiniteRowFetcher<T>;

   // Fetch the total row count
   fetchCount: (p: {filter: string}) => Promise<number>;

   // How to render one row
   renderRow: InfiniteRowRenderer<T>;

   // If any of these change, reset all loaded rows.
   resetOn?: React.InputIdentityList;

   title: string;
};

const InfiniteList = <T extends {}>(p: InfiniteListProps<T>) => {
   const minBatchSize = p.minBatchSize || 300;
   const container = React.useRef<HTMLDivElement>(null);
   const size = useComponentSize(container);
   const [filter, setFilter] = React.useState("");
   const [itemCount, setItemCount] = React.useState(0);
   const infiniteLoaderRef = React.useRef<InfiniteLoader>(null);

   // Set to a T when it has finished loading.
   // Set to 'false' while loading.
   // Set to undefined when we never requested its loading
   const [rows, setRows] = React.useState<(T|false|undefined)[]>([]);

   const loadMoreItems = React.useCallback(
      (rg: IndexRange) => {
         // Prepare the list of rows to indicate which ones we are loading,
         // and thus avoid double-loading
         setRows(s => {
            const result = new Array(Math.max(s.length, rg.stopIndex));
            s.forEach((p, idx) => result[idx] = p);
            for (let idx = rg.startIndex; idx <= rg.stopIndex; idx++) {
               if (result[idx - 1] === undefined) {
                  result[idx - 1] = false;
               }
            }
            return result;
         });

         return p.fetchRows({
            filter: filter,
            offset: rg.startIndex,
            limit: rg.stopIndex - rg.startIndex + 1
         }).then((t: T[]) => {
            setRows(s => {
               const result = [...s];
               t.forEach((p, idx) => result[idx + rg.startIndex] = p);
               return result;
            });
         }).catch(reason => {
            alert('Error while loading \n' + reason);
         });
      },
      [filter, p.fetchRows]
   );

   // Reset
   React.useEffect(
      () => {
         p.fetchCount({ filter }).then((count: number) => setItemCount(count));
         setRows([]);
         if (infiniteLoaderRef.current) {
            //  Do not let infinite loader auto-reload. If we had scrolled
            //  down, it would still be requesting items 2000..3000, even
            //  though there might only be 10 items left after filtering.
            infiniteLoaderRef.current.resetLoadMoreRowsCache();
            loadMoreItems({startIndex: 0, stopIndex: minBatchSize});
         }
      },
      [filter, minBatchSize].concat(p.resetOn || [])
   );

   const isRowLoaded = React.useCallback(
      (q: Index) => q.index < rows.length && rows[q.index] !== undefined,
      [rows]
   );

   // Called when the filter is modified
   const onFilterChange = React.useCallback(
      useDebounce(
         (e: {}, val: InputProps) => setFilter(val.value as string),
         250
      ),
      []
   );

   const renderRow = React.useCallback(
      (params: ListRowProps) => {
         const row = rows[params.index];
         if (!row) {
            return (
               <div key={params.key} className="loading" style={params.style}>
                  loading...
               </div>
            );
         }
         return p.renderRow({ ...params, row });
      },
      [rows, p.renderRow]
   );


   const renderList = React.useCallback(
      ({onRowsRendered, registerChild}: InfiniteLoaderChildProps) => (
         <List
            width={size.width}
            height={size.height}
            rowCount={itemCount}
            rowHeight={30}
            rowRenderer={renderRow}
            onRowsRendered={onRowsRendered}
            ref={registerChild}
         />
      ),
      [itemCount, size, renderRow]
   );

   return (
      <div className={`${p.title}List List`} ref={container}>
         <Segment color="blue" attached={true}>
            <span>{itemCount} {p.title}s</span>
            <Input
               icon="search"
               placeholder="Filter..."
               onChange={onFilterChange}
               style={{ position: "absolute", right: "5px", top: "5px" }}
            />
         </Segment>
         <InfiniteLoader
            isRowLoaded={isRowLoaded}
            rowCount={itemCount}
            loadMoreRows={loadMoreItems}
            minimumBatchSize={minBatchSize}
            threshold={minBatchSize / 2}
            ref={infiniteLoaderRef}
         >
            {renderList}
         </InfiniteLoader>
      </div>
   );
};

export default InfiniteList;

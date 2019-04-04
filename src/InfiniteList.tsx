import * as React from "react";
import { CellMeasurer, CellMeasurerCache } from 'react-virtualized';
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
   (p: ListRowProps & {row: T; prevRow: T|undefined}) => React.ReactNode;

export type InfiniteRowFetcher<T> =
   (p: {offset: number; limit: number}) => Promise<T[]>;

interface InfiniteListProps<T> {
   // Minimum number of elements to fetch per query
   minBatchSize?: number;

   // Fetch more rows
   // When this changes, the whole cache is invalidated and rows are fetched
   // again.
   fetchRows: InfiniteRowFetcher<T>;

   // Total number of rows. If this is set to a greater value than the total
   // rows already fetched, this will result in dynamic loading.
   rowCount: number;

   // How to render one row
   renderRow: InfiniteRowRenderer<T>;

   rowHeight?: number | 'dynamic';
};

export const InfiniteList = <T extends {}>(p: InfiniteListProps<T>) => {
   const minBatchSize = p.minBatchSize || 300;
   const container = React.useRef<HTMLDivElement>(null);
   const size = useComponentSize(container);
   const infiniteLoaderRef = React.useRef<InfiniteLoader>(null);
   const cacheRef = React.useRef<CellMeasurerCache|undefined>(undefined);

   const getCache = () => {
      if (cacheRef.current === undefined) {
         cacheRef.current = new CellMeasurerCache(
            { fixedWidth: true, minHeight: 10, defaultHeight: 200 });
      }
      return cacheRef.current;
   };
   const cache = getCache();

   // Set to a T when it has finished loading.
   // Set to 'false' while loading.
   // Set to undefined when we never requested its loading
   const [rows, setRows] = React.useState<(T|false|undefined)[]>([]);

   const { fetchRows } = p;

   const loadMoreItems = React.useCallback(
      (rg: IndexRange) => {
         // Prepare the list of rows to indicate which ones we are loading,
         // and thus avoid double-loading
         setRows(s => {
            const result = new Array(Math.max(s.length, rg.stopIndex));
            s.forEach((r, idx) => result[idx] = r);
            for (let idx = rg.startIndex; idx <= rg.stopIndex; idx++) {
               if (result[idx - 1] === undefined) {
                  result[idx - 1] = false;
               }
            }
            return result;
         });

         return fetchRows({
            offset: rg.startIndex,
            limit: rg.stopIndex - rg.startIndex + 1
         }).then((t: T[]) => {
            setRows(s => {
               const result = [...s];
               t.forEach((r, idx) => {
                  result[idx + rg.startIndex] = r;
                  cache.clear(idx + rg.startIndex, 0);
               });
               return result;
            });
         }).catch(reason => {
            alert('Error while loading \n' + reason);
         });
      },
      [fetchRows, cache]
   );

   // Reset
   React.useEffect(
      () => {
         setRows([]);
         cache.clearAll();
         if (infiniteLoaderRef.current) {
            //  Do not let infinite loader auto-reload. If we had scrolled
            //  down, it would still be requesting items 2000..3000, even
            //  though there might only be 10 items left after filtering.
            infiniteLoaderRef.current.resetLoadMoreRowsCache();
            loadMoreItems({startIndex: 0, stopIndex: minBatchSize});
         }
      },
      [p.fetchRows, cache, minBatchSize, loadMoreItems]
   );

   const isRowLoaded = React.useCallback(
      (q: Index) => q.index < rows.length && rows[q.index] !== undefined,
      [rows]
   );

   const { renderRow } = p;

   const userRenderRow = React.useCallback(
      (params: ListRowProps) => {
         const row = rows[params.index];
         if (!row) {
            return (
               <div key={params.key} className="loading" style={params.style}>
                  loading...
               </div>
            );
         }
         const prevRow = rows[params.index - 1] || undefined;
         return renderRow({ ...params, row, prevRow});
      },
      [rows, renderRow]
   );

   const measureRenderRow = React.useCallback(
      (params: ListRowProps) => (
         <CellMeasurer
            key={params.key}
            cache={cache}
            rowIndex={params.index}
            parent={params.parent}
         >
            {
               () => userRenderRow(params)
            }
         </CellMeasurer>
      ),
      [userRenderRow, cache]
   );

   const actualRenderRow = p.rowHeight === 'dynamic'
       ? measureRenderRow : userRenderRow;

   return (
      <div ref={container} className="List">
         <InfiniteLoader
            isRowLoaded={isRowLoaded}
            loadMoreRows={loadMoreItems}
            minimumBatchSize={minBatchSize}
            ref={infiniteLoaderRef}
            rowCount={p.rowCount}
            threshold={minBatchSize / 2}
         >
            {
            ({onRowsRendered, registerChild}: InfiniteLoaderChildProps) => (
               <List
                  width={size.width}
                  height={size.height}
                  deferredMeasurementCache={
                     p.rowHeight === 'dynamic' ? cache : undefined
                  }
                  rowCount={p.rowCount}
                  rowHeight={
                     (p.rowHeight === 'dynamic')
                        ? cache.rowHeight
                        : p.rowHeight || 30
                  }
                  rowRenderer={actualRenderRow}
                  onRowsRendered={onRowsRendered}
                  ref={registerChild}
               />
            )
            }
         </InfiniteLoader>
      </div>
   );
};


interface InfiniteListFilterProps<T> extends InfiniteListProps<T> {
   title: string;
   filter: string;
   onFilterChange: (newfilter: string) => void;
}

export const InfiniteListFilter =
   <T extends {}> (p: InfiniteListFilterProps<T>) => {

   // Called when the filter is modified
   const onFilterChange = React.useCallback(
      useDebounce(
         (e: {}, val: InputProps) => p.onFilterChange(val.value as string),
         250
      ),
      [p.onFilterChange]
   );

   return (
      <div className={`${p.title}List List`}>
         <Segment color="blue" attached={true}>
            <span>{p.rowCount} {p.title && `${p.title}s`}</span>
               <Input
                  defaultValue={p.filter}
                  icon="search"
                  onChange={onFilterChange}
                  placeholder="Filter..."
                  style={{ position: "absolute", right: "5px", top: "5px" }}
               />
         </Segment>
         <InfiniteList {...p} />
      </div>
   );
};

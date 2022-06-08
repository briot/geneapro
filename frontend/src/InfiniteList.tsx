import * as React from "react";
import {
   FixedSizeList,
   VariableSizeList,
   ListChildComponentProps } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { Input, InputProps, Segment } from "semantic-ui-react";
import { useComponentSize } from "./Hooks";

export type InfiniteRowRenderer<T> =
   (p: ListChildComponentProps<T>
      & {row: T; prevRow: T|undefined}) => React.ReactElement;

export type InfiniteRowFetcher<T> =
   (p: {offset: number; limit: number}) => Promise<T[]>;

interface measureRenderProps<T> {
   params: ListChildComponentProps<T> & {row: T; prevRow: T|undefined};
   render: InfiniteRowRenderer<T>;
   setSize: (index: number, size: number) => void;
   size: {width: number, height: number};
}

const MeasureRenderRow = <T extends object>(p: measureRenderProps<T>) => {
   const rowRef = React.useRef<HTMLDivElement>(null);
   const { setSize } = p;

   React.useEffect(
      () => {
         if (rowRef.current) {
            setSize(
               p.params.index,
               rowRef.current.children[0].getBoundingClientRect().height
            );
         }
      },
      [setSize, p.params.index, p.size]
   );

   return (
      <div ref={rowRef}>
         {p.render(p.params)}
      </div>
   );
}


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

   fullHeight?: boolean;
}

export const InfiniteList = <T extends object>(p: InfiniteListProps<T>) => {
   const minBatchSize = p.minBatchSize || 300;
   const container = React.useRef<HTMLDivElement>(null);
   const size = useComponentSize(container);
   const infiniteLoaderRef = React.useRef<InfiniteLoader>(null);
   const varlistRef = React.useRef<VariableSizeList>(null);
   const { fetchRows } = p;

   const cacheRef = React.useRef<{[index: number]: number}>({});
   const setSize = React.useCallback(
      (index: number, size: number) => {
         cacheRef.current = {...cacheRef.current, [index]: size};
         varlistRef.current?.resetAfterIndex(index);
         window.console.log('MANU setSize', index, size, cacheRef.current,
            varlistRef.current, infiniteLoaderRef.current);
      },
      []
   );
   const getSize = React.useCallback(
      (index: number) => cacheRef.current[index] || 40,
      []
   );

   // Set to a T when it has finished loading.
   // Set to 'false' while loading.
   // Set to undefined when we never requested its loading
   const [rows, setRows] = React.useState<(T|false|undefined)[]>([]);

   const loadMoreItems = React.useCallback(
      (startIndex: number, stopIndex: number): Promise<void> => {
         // Prepare the list of rows to indicate which ones we are loading,
         // and thus avoid double-loading
         setRows(s => {
            const result = new Array(Math.max(s.length, stopIndex));
            s.forEach((r, idx) => result[idx] = r);
            for (let idx = startIndex; idx <= stopIndex; idx++) {
               if (result[idx - 1] === undefined) {
                  result[idx - 1] = false;
               }
            }
            return result;
         });

         return fetchRows({
            offset: startIndex,
            limit: stopIndex - startIndex + 1
         }).then((t: T[]) => {
            setRows(s => {
               const result = [...s];
               t.forEach((r, idx) => {
                  result[idx + startIndex] = r;
                  cacheRef.current = {};
               });
               return result;
            });
         }).catch(reason => {
            alert('Error while loading \n' + reason);
         });
      },
      [fetchRows]
   );

   // Reset
   React.useEffect(
      () => {
         setRows([]);
         cacheRef.current = {};
         if (infiniteLoaderRef.current) {
            //  Do not let infinite loader auto-reload. If we had scrolled
            //  down, it would still be requesting items 2000..3000, even
            //  though there might only be 10 items left after filtering.
            infiniteLoaderRef.current.resetloadMoreItemsCache();

            loadMoreItems(0, minBatchSize);
         }
      },
      [fetchRows, minBatchSize, loadMoreItems]
   );

   const isRowLoaded = React.useCallback(
      (q: number) => q < rows.length && rows[q] !== undefined,
      [rows]
   );

   const { renderRow } = p;

   const userRenderRow = React.useCallback(
      (params: ListChildComponentProps<T>): React.ReactElement => {
         const row = rows[params.index];
         if (!row) {
            return (
               <div className="loading" style={params.style}>
                  loading...
               </div>
            );
         }
         const prevRow = rows[params.index - 1] || undefined;
         return renderRow({...params, row, prevRow});
      },
      [rows, renderRow]
   );

   const measureRenderRow = React.useCallback(
      (params: ListChildComponentProps<T>): React.ReactElement => {
         const row = rows[params.index];
         if (!row) {
            return (
               <div className="loading" style={params.style}>
                  loading...
               </div>
            );
         }
         const prevRow = rows[params.index - 1] || undefined;
         return (
            <MeasureRenderRow
               params={{...params, row, prevRow}}
               render={renderRow}
               setSize={setSize}
               size={size}
            />
         );
      },
      [renderRow, rows, setSize, size]
   );


   return (
      <div
         ref={container}
         className={`List ${p.fullHeight ? 'fullHeight' : ''}`}
      >
         <InfiniteLoader
            isItemLoaded={isRowLoaded}
            loadMoreItems={loadMoreItems}
            minimumBatchSize={minBatchSize}
            ref={infiniteLoaderRef}
            itemCount={p.rowCount}
            threshold={minBatchSize / 2}
         >
            {
            ({onItemsRendered, ref}) => (
               p.rowHeight === 'dynamic'
               ? (
                  <VariableSizeList
                     width={size.width}
                     height={size.height}
                     itemCount={p.rowCount}
                     itemSize={getSize}
                     onItemsRendered={onItemsRendered}
                     overscanCount={2}
                     ref={varlistRef}
                  >
                     {measureRenderRow}
                  </VariableSizeList>
               ) : (
                  <FixedSizeList
                     width={size.width}
                     height={size.height}
                     itemCount={p.rowCount}
                     itemSize={p.rowHeight ?? 30}
                     onItemsRendered={onItemsRendered}
                     overscanCount={2}
                     ref={ref}
                  >
                     {userRenderRow}
                  </FixedSizeList>
               )
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
   <T extends object> (p: InfiniteListFilterProps<T>) => {

   const { onFilterChange } = p;

   // Called when the filter is modified
   const onChange = React.useCallback(
      (e: unknown, val: InputProps) => onFilterChange(val.value as string),
      [onFilterChange]
   );

   return (
      <div className={`${p.title}List List`}>
         <Segment color="blue" attached={true}>
            <span>{p.rowCount} {p.title && `${p.title}s`}</span>
               <Input
                  defaultValue={p.filter}
                  icon="search"
                  onChange={onChange}
                  placeholder="Filter..."
                  style={{ position: "absolute", right: "5px", top: "5px" }}
               />
         </Segment>
         <InfiniteList {...p} />
      </div>
   );
};

import * as React from 'react';
import { DraggableCore, DraggableData,
         DraggableEventHandler } from 'react-draggable';
import { Sorter } from './Sorter';
import './SmartTable.css';

const DEFAULT_WIDTH = 100;
const SCROLLBAR_WIDTH = 0; // at least as wide as scrollbar
const MIN_COL_WIDTH_PX = 10;
const SCROLL_MARGIN = 20; // How many extra invisible rows to create

type Alignment = 'right' | 'left' | 'center';

/**
 * Column description
 */

export interface ColumnDescr<RowData, ColumnData> {
   // Width of the column, in pixels. The actual sizes will be adjusted with
   // a common ratio when the table disabled horizontal scrolling
   defaultWidth?: number;  // default: DEFAULT_WIDTH

   // Header for the column. If no column defines headers, the header
   // row is hidden
   headerName?: string;

   // Tooltip for the column header
   title?: string;

   // Retrieve the value to display in the column
   get: (v: RowData) => ColumnData;

   // Format that value to display on screen
   format: (v: ColumnData) => string|JSX.Element|JSX.Element[];

   // Value to display in the table footer. If this is undefined
   // for all columns the footer is hidden
   footer?: ColumnData;  

   // Alignment of text within the column
   align?: Alignment;  // default: left

   // Computing the class name to apply to individual cells
   className?: (v: ColumnData) => string|undefined;

   // How to sort on this column
   sorter?: Sorter<ColumnData>;

   // Whether this column should display a filter in its header.
   // A default filter value can be provided, for instance to restore a
   // previous session. How a filter is applied is defined in the table
   // itself, since multiple column filter might be combined different
   // ways to decide whether a row is visible.
   filterable?: boolean;
   defaultFilter?: string;
}

/****************************************************************************
 * Column resizer
 ****************************************************************************/

interface ColumnResizerProps<RowData, ColumnsData> {
   table: SmartTable<RowData, ColumnsData>;
   col: number;  // index of column
}

// Cannot be PureComponent, since height depends on table's height
class ColumnResizer<RowData, ColumnsData>
extends React.Component<ColumnResizerProps<RowData, ColumnsData>> {
   startX: number = 0;
   colWidthStart: number = 0;     // at start of drag
   nextColWidthStart: number = 0;

   onDragStart = (_: Event, data: DraggableData) => {
      let w = this.props.table.state.colWidth;
      this.startX = data.x;
      this.colWidthStart = w[this.props.col];
      this.nextColWidthStart = w[this.props.col + 1];
      return this.colWidthStart + this.nextColWidthStart > 2 * MIN_COL_WIDTH_PX;
   }

   onDrag = (e: Event, data: DraggableData) => {
      const t = this.props.table;
      let w = this.colWidthStart + data.x - this.startX;
      let nw = this.nextColWidthStart - data.x + this.startX;

      if (!t.props.horizontalScroll) {
         // We should not change the table width in this mode

         if (w < MIN_COL_WIDTH_PX) {
            w = MIN_COL_WIDTH_PX;
            nw = this.nextColWidthStart + this.colWidthStart - w;
         } else if (nw < MIN_COL_WIDTH_PX) {
            nw = MIN_COL_WIDTH_PX;
            w = this.nextColWidthStart + this.colWidthStart - nw;
         }
      }

      t.setState(old => {
         let c = [...old.colWidth];
         c[this.props.col] = w;
         c[this.props.col + 1] = nw;

         if (t.props.onColumnResize) {
            t.props.onColumnResize!(c);
         }

         return {colWidth: c};
      });

      e.stopPropagation();
      e.preventDefault();
   }

   render() {
      const scroll = this.props.table.scrollable;
      return (
         <DraggableCore onDrag={this.onDrag} onStart={this.onDragStart as DraggableEventHandler}>
            <div
               className="columnResizer"
               style={{height: scroll ? scroll.clientHeight : '100%'}}
            />
         </DraggableCore>
      );
   }
}

/****************************************************************************
 * Table row
 ****************************************************************************/

interface TableRowProps<RowData, ColumnsData> {
   table: SmartTable<RowData, ColumnsData>;
   row: RowData;
   height: number;
}

function TableRow<RowData, ColumnsData>(p: TableRowProps<RowData, ColumnsData>) {
   return (
      <tr style={{height: p.height}}>
         {
            p.table.props.columns.map((c, idx) => {
               const r = c.get(p.row);
               return (
                  <td
                     key={idx}
                     style={{textAlign: c.align,
                             width: p.table.state.colWidth[idx]}}
                     className={c.className ? c.className(r) : undefined}
                  >
                     {c.format(r)}
                  </td>
               );
            })
         }
       </tr>
   );
}

/****************************************************************************
 * Smart tables
 ****************************************************************************/

interface SmartTableProps<RowData, ColumnsData> {
   // List of rows to display. Only the visible ones are actually
   // rendered on screen.
   // This should return a new object when the data changes, not modify in
   // place.
   // Initial filters should have been applied already.
   rows: RowData[];

   // List of columns to display. This is called several times
   // while inserting rows, so it should not create the return value on the
   // fly.
   columns: ColumnDescr<RowData, ColumnsData>[];
   defaultSortColumn?: ColumnDescr<RowData, ColumnsData>;

   // Size allocated to the table
   width: number;

   // Whether headers should scroll with the table, or always stay visible
   fixedHeader?: boolean;

   // Height of a row in pixels
   rowHeight?: number;

   // Whether columns are resizable.
   // The callback reports changes in the width of columns.
   resizableColumns?: boolean;
   onColumnResize?: (widths: number[]) => void;

   // If true, the full table width is always visible, but columns might not
   // be the exact size set by users. If false, the table's width is the sum
   // of all column width as set by the user. A horizontal scrollbar is used
   // as needed.
   // ??? Not fully supported for headers
   horizontalScroll?: boolean;

   // Given current filters applied to each column, change the 'rows'
   // property
   applyFilters?: (filter: string[]) => void;
}

interface SmartTableState<RowData, ColumnsData> {
   // Number of rows in the header or footer
   hasHeaders: boolean;
   hasFilters: boolean;
   rowsInFoot: number;

   sortColumn?: ColumnDescr<RowData, ColumnsData>;
   sortedRows: RowData[];
   beforeSort?: {data: RowData[]; // to know whether we need to sort again
                 col?: ColumnDescr<RowData, ColumnsData>;
   };
   scrollTop: number;       // mostly used to force a redraw on scroll
   requestedWidth: number;  // full width of table, in pixels
   colWidth: number[];      // Actual width in pixels of columns
   filters: string[];
}

export default class SmartTable<RowData, ColumnsData>
extends React.PureComponent<SmartTableProps<RowData, ColumnsData>,
                            SmartTableState<RowData, ColumnsData>> {

   // tslint:disable-next-line: no-any
   public static defaultProps: Partial<SmartTableProps<any, any>> = {
      fixedHeader: true,
      rowHeight: 13,
      horizontalScroll: false,
      resizableColumns: true,
      applyFilters: () => false,
   };

   state: SmartTableState<RowData, ColumnsData> = {
      hasHeaders: true,
      hasFilters: false,
      rowsInFoot: 0,
      sortedRows: [],
      scrollTop: 0,
      requestedWidth: 0,
      colWidth: [],
      filters: [],
   };
   scrollable?: HTMLElement|null;

   static sortRows<T>(
      rows: T[],
      col: ColumnDescr<T, any>|undefined // tslint:disable-line: no-any
   ): T[] {
      if (!col || !col.sorter) {
         return rows;
      } else {
         const s = col.sorter;
         let sorted = [...rows];
         sorted.sort((a, b) => s.compare(col.get(a), col.get(b)));
         return sorted;
      }
   }

   static getDerivedStateFromProps<R, C>(
      props: SmartTableProps<R, C>,
      prevState: SmartTableState<R, C>
   ): SmartTableState<R, C> {
      const cols = props.columns;
      let hasHeaders = false;
      let hasFilters = false;
      let rowsInFoot = 0;
      let widths: number[] = cols.map(
         (c, idx) => prevState.colWidth[idx] || c.defaultWidth || DEFAULT_WIDTH);
      let filters: string[] = cols.map(
         (c, idx) => prevState.filters[idx] || c.defaultFilter || '');

      const sortColumn = prevState.sortColumn || props.defaultSortColumn;

      cols.forEach(c => {
         if (c.headerName || c.sorter !== undefined) {
            hasHeaders = true;
         }
         if (c.filterable) {
            hasFilters = true;
         }
         if (c.footer !== undefined) {
            rowsInFoot = 1;
         }
      });

      // Sort rows if needed
      let sortedRows = prevState.sortedRows || props.rows;
      if (!prevState.beforeSort ||
          prevState.beforeSort.data !== props.rows ||
          prevState.beforeSort.col !== sortColumn
      ) {
         sortedRows = SmartTable.sortRows(props.rows, sortColumn);
      }

      // Compute the actual column widths
      const requested = widths.reduce((cumul, w) => cumul + w, 0);
      const actual = props.width - SCROLLBAR_WIDTH;
      if (!props.horizontalScroll) {
         const ratio = actual / requested;
         widths = widths.map(w => w * ratio);
      }

      return {...prevState,
              beforeSort: {data: props.rows,
                           col: sortColumn,
              },
              requestedWidth: props.horizontalScroll ? requested : actual,
              hasHeaders, hasFilters, rowsInFoot, filters,
              colWidth: widths, sortedRows};
   }

   protected rowsInHead() {
      return (this.state.hasHeaders ? 1 : 0) +
             (this.state.hasFilters ? 1 : 0);
   }

   protected createRows(): JSX.Element[] {
      if (!this.scrollable) {
         return [];
      }
      const rows = this.state.sortedRows;
      const rh: number = this.props.rowHeight!;
      const totalHeight = this.scrollable.clientHeight +
         rh * this.rowsInHead() -
         rh * this.state.rowsInFoot;
      const fromIndex = Math.max(0, Math.floor(this.state.scrollTop / rh) - SCROLL_MARGIN);
      const toIndex = Math.min(
         Math.ceil((this.state.scrollTop + totalHeight) / rh) - 1 + SCROLL_MARGIN,
         rows.length - 1);  // last valid index

      let result: JSX.Element[] = [];
      for (let r = fromIndex; r <= toIndex; r++) {
         const height: number =
            (r === fromIndex ? (fromIndex + 1) * rh :
             r === toIndex ? (rows.length - toIndex) * rh :
             rh);
         result.push(
            <TableRow
               key={r}
               table={this}
               row={rows[r]}
               height={height}
            />
         );
      }
      return result;
   }

   onScroll = () => {
      this.setState({scrollTop: this.scrollable!.scrollTop});
   }

   protected setSortColumn(col: ColumnDescr<RowData, ColumnsData>) {
      const s = col.sorter;
      if (s) {
         if (this.state.sortColumn === col) {
            s.setKind();
         } else {
            s.setKind(0);
         }
         this.setState({sortColumn: col,
                        sortedRows: SmartTable.sortRows(this.props.rows, col)});
      }
   }

   protected columnTitle(col: ColumnDescr<RowData, ColumnsData>) {
      return this.state.hasHeaders ? (
         <div
            className={
               'ellipsize' +
               (col.sorter ? ' sortable' : '') +
               (col.sorter && this.state.sortColumn === col ?
                   (col.sorter.useDownArrow() ? ' sortDown' : ' sortUp') :
                   '')
            }
            onClick={() => this.setSortColumn(col)}
         >
            {col.sorter && this.state.sortColumn === col && col.headerName ?
               col.sorter.formatHeader(col.headerName) :
               col.headerName
            }
         </div>
      ) : undefined;
   }

   onFilterChange = (idx: number, filter: string) => {
      let filters = [...this.state.filters];
      filters[idx] = filter;
      this.props.applyFilters!(filters);
   }

   protected columnFilter(idx: number) {
      return this.props.columns[idx].filterable ? (
         <div>
            <input
               defaultValue={this.state.filters[idx]}
               onChange={(a: {target: {value: string}}) =>
                  this.onFilterChange(idx, a.target.value)}
            />
         </div>
      ) : undefined;
   }

   protected header(): JSX.Element|undefined {
      const h = this.rowsInHead() * this.props.rowHeight!;
      return (
         <thead>
            <tr>
            {
               this.props.columns.map((c, idx) =>
                  <th key={idx} title={c.title} style={{width: this.state.colWidth[idx]}} >
                     <div
                        className="header"
                        style={{width: this.state.colWidth[idx], height: h}}
                     >
                        {
                           this.props.resizableColumns &&
                           (idx < this.props.columns.length || this.props.horizontalScroll) ?
                              <ColumnResizer table={this} col={idx} /> :
                              undefined
                        }
                        {this.columnTitle(c)}
                        {this.columnFilter(idx)}
                     </div>
                  </th>
               )
            }
            </tr>
         </thead>
      );
   }

   protected foot(cols: ColumnDescr<RowData, ColumnsData>[]) {
      return this.state.rowsInFoot === 0 ?
         null : (
         <tfoot>
            <tr>
               {
                  cols.map((c, idx) =>
                     <th
                        key={idx}
                        style={{textAlign: c.align}}
                        className={c.className && c.footer ? c.className(c.footer) : undefined}
                     >
                        <div
                           style={{width: this.state.colWidth[idx],
                                   height: this.props.rowHeight}}
                           className="header ellipsize"
                        >
                           {c.footer || '\u00A0'/* nbsp */}
                        </div>
                     </th>
                  ) 
               }
            </tr>
         </tfoot>
      );
   }

   render() {
      return (
         <div
            onScroll={this.onScroll}
            className={'smartTable virtual ' + (this.props.fixedHeader ? 'fixedHeader' : '')}
         >
            <div
               ref={r => this.scrollable = r}
               className="stContainer"
               style={{marginTop: this.props.rowHeight! * this.rowsInHead(),
                       marginBottom: this.props.rowHeight! * this.state.rowsInFoot,
                       width: this.state.requestedWidth + 'px',
                     }}
            >
               <table
                  className={
                     (this.props.resizableColumns ? ' resizableColumns' : '')
                  }
               >
                  {this.rowsInHead() ? this.header() : undefined}
                  <tbody>
                     {this.createRows()}
                  </tbody>
                  {this.foot(this.props.columns)}
               </table>
            </div>
         </div>
      );
   }
}

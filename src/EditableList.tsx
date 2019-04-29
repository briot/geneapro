/**
 * Editable/Reorderable list component
 */

import * as React from "react";
import { Button } from "semantic-ui-react";
import "./EditableList.css";

const DND_DATA = "listItemIdx";

interface ListItemProps<T> {
   idx: number;
   item: T;
   render: (p: T, onChange: (p: T) => void) => React.ReactNode;
   onAdd: (idx: number) => void; // request to add a new element
   onDelete: (idx: number) => void; // request to delete a new element
   onEdit: (p: T, idx: number) => void;
   draggable?: boolean;
}
interface ListItemState {
   dragged: boolean;
}
class ListItem<T> extends React.PureComponent<ListItemProps<T>, ListItemState> {
   protected onItemChange = (item: T) =>
      this.props.onEdit({ ...this.props.item, ...item }, this.props.idx);
   protected onItemAdd = () => this.props.onAdd(this.props.idx);
   protected onItemDel = () => this.props.onDelete(this.props.idx);
   protected onItemDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData(DND_DATA, "" + this.props.idx);
      this.setState({ dragged: true });
   };
   protected onItemDragEnd = () => this.setState({ dragged: false });

   public constructor(props: ListItemProps<T>) {
      super(props);
      this.state = { dragged: false };
   }

   public render() {
      return (
         <div
            className={"listItem " + (this.state.dragged ? "dragged" : "")}
            draggable={this.props.draggable}
            onDragStart={this.onItemDragStart}
            onDragEnd={this.onItemDragEnd}
         >
            <Button
               className="listItemButton"
               icon="trash"
               onClick={this.onItemDel}
            />
            {this.props.render(this.props.item, this.onItemChange)}
            <Button
               className="listItemButton listItemBottom"
               icon="add"
               onClick={this.onItemAdd}
            />
         </div>
      );
   }
}

interface DropTargetProps {
   at: number;
   onSwap: (idx: number, at: number) => void;
}
const DropTarget = ({at, onSwap}: DropTargetProps) => {
   const [over, setOver] = React.useState(false);

   const isDroppable = React.useCallback(
      (e: React.DragEvent) => {
         const idx = e.dataTransfer.getData(DND_DATA);
         return idx && Number(idx) !== at && Number(idx + 1) !== at;
      },
      [at]);

   const onDragEnter = React.useCallback(
      (e: React.DragEvent) => isDroppable(e) && setOver(true),
      [isDroppable]
   );
   const onDragLeave = React.useCallback(() => setOver(false), []);
   const onDragOver = React.useCallback(
      (e: React.DragEvent) => isDroppable(e) && e.preventDefault(),
      [isDroppable]
   );
   const onDrop = React.useCallback(
      (e: React.DragEvent) => {
         setOver(false);
         onSwap(Number(e.dataTransfer.getData(DND_DATA)), at);
      },
      [at, onSwap]
   );

   return (
      <div
         className={"listDropTarget " + (over ? "listDropOver" : "")}
         onDragEnter={onDragEnter}
         onDragLeave={onDragLeave}
         onDragOver={onDragOver}
         onDrop={onDrop}
      />
   );
};

interface ListProps<T> {
   list: T[];
   render: (t: T, onChange: (newValue: T) => void) => React.ReactNode;
   create: () => T; // create a new element
   onChange: (newlist: T[]) => void;
   orderable?: boolean;
}
export default class EditableList<T> extends React.PureComponent<ListProps<T>> {
   // Add a new element after item 'idx'
   protected onAdd = (idx: number) =>
      this.props.onChange([
         ...this.props.list.slice(0, idx + 1),
         this.props.create(),
         ...this.props.list.slice(idx + 1)
      ]);

   protected onAddFirst = () => this.onAdd(0);

   protected onDelete = (idx: number) =>
      this.props.onChange([
         ...this.props.list.slice(0, idx),
         ...this.props.list.slice(idx + 1)
      ]);

   protected onSwap = (idx: number, at: number) => {
      if (idx < at) {
         this.props.onChange([
            ...this.props.list.slice(0, idx),
            ...this.props.list.slice(idx + 1, at),
            this.props.list[idx],
            ...this.props.list.slice(at)
         ]);
      } else {
         this.props.onChange([
            ...this.props.list.slice(0, at),
            this.props.list[idx],
            ...this.props.list.slice(at, idx),
            ...this.props.list.slice(idx + 1)
         ]);
      }
   };

   protected onItemEdited = (item: T, idx: number) =>
      this.props.onChange([
         ...this.props.list.slice(0, idx),
         item,
         ...this.props.list.slice(idx + 1)
      ]);

   public render() {
      return (
         <div className="editableList">
            {this.props.list.map((r, idx) => (
               <React.Fragment key={idx}>
                  {this.props.orderable && (
                     <DropTarget at={idx} onSwap={this.onSwap} />
                  )}
                  <ListItem
                     idx={idx}
                     item={r}
                     render={this.props.render}
                     onAdd={this.onAdd}
                     onDelete={this.onDelete}
                     onEdit={this.onItemEdited}
                     draggable={this.props.orderable}
                  />
               </React.Fragment>
            ))}
            {this.props.orderable && (
               <DropTarget
                  at={this.props.list.length - 1}
                  onSwap={this.onSwap}
               />
            )}
            {this.props.list.length === 0 && (
               <Button
                  className="listItemButton"
                  icon="add"
                  onClick={this.onAddFirst}
               />
            )}
         </div>
      );
   }
}

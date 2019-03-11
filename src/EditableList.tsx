/**
 * Editable/Reorderable list component
 */

import * as React from 'react';
import { Button } from 'semantic-ui-react';

interface ListItemProps<T extends {}> {
   idx: number;
   item: T;
   render: (p: T, onChange: (p: Partial<T>) => void) => JSX.Element;
   onAdd: (idx: number) => void;  // request to add a new element
   onDelete: (idx: number) => void;  // request to delete a new element
   onEdit: (p: T, idx: number) => void;
}
class ListItem<T> extends React.PureComponent<ListItemProps<T>> {

   protected onItemChange = (item: Partial<T>) =>
      this.props.onEdit({...this.props.item, ...item}, this.props.idx);
   protected onItemAdd = () => this.props.onAdd(this.props.idx);
   protected onItemDel = () => this.props.onDelete(this.props.idx);

   public render() {
      return (
         <div className="listItem">
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

interface ListProps<T extends {}> {
   list: T[];
   render: (t: T, onChange: (partial: Partial<T>) => void) => JSX.Element;
   create: () => T; // create a new element
   onChange: (newlist: T[]) => void;
}
export default class EditableList<T>
   extends React.PureComponent<ListProps<T>>
{
   // Add a new element after item 'idx'
   protected onAdd = (idx: number) =>
      this.props.onChange([
         ...this.props.list.slice(0, idx + 1),
         this.props.create(),
         ...this.props.list.slice(idx + 1)]);

   protected onAddFirst = () => this.onAdd(0);

   protected onDelete = (idx: number) =>
      this.props.onChange([
         ...this.props.list.slice(0, idx),
         ...this.props.list.slice(idx + 1)]);

   protected onItemEdited = (item: T, idx: number) =>
      this.props.onChange([
         ...this.props.list.slice(0, idx),
         item,
         ...this.props.list.slice(idx + 1)]);

   render() {
      return (
         <>
            <div>
               {this.props.list.map((r, idx) =>
                  <ListItem
                     key={idx}
                     idx={idx}
                     item={r}
                     render={this.props.render}
                     onAdd={this.onAdd}
                     onDelete={this.onDelete}
                     onEdit={this.onItemEdited}
                  />
                )
               }
            </div>
            {
               this.props.list.length == 0 &&
               <Button
                  className="listItemButton"
                  icon="add"
                  onClick={this.onAddFirst}
               />
            }
         </>
      );
   }
};

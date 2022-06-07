import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import { URL } from "./Links";
import './Draggable.css';

interface DndDataRule   { kind: "rule"; idx: number }
interface DndDataPerson { kind: "person"; id: number }
interface DndDataPlace  { kind: "place"; id: number }
interface DndDataSource { kind: "source"; id: number }
export type DndData =
   | DndDataRule
   | DndDataPerson
   | DndDataPlace
   | DndDataSource;


const dnd_type = (kind: string) => `application/x-geneaprove-${kind}`;

/**
 * Hook to make some element draggable.
 * Example:
 *    const [props] = useDraggable({ data });
 *    return (
 *       <div {...props} >
 *       </div>
 *    );
 */

interface UseDraggableProps {
   className?: string; // extra class names
   data?: DndData|undefined;  // no drag if this is undefined
}

export const useDraggable = (p: UseDraggableProps) => {
   const [dragged, setDragged] = React.useState(false);

   const onDragStart = React.useCallback(
      (e: React.DragEvent) => {
         if (p.data) {
            e.dataTransfer.setData(
               dnd_type(p.data.kind),
               JSON.stringify(p.data));
            e.dataTransfer.dropEffect = 'link';
            e.dataTransfer.effectAllowed = 'link';
            setDragged(true);
         }
      },
      [p.data]
   );
   const onDragEnd = React.useCallback(
      () => setDragged(false),
      []
   );

   return [{
      className: `${p.className||''} ${dragged ? 'dragged' : ''}`,
      draggable: p.data !== undefined,
      onDragStart,
      onDragEnd
   }];
};

/**
 * Hook to make an element accept dropped elements
 */

interface DropTargetProps extends RouteComponentProps {
   redirectUrl?: URL; // where to redirect
}
const ConnectedDropTarget: React.FC<DropTargetProps> = (p) => {
   const [over, setOver] = React.useState(false);
   const setCount = React.useState(0)[1];
   const { redirectUrl } = p;

   const isDroppable = React.useCallback(
      (types: ReadonlyArray<string>) =>
         redirectUrl && types.includes(dnd_type(redirectUrl.accept)),
      [redirectUrl]
   );

   const onDragEnter = React.useCallback(
      (e: React.DragEvent) => {
         // We do not have access to the contents here, we can only check the
         // type.
         const types = e.dataTransfer.types;
         setCount(c => {
            if (c === 0 && isDroppable(types)) {
               setOver(true);
            }
            return c + 1;
         });
         e.preventDefault();
      },
      [isDroppable, setCount]
   );

   const onDragOver = React.useCallback(
      (e: React.DragEvent) => e.preventDefault(),
      []
   );

   const onDragLeave = React.useCallback(
      () => {
         setCount(c => {
            if (c === 1) {
               setOver(false);
            }
            return c - 1;
         });
      },
      [setCount]
   );

   const onDropCb = React.useCallback(
      (e: React.DragEvent) => {
         setOver(false);
         const d = redirectUrl &&
                   e.dataTransfer.getData(dnd_type(redirectUrl.accept));
         if (d) {
            const s = redirectUrl && redirectUrl.url(JSON.parse(d));
            s && p.history.push(s);
            e.preventDefault();
         }
      },
      [redirectUrl, p.history]
   );

   if (!redirectUrl) {
      return <>{p.children}</>;
   }

   return (
      <div
         className={`droptarget ${over ? "dropover" : ""}`}
         onDragEnter={onDragEnter}
         onDragOver={onDragOver}
         onDragLeave={onDragLeave}
         onDrop={onDropCb}
      >
         {p.children}
      </div>
   );
};
export const DropTarget = withRouter(ConnectedDropTarget);

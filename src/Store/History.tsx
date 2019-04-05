import { actionCreator } from "../Store/Actions";

export enum HistoryKind {
   PERSON = 0,
   PLACE = 1,
   SOURCE = 2
}

export interface HistoryItem {
   id: number;
   kind: HistoryKind;
}

/**
 * Action: add an element to the history of visited persons
 */
export const addToHistory = actionCreator<{
   kind: HistoryKind;
   id: number;
}>("DATA/HISTORY");

import { actionCreator } from "../Store/Actions";
import { Person } from "../Store/Person";
import { Source } from "../Store/Source";
import { Place } from "../Store/Place";

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
 * Return the ID of the last visited person
 */
export function lastVisitedPerson(hist: HistoryItem[]): number | undefined {
   for (const h of hist) {
      if (h.kind === HistoryKind.PERSON) {
         return h.id;
      }
   }
   return undefined;
}

/**
 * Action: add an element to the history of visited persons
 */
export const addToHistory = actionCreator<{
   kind: HistoryKind;
   id: number;
}>("DATA/HISTORY");

import { actionCreator } from '../Store/Actions';
import { Person } from '../Store/Person';
import { Source } from '../Store/Source';

export enum HistoryKind {
   PERSON = 0,
   PLACE = 1,
   SOURCE = 2,
}

export interface HistoryItem {
   id: number;
   display: string;
   kind: HistoryKind;
}

/**
 * Action: add an element to the history of visited persons
 */
export const addToHistory = actionCreator<{
   person?: Person;
   source?: Source;
}>('DATA/HISTORY');

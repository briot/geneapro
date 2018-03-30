import { actionCreator } from '../Store/Actions';
import { AssertionList } from '../Store/Assertion';

interface EventType {
   id: number;
   name: string;    // e.g. "birth"
   gedcom: string;  // e.g. "BIRT"
}

export interface GenealogyEvent {
   id: number;
   name: string;
   date?: string;
   date_sort?: string;  // computed from date, computer-friendly
   placeId?: number;    // points to a place in the state
   sources?: number[];  // ??? Incorrect type
   type?: EventType;

   // Only available after we fetched the details
   asserts?: AssertionList;
}

export interface GenealogyEventSet {
   [id: number]: GenealogyEvent;
}

/**
 * Action: add a new event to the known events
 */
export const addEvents = actionCreator<{
   events: GenealogyEventSet;
}>('DATA/EVENTS');

/**
 * Display the event on the screen
 * @param showSources  Whether to show a tick if the event has sources
 * @param useDateSort  If True, use computed dates rather than dates as
 *   input by user.
 * @param yearOnly     When using useDateSort, only keep the year.
 *   Ignored when not using useDateSort
 */

export function event_to_string(e?: GenealogyEvent,
                                showSources?: boolean,
                                useDateSort: boolean = false,
                                yearOnly: boolean = false) {
   if (e) {
      let s = (useDateSort ? e.date_sort : e.date) || '';
      if (yearOnly && useDateSort) {
         s = s.substring(0, 4);
      }

      if (s && showSources) {
         s += (e.sources ? ' \u2713' : ' \u2717');
      }
      return s;
   } else {
      return '';
   }
}

export function extractYear(isoDate: string|undefined): number|undefined {
   return isoDate ? Number(isoDate.substring(0, 4)) : undefined;
}

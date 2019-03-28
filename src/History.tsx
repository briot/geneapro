import * as React from "react";
import { HistoryItem, HistoryKind } from "./Store/History";
import { fetchPersonsFromServer } from './Server/Person';
import { fetchPlacesFromServer } from './Server/Place';
import { fetchSourcesFromServer } from './Server/Source';

interface WithId {
   id: number;
}

interface IndexedById<T> {
   [id: number]: T;
}

export const to_dict = <T extends WithId, S extends IndexedById<T>>
   (list: T[]): S => list.reduce((r, a) => ({...r, [a.id]: a}), {} as S);

/**
 * Retrieve all persons/places/sources needed to display the history items.
 */
const useHistory = <T extends WithId, S extends IndexedById<T>> (
   kind: HistoryKind,
   fetch: (p: {ids: number[]}) => Promise<T[]>
) => {
   return (hist: HistoryItem[]): S => {
      const [data, setData] = React.useState({} as S);
      React.useEffect(
         () => {
            const ids = hist.filter(h => h.kind === kind).map(f => f.id);
            if (ids.length) {
               fetch({ids}).then(s => setData(to_dict(s) as S));
            }
         },
         [hist]
      );
      return data;
   };
}

export const useHistoryPersons = useHistory(
   HistoryKind.PERSON, fetchPersonsFromServer);
export const useHistoryPlaces = useHistory(
   HistoryKind.PLACE, fetchPlacesFromServer);
export const useHistorySources = useHistory(
   HistoryKind.SOURCE, fetchSourcesFromServer);

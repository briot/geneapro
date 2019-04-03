import * as React from "react";
import { HistoryItem, HistoryKind } from "./Store/History";
import { fetchPersonsFromServer } from './Server/Person';
import { fetchPlacesFromServer } from './Server/Place';
import { fetchSourcesFromServer } from './Server/Source';
import { Place, PlaceSet } from './Store/Place';
import { Source, SourceSet } from './Store/Source';
import { Person, PersonSet } from './Store/Person';

interface WithId {
   id: number|string;
}

interface IndexedById<T> {
   [id: number]: T;
}

export const to_dict = <T extends WithId, S extends IndexedById<T>>
   (list: T[], initial: S): S => {
      return list.reduce((r, a) => ({...r, [a.id]: a}), initial);
   };

export const useHistoryPersons = (hist: HistoryItem[]): PersonSet => {
   const [data, setData] = React.useState<PersonSet>({});
   React.useEffect(
      () => {
         const ids = hist.filter(h => h.kind === HistoryKind.PERSON)
            .map(f => f.id);
         if (ids.length) {
            fetchPersonsFromServer({ ids })
               .then(s => setData(to_dict<Person, PersonSet>(s, {})));
         }
      },
      [hist]
   );
   return data;
};

export const useHistoryPlaces = (hist: HistoryItem[]): PlaceSet => {
   const [data, setData] = React.useState<PlaceSet>({});
   React.useEffect(
      () => {
         const ids = hist.filter(h => h.kind === HistoryKind.PLACE)
            .map(f => f.id);
         if (ids.length) {
            fetchPlacesFromServer({ ids })
               .then(s => setData(to_dict<Place, PlaceSet>(s, {})));
         }
      },
      [hist]
   );
   return data;
};

export const useHistorySources = (hist: HistoryItem[]): SourceSet => {
   const [data, setData] = React.useState<SourceSet>({});
   React.useEffect(
      () => {
         const ids = hist.filter(h => h.kind === HistoryKind.SOURCE)
            .map(f => f.id);
         if (ids.length) {
            fetchSourcesFromServer({ ids })
               .then(s => setData(to_dict<Source, SourceSet>(s, {})));
         }
      },
      [hist]
   );
   return data;
};

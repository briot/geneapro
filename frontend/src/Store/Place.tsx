import { actionCreator } from "../Store/Actions";

export interface Place {
   date: string | null;
   date_sort: string | null;
   id: number;
   name: string;
   parent_place_id?: number;
}

export interface PlaceSet {
   [id: number]: Place;
}

export interface PlaceListSettings {
   filter: string;
}

/**
 * Action: change one or more settings
 */
export const changePlaceListSettings = actionCreator<{
   diff: Partial<PlaceListSettings>;
}>("PLACELIST/SETTINGS");

import { actionCreator } from "../Store/Actions";
import { AssertionList } from "../Store/Assertion";

export interface Place {
   id: number;
   name: string;
   asserts?: AssertionList;
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

import { AssertionList } from '../Store/Assertion';

export interface Place {
   id: number;
   name: string;
   asserts?: AssertionList;
}

export interface PlaceSet {
   [id: number]: Place;
}

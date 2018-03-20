import { Assertion } from '../Store/Assertion';

export interface Place {
   id: number;
   name: string;

   asserts?: Assertion[];
}

export interface PlaceSet {
   [id: number]: Place;
}

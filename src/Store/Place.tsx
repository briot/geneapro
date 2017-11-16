export interface Place {
   id: number;
   name: string;
}

export interface PlaceSet {
   [id: number]: Place;
}

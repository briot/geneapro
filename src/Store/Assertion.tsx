export interface CharacteristicPart {
   name: string;
   value: string;
}

export interface Characteristic {
   date?: string;
   date_sort?: string;
   name: string;
   placeId?: number;  // points to a Place in the state
   parts: CharacteristicPart[];
}

export interface Assertion {
   surety:         number;
   researcher:     string;
   sourceId?:      number;  // points to a Source in the state
   rationale:      string;
   disproved:      boolean;
   last_changed:   string;
}

export interface P2P extends Assertion {
   person1Id:      number;  // points to a Persona in the state
   person2Id:      number;  // points to a Persona in the state
}

export interface P2C extends Assertion {
   personId:       number;  // points to a Persona in the state
   characteristic: Characteristic;
}

export interface P2E extends Assertion {
   personId:       number;  // points to a Persona in the state
   eventId:        number;  // points to a GenealogyEvent in the state
   role:           string;
}

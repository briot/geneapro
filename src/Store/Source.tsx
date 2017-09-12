export interface Source {
   id: number;
   title: string;  // full citation
   abbrev: string; // abbreviated citation
   biblio: string; // bibliograph citation
}

export interface SourceSet {
   [id: number]: Source;
}

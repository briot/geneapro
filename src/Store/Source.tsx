export interface Source {
   id: number;
   title: string;  // full citation
   abbrev: string; // abbreviated citation
   biblio: string; // bibliograph citation
   medium: string; // the template we use

   //  Research details
   comments?: string;
   subject_date?: string;
   subject_place?: string;
   jurisdiction_place?: string;
   last_change?: string;
}

export interface SourceSet {
   [id: number]: Source;
}

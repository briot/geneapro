import { AssertionList } from '../Store/Assertion';

export interface SourceMedia {
   id: number;
   comments: string;
   file: string;        // path to the file
   mime: string;        // type of the image
   url: string;         // how to get the image from the server
}

export interface Source {
   id: number;
   title: string;  // full citation
   abbrev: string; // abbreviated citation
   biblio: string; // bibliograph citation
   medium: string; // the template we use

   //  Research details
   comments?: string;
   higherSourceId?: number|null;
   subjectDate?: string;
   subjectPlace?: string;
   jurisdictionPlace?: string;
   lastChange?: Date;

   medias?: SourceMedia[];
   asserts?: AssertionList;
}

export interface SourceSet {
   [id: number]: Source;
}

export function createNewSource(medium: string): Source {
   return {
      id: -1,
      medium: medium,
      title: '',
      abbrev: '',
      biblio: '',
   };
}

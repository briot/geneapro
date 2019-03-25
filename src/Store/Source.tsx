import { actionCreator } from "../Store/Actions";
import { AssertionList } from "../Store/Assertion";

export interface SourceMedia {
   id: number;
   comments: string;
   file: string; // path to the file
   mime: string; // type of the image
   url: string; // how to get the image from the server
}

export interface CitationPart {
   name: string;
   value: string;
   fromHigh: boolean; // true if from high-level source
}

export interface CitationPartSet {
   [name: string]: CitationPart;
}

export interface Source {
   id: number;
   title: string; // full citation
   abbrev: string; // abbreviated citation
   biblio: string; // bibliograph citation
   medium: string; // the template we use

   //  Research details
   comments?: string;
   higherSourceId?: number | null;
   subjectDate?: string;
   subjectPlace?: string;
   jurisdictionPlace?: string;
   lastChange?: Date;

   medias?: SourceMedia[];
   asserts?: AssertionList;
   parts: CitationPartSet;
}

export interface SourceSet {
   [id: number]: Source;
}

export function createNewSource(medium: string): Source {
   return {
      id: -1,
      medium: medium,
      title: "",
      abbrev: "",
      biblio: "",
      medias: [],
      parts: {}
   };
}

export interface SourceListSettings {
   filter: string;
}

/**
 * Action: change one or more settings
 */
export const changeSourceListSettings = actionCreator<{
   diff: Partial<SourceListSettings>;
}>("SOURCELIST/SETTINGS");

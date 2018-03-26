import { Source, SourceSet } from '../Store/Source';
import { JSONAssertion, JSONResearcher,
         AssertionEntities, AssertionEntitiesJSON,
         assertionFromJSON, setAssertionEntities } from '../Server/Person';

// Representation of sources (media)
interface JSONSourceRepr {
   comments: string;
   id: number;
   file: string;        // path to the file
   mime: string;        // type of the image
   source_id: number;   // ??? Not needed
   url: string;         // how to get the image from the server
}

export interface JSONSource {
   id: number;
   abbrev: string;  // abbreviated citation
   biblio: string;  // bibliographic citation
   title: string;   // full citation
   comments: string;
   higher_source_id: number | null;
   jurisdiction_place?: {};
   last_change: string;
   medium: string;
   researcher: JSONResearcher;
   subject_date?: string;
   subject_place?: string;
}

interface JSONResult extends AssertionEntitiesJSON {
   source: JSONSource;
   higher_sources: JSONSource[] | null;
   asserts: JSONAssertion[];
   repr: JSONSourceRepr[];
}

export interface FetchSourceDetailsResult extends AssertionEntities {
   source: Source;
}

export function sourceFromJSON(s: JSONSource) {
   const result: Source = {
      id: s.id,
      title: s.title,
      abbrev: s.abbrev,
      biblio: s.abbrev,
      medium: '',
      medias: [],
      assertions: [],
   };
   return result;
}

export function* fetchSourceDetailsFromServer(id: number) {
   const resp: Response = yield window.fetch('/data/sources/' + id);
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }
   const data: JSONResult = yield resp.json();
   
   let r: FetchSourceDetailsResult = {
      source: sourceFromJSON(data.source),
      events: {},
      persons: {},
      places: {},
      sources: {},
   };
   r.source.assertions = data.asserts.map(a => assertionFromJSON(a));
   r.source.medias = data.repr.map(m => ({
      id: m.id,
      comments: m.comments,
      file: m.file,
      mime: m.mime,
      url: m.url
   }));
   setAssertionEntities(data, r);
   return r;
}

export interface FetchSourcesResult {
   sources: SourceSet;
}

export function* fetchSourcesFromServer() {
   const resp: Response = yield window.fetch('/data/sources/list');
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }
   const data: JSONSource[] = yield resp.json();
   return {sources: data};
}

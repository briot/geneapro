import { Source, SourceSet } from '../Store/Source';
import { AssertionEntities, AssertionEntitiesJSON,
         assertionFromJSON, setAssertionEntities } from '../Server/Person';
import { JSON } from '../Server/JSON';

interface JSONResult extends AssertionEntitiesJSON {
   source: JSON.Source;
   higher_sources: JSON.Source[] | null;
   asserts: JSON.Assertion[];
   repr: JSON.SourceRepr[];
}

export interface FetchSourceDetailsResult extends AssertionEntities {
   source: Source;
}

export function sourceFromJSON(s: JSON.Source) {
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
      researchers: {},
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
   const data: JSON.Source[] = yield resp.json();
   return {sources: data};
}

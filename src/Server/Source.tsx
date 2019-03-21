import { Source, SourceSet } from "../Store/Source";
import { AssertionList } from "../Store/Assertion";
import {
   AssertionEntities,
   AssertionEntitiesJSON,
   assertionFromJSON,
   setAssertionEntities
} from "../Server/Person";
import * as JSON from "../Server/JSON";

interface JSONResult extends AssertionEntitiesJSON {
   source: JSON.Source;
   higher_sources: JSON.Source[] | null;
   asserts: JSON.Assertion[];
   repr: JSON.SourceRepr[];
   parts: JSON.CitationPart[];
}

export interface FetchSourceDetailsResult extends AssertionEntities {
   source: Source;
}

export function sourceFromJSON(s: JSON.Source) {
   const result: Source = {
      id: s.id,
      title: s.title,
      abbrev: s.abbrev,
      biblio: s.biblio,
      comments: s.comments,
      higherSourceId: s.higher_source_id,
      medium: s.medium,
      jurisdictionPlace: s.jurisdiction_place,
      lastChange: new Date(s.last_change),
      subjectDate: s.subject_date,
      subjectPlace: s.subject_place,
      parts: {}
   };
   return result;
}

export function* fetchSourceDetailsFromServer(id: number) {
   const resp: Response = yield window.fetch("/data/sources/" + id);
   if (resp.status !== 200) {
      throw new Error("Server returned an error");
   }
   const data: JSONResult = yield resp.json();

   let r: FetchSourceDetailsResult = {
      source: sourceFromJSON(data.source),
      events: {},
      persons: {},
      places: {},
      sources: {},
      researchers: {}
   };
   r.source.asserts = new AssertionList(
      data.asserts.map(a => assertionFromJSON(a))
   );
   r.source.medias = data.repr.map(m => JSON.toMedia(m));

   for (const p of data.parts) {
      r.source.parts[p.name] = p;
   }
   setAssertionEntities(data, r);
   return r;
}

export interface FetchSourcesResult {
   sources: SourceSet;
}

export function* fetchSourcesFromServer() {
   const resp: Response = yield window.fetch("/data/sources/list");
   if (resp.status !== 200) {
      throw new Error("Server returned an error");
   }
   const data: JSON.Source[] = yield resp.json();
   const result: FetchSourcesResult = {
      sources: {}
   };
   for (const s of data) {
      result.sources[s.id] = sourceFromJSON(s);
   }
   return result;
}

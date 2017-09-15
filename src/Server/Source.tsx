import { Source } from '../Store/Source';
import { JSONAssertion, JSONResearcher } from '../Server/Person';

// Representation of sources (media)
interface JSONSourceRepr {
   comments: string;
   id: number;
   source_id: number;   // ??? Not needed
   url: string;
}

interface JSONSource {
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

interface JSONResult {
   source: JSONSource;
   higher_sources: JSONSource[] | null;
   asserts: JSONAssertion[];
   repr: JSONSourceRepr[];
}

export function* fetchSourceDetailsFromServer(id: number) {
   const resp: Response = yield window.fetch('/data/sources/' + id);
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }
   const data: JSONResult = yield resp.json();
   const r: Source = {
      id: data.source.id,
      title: data.source.title,
      abbrev: data.source.abbrev,
      biblio: data.source.abbrev,
      medium: '',
   };
   return r;
}

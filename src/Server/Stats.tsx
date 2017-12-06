/**
 * Sent back by the server
 */

export type JSONGenerationRange = [
   number /* index */,
   number /* min year */,
   number /* max year */,
   string /* legend */
];

export type JSONAges = [
   number /* start point */,
   number /* males */,
   number /* females */,
   number /* unknown */
];

export interface JSONStats {
   ranges: JSONGenerationRange[];
   ages: JSONAges[];
   total_ancestors: number;
   total_father: number;
   total_mother: number;
   total_persons: number;
   decujus: number;
   decujus_name: string;
}

export function fetchStatsFromServer(decujus: number): Promise<JSONStats> {
   return window.fetch('/data/stats/' + decujus)
      .then(resp => {
         if (resp.status !== 200) {
            throw new Error('Server returned an error');
         }
         return resp.json();
      });
}

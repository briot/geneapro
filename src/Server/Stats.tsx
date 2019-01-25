import { StatsSettings } from '../Store/Stats';

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

export function fetchStatsFromServer(
   decujus: number,
   settings: StatsSettings,
   signal?: AbortSignal,
): Promise<JSONStats> {
   return window.fetch(
      '/data/stats/' + decujus
      + '?max_age=' + settings.max_age
      + '&bar_width=' + settings.bar_width,
      {signal}
   ).then(resp => {
         if (resp.status !== 200) {
            throw new Error('Server returned an error');
         }
         return resp.json();
      });
}

export interface JSONCount {
   places: number;   // number of distinct places in database
   sources: number;  // number of distinct sources in database
   personas: number; // number of basic persons in database
   persons: number;  // number of persons (grouped by sameAs)
}

export function fetchCountFromServer(): Promise<JSONCount> {
   return window.fetch('/data/stats/count')
      .then(resp => {
         if (resp.status !== 200) {
            throw new Error('Server returned an error');
         }
         return resp.json();
      });
}

/**
 * Sent back by the server
 */

import CitationTemplate from '../Store/CitationTemplate';

export interface CitationModel {
   id: string;
   type: string;
   category: string;
}

export interface RepositoryData {
   id: number;
   description: string;
   name: string;
}

export interface JSONCitationModels {
   source_types: CitationModel[];
   repository_types: RepositoryData[];
}

interface JSONCitationTemplate {
   full: string;
   biblio: string;
   abbrev: string;
}

export function fetchCitationModelsFromServer(): Promise<JSONCitationModels> {
   return window.fetch('/data/citationModels')
      .then(resp => {
         if (resp.status !== 200) {
            throw new Error('Server returned an error');
         }
         return resp.json();
      });
}

export function fetchModelTemplateFromServer(model: string): Promise<CitationTemplate> {
   return window.fetch('/data/citationModel/' + model)
      .then(resp => {
         if (resp.status !== 200) {
            throw new Error('Server returned an error');
         }
         return resp.json();
      })
      .then((tmplt: JSONCitationTemplate) =>
            new CitationTemplate(tmplt.full, tmplt.biblio, tmplt.abbrev));
}

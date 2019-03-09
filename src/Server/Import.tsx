import * as Server from '../Server/Post';

/**
 * Sent back by the server
 */
interface ImportResponse {
   success: boolean;
   error: string;
}

/**
 * Import a GEDCOM file
 */
export function importGEDCOM(files: File[]): Promise<ImportResponse> {
   const data = new FormData();
   files.forEach(f => data.append('file', f));

   return Server.post('/data/import', data).then(
      (resp: Response) => {
         if (resp.status !== 200) {
            window.console.log('Upload failed', resp);
            return {
               success: false,
               error: `Upload failed with error ${resp.status}, ${resp.statusText}`,
            };
         }
         const result: Promise<ImportResponse> = resp.json();
         return result;
   });
}

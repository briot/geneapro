
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
export function importGEDCOM(files: File[], csrfToken: string): Promise<ImportResponse> {

   let data = new FormData();
   files.forEach(f => data.append('file', f));

   return window.fetch(
      '/data/import',
      {
         method: 'POST',
         headers: new Headers({
            'X-CSRFToken': csrfToken,
         }),
         credentials: 'same-origin',  // Send cookies from same origin
         body: data
      }
   ).then((resp: Response) => {
      if (resp.status !== 200) {
         window.console.log('Upload failed', resp);
         return {
            success: false,
            error: 'Upload failed with error {resp.status}, {resp.statusText}',
         };
      }
      const result: Promise<ImportResponse> = resp.json();
      return result;
   });
}

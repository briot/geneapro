interface Chunk {
   s: string;
   marker: number; // index into the markers, or -1 if outside of markers
}

type Marker = [string, string]; // open and close of a special section

interface Substitute {
   [key: string]: string;
}

export default class CitationTemplate {
   public full: string; // expanded
   public biblio: string; // expanded
   public abbrev: string; // expanded

   public constructor(
      protected _full: string,
      protected _biblio: string,
      protected _abbrev: string
   ) {
      this.full = "";
      this.biblio = "";
      this.abbrev = "";
   }

   /**
    * Change all keyword/value and expand the templates
    */
   public setParts(parts: Substitute) {
      this.full = this._substitute(this._full, parts);
      this.biblio = this._substitute(this._biblio, parts);
      this.abbrev = this._substitute(this._abbrev, parts);
   }

   /**
    * Return the list of all special keywords in the templates
    */
   public getParts(): Set<string> {
      const parts: Set<string> = new Set();
      const addParts = (s: string) => {
         const parsed = this._parse(s, [["{", "}"]]);
         for (const c of parsed) {
            if (c.marker === 0) {
               parts.add(c.s);
            }
         }
      };

      addParts(this._full);
      addParts(this._biblio);
      addParts(this._abbrev);

      return parts;
   }

   /**
    * Expand a string into a series of HTML elements to show bold, italics,...
    */
   public html(s: string): JSX.Element[] {
      return this._parse(s, [
         ["<i>", "</i>"],
         ["<b>", "</b>"],
         ["<small>", "</small>"]
      ]).map((sub, index) =>
         sub.marker === -1 ? (
            <span key={index}>{sub.s}</span>
         ) : sub.marker === 0 ? (
            <i key={index}>{sub.s}</i>
         ) : sub.marker === 1 ? (
            <b key={index}>{sub.s}</b>
         ) : (
            <small key={index}>{sub.s}</small>
         )
      );
   }

   /**
    * Replace all special sequences {...} in the template with their values
    * from parts.
    */
   private _substitute(s: string, parts: Substitute): string {
      return this._parse(s, [["{", "}"]]).reduce(
         (str, c) =>
            str +
            (c.marker === 0 ? parts[c.s] || `<small>${c.s}</small>` : c.s),
         ""
      );
   }

   /**
    * Parse a string by breaking it into chunks. The markers indicate how the
    * string is split (but no nesting of markers is taken into account)
    */
   private _parse(s: string, markers: Marker[]): Chunk[] {
      const result: Chunk[] = [];
      let start = 0;
      let marker = -1;
      for (let current = 0; current < s.length; ) {
         if (marker === -1) {
            for (let m = 0; m < markers.length; m++) {
               if (s.startsWith(markers[m][0], current)) {
                  result.push({
                     s: s.slice(start, current),
                     marker: -1
                  });
                  current += markers[m][0].length;
                  start = current;
                  marker = m;
                  break;
               }
            }
            if (marker === -1) {
               current++;
            }
         } else if (s.startsWith(markers[marker][1], current)) {
            result.push({
               s: s.slice(start, current),
               marker: marker
            });
            current += markers[marker][1].length;
            start = current;
            marker = -1;
         } else {
            current++;
         }
      }

      if (start !== s.length) {
         result.push({
            s: s.slice(start, s.length),
            marker: -1
         });
      }
      return result;
   }
}

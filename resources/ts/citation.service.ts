export interface ICitation {
   full    : string, // template for the full citation
   biblio  : string, // template for the bibliography
   abbrev  : string  // abbreviated version of the full template
}

// Server response for a citation template
export interface TemplateData {
   full    : string, // template for the full citation
   biblio  : string, // template for the bibliography
   abbrev  : string  // abbreviated version of the full template
}

export class CitationTemplate {
   public fields : string[] = [];  // list of customizable fields in template

   constructor(public template : TemplateData) {
      // use an explicit order for citations, to get better control on the
      // order of fields in the UI.
      let found : {[key : string]: boolean} = {};
      const re_part = /\{([^}]+)\}/g;
      const addFields = (template : string) => {
         let m : string[];
         while ((m = re_part.exec(template)) != null) {
            if (!found[m[1]]) {
               found[m[1]] = true;
               this.fields.push(m[1]);
            }
         }
      }
      addFields(this.template.full);
      addFields(this.template.biblio);
      addFields(this.template.abbrev);
   }

   /**
     * Resolve the template given some values for the fields.
     * @param vals    The values for the fields.
     */
    cite(vals : { [name : string] : string}) : ICitation {
       // Remove special chars like commas, quotes,... when they do not
       // separate words, in case some parts has not been set.
       function cleanup(str : string) {
          let s = ''
          while (s != str) {
             s = str;
             str = str.replace(/^ *[,:;.] */g, ''). // leading characters
                       replace(/"[,.]?"/g, '').
                       replace(/\( *[,.:;]? *\)/g, '').
                       replace("<I></I>", '').
                       replace(/[,:;] *$/, '').
                       replace(/([,:;.]) *[,:;.]/g, "$1");
          }
          return str;
       }

       let full = this.template.full;
       let biblio = this.template.biblio;
       let abbrev = this.template.abbrev;

       this.fields.forEach(name => {
          // Use a function for the replacement, to protect "$" characters
          function repl() { return vals[name] || ''}
          full   = full.replace('{' + name + '}', repl);
          biblio = biblio.replace('{' + name + '}', repl);
          abbrev = abbrev.replace('{' + name + '}', repl);
       });
       return {full:   cleanup(full),
               biblio: cleanup(biblio),
               abbrev: cleanup(abbrev)};
    }
}

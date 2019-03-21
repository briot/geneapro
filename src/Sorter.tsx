/**
 * Sorting rows by column
 */

export interface Sorter<T> {
   /**
    * Set the current kind. The exact semantic for each kinds is left to
    * the actual sorter, but could be "increasing", "decreasing",
    * "absolute value", ...
    * If kind is greater than the possible number of kinds, it should wrap
    * to 0. If kind is unspecified, the current kind should be increased by 1
    */
   setKind(kind?: number): void;

   /**
    * Compare two values.
    * `field_a` is the actual field from `a` that we need to sort on.
    */

   compare(a: T, b: T): number;

   /**
    * Format the column header to show additional info on the
    * sort order. For instance, when sorting on absolute values you
    * could display the header as "|a|", but use only "a" when sorting
    * on actual values.
    * Arrows for the direction are added automatically.
    */
   formatHeader(str: string): string;
   useDownArrow(): boolean;
}

/**
 * Sorting numbers
 */

export class NumberSorter implements Sorter<number> {
   kind: number = 0;

   setKind(kind?: number) {
      if (kind === undefined) {
         kind = this.kind + 1;
      }
      this.kind = kind % 2;
   }

   useDownArrow(): boolean {
      return this.kind === 1;
   }

   compare(a: number, b: number) {
      switch (this.kind) {
         case 0:
            return isNaN(a) ? -1 : isNaN(b) ? 1 : a - b;
         case 1:
            return isNaN(a) ? 1 : isNaN(b) ? -1 : b - a;
         default:
            return -1;
      }
   }

   formatHeader(str: string) {
      switch (this.kind) {
         case 0:
         case 1:
            return str;
         default:
            return "";
      }
   }
}

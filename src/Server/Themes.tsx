import { ColorScheme } from '../Store/ColorTheme';
import { FontWeight } from '../Server/JSON';

interface JSONThemeList {
   themes: {[id: number]: string},
}

export function fetchThemeListFromServer() {
   return window.fetch('/data/themelist')
      .then(r => r.json())
      .then((raw: JSONThemeList) => {
         const result: ColorScheme[] = Object.entries(raw.themes).map(
            ([id, name]) => ({id: Number(id), name}));
         return result;
      });
}

export interface OperatorValue {
   operator: OperatorString,
   value: string,
}

export interface RuleParts {
   [field: string]: OperatorValue;
}

export interface ThemeRule {
   name: string;
   type: string;
   fill: string;
   color: string;
   stroke: string;
   fontWeight: FontWeight;
   parts: RuleParts;
   children: ThemeRule[];
}

export type OperatorString = string;
export type OperatorList = Array<{
   op: OperatorString,
   label: string,
   doc: string,
}>;

export interface RuleList {
   rules: ThemeRule[];
   operators: OperatorList;
}

export function fetchThemeRulesFromServer(theme_id: number) {
   return window.fetch(`/data/rulelist?theme=${theme_id}`)
      .then(r => r.json())
      .then((raw: RuleList) => raw);
}

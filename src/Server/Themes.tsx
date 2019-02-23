import { ColorScheme } from '../Store/ColorTheme';
import * as JSON from '../Server/JSON';

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

export interface NestedThemeRule {
   type: string;
   parts: RuleParts;
   children: NestedThemeRule[];
}

// Only top-level rules have styles and names. Others (nested in AND and OR)
// do not have theme.
export interface ThemeRule extends NestedThemeRule {
   name: string;
   fill: string;
   color: string;
   stroke: string;
   fontWeight: JSON.FontWeight;
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
   characteristic_types: JSON.CharacteristicPartType[];
   event_types: JSON.EventType[];
   event_type_roles: JSON.EventTypeRole[];
}

export function fetchThemeRulesFromServer(theme_id: number) {
   return window.fetch(`/data/rulelist?theme=${theme_id}`)
      .then(r => r.json())
      .then((raw: RuleList) => raw);
}

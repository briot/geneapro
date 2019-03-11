import * as GP_JSON from '../Server/JSON';
import * as Server from '../Server/Post';

export interface OperatorValue {
   operator: GP_JSON.OperatorString;
   value: string;
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
   fill: string|null;
   color: string|null;
   stroke: string|null;
   fontWeight: GP_JSON.FontWeight|null;
}

export interface RuleList {
   rules: ThemeRule[];
}

export function fetchThemeRulesFromServer(theme_id: number) {
   return window.fetch(`/data/theme/${theme_id}/rules`)
      .then(r => r.json())
      .then((raw: RuleList) => raw);
}

/**
 * The promise returns the id of the newly created theme
 */
export function saveThemeOnServer(
   theme_id: number, name: string, rules: ThemeRule[]
) {
   const data = {
      name: name,
      rules: JSON.stringify(rules)
   };
   return Server.post(`/data/theme/${theme_id}/save`, JSON.stringify(data))
      .then(r => r.json())
      .then(r => r.id);
}

export function deleteThemeOnServer(theme_id: number) {
   return Server.post(`/data/theme/${theme_id}/delete`, undefined);
}

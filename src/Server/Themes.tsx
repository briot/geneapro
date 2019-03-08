import * as GP_JSON from '../Server/JSON';

export interface OperatorValue {
   operator: GP_JSON.OperatorString,
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
   fontWeight: GP_JSON.FontWeight;
}

export interface RuleList {
   rules: ThemeRule[];
}

export function fetchThemeRulesFromServer(theme_id: number) {
   return window.fetch(`/data/rulelist?theme=${theme_id}`)
      .then(r => r.json())
      .then((raw: RuleList) => raw);
}

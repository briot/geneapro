import * as React from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { Button, DropdownProps, Form, Select } from "semantic-ui-react";
import { predefinedThemes } from "./Store/ColorTheme";
import { AppState, MetadataDict } from "./Store/State";
import * as GP_JSON from "./Server/JSON";
import * as ServerThemes from "./Server/Themes";

interface ThemeLegendProps {
   theme: GP_JSON.ColorSchemeId;
}
const ThemeLegend: React.FC<ThemeLegendProps> = p => {
   const [rules, setRules] = React.useState<ServerThemes.ThemeRule[]>([]);

   React.useEffect(() => {
      ServerThemes.fetchThemeRulesFromServer(p.theme).then(
         (d: ServerThemes.RuleList) => setRules(d.rules)
      );
   }, [p.theme]);

   return (
      <div className="legend">
         <table>
            <tbody>
               {rules.map((r, idx) => (
                  <tr key={idx}>
                     <td>
                        <span
                           style={{
                              background: r.fill || undefined,
                              borderColor: r.stroke || "transparent",
                              borderWidth: 1,
                              borderStyle: "solid",
                              color: r.color || undefined,
                              fontWeight: r.fontWeight || "normal"
                           }}
                        >
                           Sample
                        </span>
                     </td>
                     <td>{r.name}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
};

interface ThemeSelectorProps {
   defaultValue: GP_JSON.ColorSchemeId;
   metadata: MetadataDict;

   label?: string;

   fieldName: string;
   onChange: (diff: Partial<{ [name: string]: GP_JSON.ColorSchemeId }>) => void;
   // on change, a diff with a single field fieldName will be sent
}

const ThemeSelector: React.FC<ThemeSelectorProps> = p => {
   const [showLegend, setLegend] = React.useState(false);
   const { onChange, fieldName } = p;

   const vals = predefinedThemes
      .concat(p.metadata.themes)
      .map(s => ({ text: s.name, value: s.id }));
   const onChangeCb = React.useCallback(
      (_: unknown, data: DropdownProps) =>
         onChange({ [fieldName]: data.value as number }),
      [onChange, fieldName]
   );

   const toggleLegend = React.useCallback(() => setLegend(!showLegend), [
      showLegend
   ]);

   return (
      <Form.Field>
         <label>{p.label || "Colors"}</label>
         <span>
            <Select
               fluid={true}
               options={vals}
               onChange={onChangeCb}
               defaultValue={p.defaultValue}
            />
            <Link to="/themeeditor">
               <Button
                  basic={true}
                  compact={true}
                  size="mini"
                  icon="ellipsis horizontal"
                  title="Create or edit custom color themes"
               />
            </Link>
            <Button
               basic={true}
               compact={true}
               size="mini"
               float="right"
               onClick={toggleLegend}
            >
               Legend
            </Button>
            {showLegend && <ThemeLegend theme={p.defaultValue} />}
         </span>
      </Form.Field>
   );
};

export default connect(
   (state: AppState) => ({ metadata: state.metadata }),
)(ThemeSelector);

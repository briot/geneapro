import * as React from "react";
import { connect } from "react-redux";
import {
   Button,
   Checkbox,
   CheckboxProps,
   Dropdown,
   DropdownItemProps,
   DropdownProps,
   Header,
   Input,
   InputProps,
   Select
} from "semantic-ui-react";
import Page from "../Page";
import { AppState, GPDispatch, MetadataDict } from "../Store/State";
import { fetchMetadata } from "../Store/Sagas";
import * as GP_JSON from "../Server/JSON";
import * as ServerThemes from "../Server/Themes";
import EditableList from "../EditableList";
import { createSelector } from "../Hooks";
import "./ThemeEditor.css";

const DO_NOTHING_OP = {
   op: "ignore",
   label: "-",
   doc: "Ignorw this attribute"
};

const DEFAULT_RULE: ServerThemes.ThemeRule = {
   name: "",
   type: "default",
   fill: null,
   color: "#333333",
   stroke: "#000000",
   fontWeight: null,
   parts: {},
   children: []
};

const NEW_NESTED_RULE: ServerThemes.NestedThemeRule = {
   type: "event",
   parts: {},
   children: []
};

const NEW_RULE: ServerThemes.ThemeRule = {
   ...NEW_NESTED_RULE,
   name: "",
   fill: null,
   color: "#333333",
   stroke: "#000000",
   fontWeight: "normal"
};

const NEW_THEME: GP_JSON.ColorScheme = { name: "New Theme", id: -1 };

const FONT_WEIGHT_OPTIONS = [
   { key: 0, value: "normal", text: "normal" },
   { key: 1, value: "bold", text: "bold" }
];

interface AllOptions {
   characteristic_types: DropdownItemProps[];
   event_types: DropdownItemProps[];
   event_type_roles: DropdownItemProps[];

   str_theme_operators: DropdownItemProps[];
   int_theme_operators: DropdownItemProps[];
   bool_theme_operators: DropdownItemProps[];
   person_theme_operators: DropdownItemProps[];

   /** Getting type and is_list from an operator */
   all_operators: { [id: string /* OperatorString */]: GP_JSON.OperatorDescr };
}

/**
 * Convert an operator's type (basically a python type) to a HTML type used
 * for <input> elements
 */
function pythonToHTML(typ: GP_JSON.OperatorTypes) {
   switch (typ) {
      case "int":
      case "person":
         return "number";
      case "str":
         return "text";
      case "bool":
      default:
         return "text"; // Wrong, but unused
   }
}

/**
 * Editing string or boolean value
 */

interface ValueBaseProps {
   ops: AllOptions;
   title?: string;

   choices?: DropdownItemProps[];
   // If specified, only a limited set of values is possible. Their 'value'
   // field should match the type expected by the operator.
}

type ValueType = number | string | boolean;

interface ValueProps extends ValueBaseProps {
   operator: GP_JSON.OperatorDescr;
   value: ValueType | ValueType[] | undefined;
   onValueChange: (value: ValueType | ValueType[]) => void;
}
const Value: React.FC<ValueProps> = p => {
   const onValueChange = React.useCallback(
      (e: {}, data: { value?: ValueType | ValueType[] }) =>
         p.onValueChange(data.value as ValueType | ValueType[]),
      [p]
   );

   const render = (v: ValueType, onValueChange: (nv: ValueType) => void) => {
      const onListItemChange = (e: {}, data: { value?: ValueType }) =>
         onValueChange(data.value as ValueType);

      return p.operator.basetype === "person" ? (
         <Input
            value={v}
            onChange={onListItemChange}
            title="person (-1 for current person)"
            type="number"
         />
      ) : (
         <Input
            value={v}
            placeholder="value"
            title={p.title}
            onChange={onListItemChange}
            type={pythonToHTML(p.operator.basetype)}
         />
      );
   };

   const create = React.useCallback(() => "", []);

   if (p.value === undefined || p.operator === undefined) {
      return null;
   }

   const convert = (v: ValueType) => {
      switch (p.operator.basetype) {
         case "int":
            return Number(v);
         case "bool":
            return v === true || v === "true";
         case "str":
            return v;
         case "person":
            return Number(v);
         default:
            return v;
      }
   };

   const v = p.operator.is_list
      ? Array.isArray(p.value)
         ? p.value.map(convert)
         : [convert(p.value)]
      : Array.isArray(p.value)
      ? convert(p.value[0])
      : convert(p.value);

   return p.choices ? (
      <Dropdown
         value={v}
         selection={true}
         options={p.choices}
         title={p.title}
         onChange={onValueChange}
         multiple={p.operator.is_list}
      />
   ) : p.operator.is_list ? (
      <EditableList
         list={v as ValueType[]}
         render={render}
         create={create}
         onChange={p.onValueChange}
      />
   ) : (
      render(v as ValueType, p.onValueChange)
   );
};

/**
 * Field, operator and value as string
 */

interface RuleProps {
   rule: ServerThemes.NestedThemeRule;
   ops: AllOptions;
   onChange: (r: ServerThemes.NestedThemeRule) => void;
}

interface FieldOperatorValueProps extends RuleProps, ValueBaseProps {
   label: string;
   field: string;

   // Which operators can be selected by the user.
   validOperators: DropdownItemProps[];

   // If specified, the operator cannot be configured by users
   forcedOperator?: GP_JSON.OperatorString;
}
const FieldOperatorValue = React.memo((p: FieldOperatorValueProps) => {
   const old: ServerThemes.RulePart = p.rule.parts[p.field];
   const onChange = React.useCallback(
      (v: ServerThemes.RulePart) => {
         const parts = { ...p.rule.parts, [p.field]: v };

         if (v.operator === DO_NOTHING_OP.op) {
            delete parts[p.field];
         }

         p.onChange({ ...p.rule, parts });
      },
      [p]
   );

   const onOpChange = React.useCallback(
      (e: {}, data: DropdownProps) => {
         const op = data.value as GP_JSON.OperatorString;
         if (!old) {
            onChange({
               field: p.field,
               operator: op,
               value:
                  p.choices && p.choices[0]
                     ? (p.choices[0].value as string)
                     : ""
            });
         } else {
            onChange({ ...old, operator: op });
         }
      },
      [old, onChange, p.field, p.choices]
   );

   const onValueChange = React.useCallback(
      (value: ValueType | ValueType[]) => onChange({ ...old, value }),
      [old, onChange]
   );

   if (!old && p.forcedOperator) {
      onOpChange(0, { value: p.forcedOperator });
      return null;
   }
   if (!p.ops.all_operators) {
      // Not loaded yet ?
      return null;
   }

   let children: React.ReactNode;
   if (old === undefined) {
      children = undefined;
   } else {
      children = (
         <Value
            {...p}
            value={old.value}
            onValueChange={onValueChange}
            operator={p.ops.all_operators[old.operator]}
         />
      );
   }

   return (
      <div>
         <span className="name">{p.label}</span>
         <span className="value">
            {!p.forcedOperator && (
               <Dropdown
                  value={old ? old.operator : DO_NOTHING_OP.op}
                  selection={true}
                  options={p.validOperators}
                  placeholder="How to compare values"
                  title={p.title}
                  onChange={onOpChange}
               />
            )}
            {children}
         </span>
      </div>
   );
});

/**
 * RuleAlive
 */

const RuleAlive = React.memo((p: RuleProps) => {
   const options = [
      { key: 0, value: true, text: "Currently alive" },
      { key: 1, value: false, text: "Dead, or more than 110 year old" }
   ];
   return (
      <>
         <FieldOperatorValue
            {...p}
            label="Alive ?"
            field="alive"
            forcedOperator="=bool"
            validOperators={p.ops.bool_theme_operators}
            choices={options}
         />
         <FieldOperatorValue
            {...p}
            label="Age"
            field="age"
            validOperators={p.ops.int_theme_operators}
            title="Comparing current age of the person"
         />
      </>
   );
});

/**
 * RuleWithRef
 */

const RuleWithRef = (p: RuleProps, label: string) => {
   return (
      <FieldOperatorValue
         {...p}
         label={label}
         field="ref"
         validOperators={p.ops.person_theme_operators}
         forcedOperator="=pers"
      />
   );
};

const RuleAncestor = React.memo((p: RuleProps) =>
   RuleWithRef(p, "Ancestor of")
);
const RuleDescendant = React.memo((p: RuleProps) =>
   RuleWithRef(p, "Descendant of")
);

/**
 * RuleWithSubs
 */

const RuleWithSubs = (p: RuleProps, label: string) => {
   const onListChange = React.useCallback(
      (children: ServerThemes.NestedThemeRule[]) =>
         p.onChange({ ...p.rule, children }),
      [p]
   );

   const renderRule = React.useCallback(
      (
         r: ServerThemes.NestedThemeRule,
         onChange: (r: ServerThemes.NestedThemeRule) => void
      ) => <NestedRuleEditor rule={r} ops={p.ops} onChange={onChange} />,
      [p.ops]
   );

   const onCreateRule = React.useCallback(() => NEW_NESTED_RULE, []);

   if (p.rule.children.length === 0) {
      onListChange([NEW_NESTED_RULE]);
      return null;
   }

   return (
      <div>
         <span className="name top">{label}</span>
         <span className="value">
            <EditableList
               list={p.rule.children}
               render={renderRule}
               create={onCreateRule}
               onChange={onListChange}
            />
         </span>
      </div>
   );
};

const RuleAnd = React.memo((p: RuleProps) => RuleWithSubs(p, "All must match"));
const RuleOr = React.memo((p: RuleProps) =>
   RuleWithSubs(p, "At least one must match")
);

/**
 * RuleKnown
 */

const RuleKnown = (p: RuleProps, label: string) => {
   const options = [
      { key: 0, value: true, text: `${label} is known` },
      { key: 1, value: false, text: `${label} is unknown` }
   ];
   return (
      <FieldOperatorValue
         {...p}
         label="Known ?"
         field="known"
         forcedOperator="=bool"
         validOperators={p.ops.bool_theme_operators}
         choices={options}
      />
   );
};

const RuleKnownFather = React.memo((p: RuleProps) => RuleKnown(p, "Father"));
const RuleKnownMother = React.memo((p: RuleProps) => RuleKnown(p, "Mother"));

/**
 * RuleImplex
 */

const RuleImplex = React.memo((p: RuleProps) => {
   return (
      <>
         <FieldOperatorValue
            {...p}
            label="In tree of"
            field="ref"
            validOperators={p.ops.person_theme_operators}
            forcedOperator="=pers"
         />
         <FieldOperatorValue
            {...p}
            label="Count"
            field="count"
            validOperators={p.ops.int_theme_operators}
            title="How many times the person appears in the tree"
         />
      </>
   );
});

/**
 * RuleDefault
 */

const RuleDefault: React.FC<RuleProps> = () => {
   return null;
};

/**
 * RuleCharacteristic
 */

const RuleCharacteristic = React.memo((p: RuleProps) => {
   return (
      <>
         <FieldOperatorValue
            {...p}
            label="Characteristic"
            field="typ"
            title="Which characteristic to test"
            validOperators={p.ops.int_theme_operators}
            choices={p.ops.characteristic_types}
         />
         <FieldOperatorValue
            {...p}
            label="Value"
            field="value"
            validOperators={p.ops.str_theme_operators}
            title="What value the characteristic should have"
         />
      </>
   );
});

/**
 * RuleEvent
 */

const RuleEvent = React.memo((p: RuleProps) => {
   return (
      <>
         <FieldOperatorValue
            {...p}
            label="Event"
            field="typ"
            title="Which event to test"
            validOperators={p.ops.int_theme_operators}
            choices={p.ops.event_types}
         />
         <FieldOperatorValue
            {...p}
            label="Count"
            field="count"
            validOperators={p.ops.int_theme_operators}
            title="Number of times this event occurs for the person (for instance number of time she was married)"
         />
         <FieldOperatorValue
            {...p}
            label="Role"
            field="role"
            title="Role the person plays in the event"
            validOperators={p.ops.int_theme_operators}
            choices={p.ops.event_type_roles}
         />
         <FieldOperatorValue
            {...p}
            label="Date"
            field="date"
            validOperators={p.ops.str_theme_operators}
            title="When the event took place (YYYY-MM-DD)"
         />
         <FieldOperatorValue
            {...p}
            label="Place name"
            field="place_name"
            validOperators={p.ops.str_theme_operators}
            title="Where the event took place"
         />
         <FieldOperatorValue
            {...p}
            label="Person's age"
            field="age"
            validOperators={p.ops.int_theme_operators}
            title="Age of the person when the event took place"
         />
      </>
   );
});

interface RuleTypeDescr {
   name: string;
   descr: string;
   component: React.ComponentType<RuleProps>;
}

// `id` must match the name of rules defined in python and the database
const RULE_TYPES: { [id: string]: RuleTypeDescr } = {
   characteristic: {
      name: "Characteristic",
      descr: "At least one characteristic matches",
      component: RuleCharacteristic
   },
   event: {
      name: "Event",
      descr: "At least one event matches",
      component: RuleEvent
   },
   and: {
      name: "And",
      descr: "All nested rules must match",
      component: RuleAnd
   },
   or: {
      name: "Or",
      descr: "At least one nested rule must match",
      component: RuleOr
   },
   alive: {
      name: "Alive",
      descr: "Is the person alive?",
      component: RuleAlive
   },
   knownfather: {
      name: "Known father",
      descr: "Is the father known ?",
      component: RuleKnownFather
   },
   knownmother: {
      name: "Known mother",
      descr: "Is the mother known ?",
      component: RuleKnownMother
   },
   ancestor: {
      name: "Ancestor",
      descr: "Is the person an ancestor",
      component: RuleAncestor
   },
   descendant: {
      name: "Descendant",
      descr: "Is the person a descendant",
      component: RuleDescendant
   },
   implex: {
      name: "Implex",
      descr: "Multiple times in the tree",
      component: RuleImplex
   },
   default: { name: "Always matches", descr: "", component: RuleDefault }
};

const RULE_TYPE_OPTIONS = Object.entries(RULE_TYPES).map(([id, r]) => ({
   key: id,
   value: id,
   text: r.name,
   content: <Header content={r.name} subheader={r.descr} />
}));

/**
 * Editing fontWeight
 */

interface FontWeightEditorProps {
   label: string;
   rule: ServerThemes.ThemeRule;
   onChange: (r: ServerThemes.ThemeRule) => void;
}
const FontWeightEditor = React.memo((p: FontWeightEditorProps) => {
   const onValueChange = React.useCallback(
      (e: {}, d: DropdownProps) =>
         p.onChange({ ...p.rule, fontWeight: d.value as GP_JSON.FontWeight }),
      [p]
   );
   const toggleNone = React.useCallback(
      (e: {}, d: CheckboxProps) =>
         p.onChange({ ...p.rule, fontWeight: d.checked ? "normal" : null }),
      [p]
   );
   return (
      <span className="color">
         <Checkbox
            checked={p.rule.fontWeight !== null}
            onChange={toggleNone}
            label={p.label}
            style={{ marginRight: 5 }}
         />
         {// Complex markup is so that checking/unchecking the checkbox
         // properly resets the <input> value to #000
         p.rule.fontWeight === null ? (
            <div className="ui input">
               <input type="color" disabled={true} />
            </div>
         ) : (
            <Dropdown
               value={p.rule.fontWeight || ""}
               selection={true}
               options={FONT_WEIGHT_OPTIONS}
               onChange={onValueChange}
            />
         )}
      </span>
   );
});

/**
 * Editing colors
 */

interface ColorEditorProps {
   label: string;
   title?: string;
   field: "fill" | "color" | "stroke";
   rule: ServerThemes.ThemeRule;
   onChange: (r: ServerThemes.ThemeRule) => void;
}
const ColorEditor = React.memo((p: ColorEditorProps) => {
   const onColorChange = React.useCallback(
      (e: {}, d: InputProps) => p.onChange({ ...p.rule, [p.field]: d.value }),
      [p]
   );
   const toggleNone = React.useCallback(
      (e: {}, d: CheckboxProps) =>
         p.onChange({ ...p.rule, [p.field]: d.checked ? "#000000" : null }),
      [p]
   );
   return (
      <span className="color">
         <Checkbox
            checked={p.rule[p.field] !== null}
            onChange={toggleNone}
            label={p.label}
            style={{ marginRight: 5 }}
         />
         {// Complex markup is so that checking/unchecking the checkbox
         // properly resets the <input> value to #000
         p.rule[p.field] === null ? (
            <div className="ui input">
               <input type="color" disabled={true} />
            </div>
         ) : (
            <Input
               type="color"
               value={p.rule[p.field]}
               onChange={onColorChange}
               title={p.title}
            />
         )}
      </span>
   );
});

/**
 * Nested rule editor
 */

interface NestedRuleEditorProps {
   rule: ServerThemes.NestedThemeRule;
   ops: AllOptions;
   onChange: (r: ServerThemes.NestedThemeRule) => void;
}
const NestedRuleEditor: React.FC<NestedRuleEditorProps> = p => {
   const onTypeChange = React.useCallback(
      (e: {}, d: DropdownProps) =>
         p.onChange({ type: d.value as string, parts: {}, children: [] }),
      [p]
   );
   const onPartsChange = React.useCallback(
      (r: ServerThemes.NestedThemeRule) => p.onChange(r),
      [p]
   );
   const comp = RULE_TYPES[p.rule.type];

   return (
      <div className="nestedRule">
         <div>
            <span className="name">Rule type</span>
            <span className="value">
               <Dropdown
                  value={p.rule.type}
                  selection={true}
                  fluid={true}
                  options={RULE_TYPE_OPTIONS}
                  placeholder="Choose rule type"
                  onChange={onTypeChange}
               />
            </span>
         </div>
         <comp.component rule={p.rule} ops={p.ops} onChange={onPartsChange} />
      </div>
   );
};

/**
 * Rule Editor
 * Editing a rule (and possibly its style and name).
 * This edits the index-th rule in the `rules` array.
 */

interface RuleEditorProps {
   rule: ServerThemes.ThemeRule;
   ops: AllOptions;
   onChange: (rules: ServerThemes.ThemeRule) => void;
}
const RuleEditor = React.memo((p: RuleEditorProps) => {
   const onNameChange = React.useCallback(
      (e: {}, d: InputProps) => p.onChange({ ...p.rule, name: d.value }),
      [p]
   );
   const onNestedRuleChange = React.useCallback(
      (r: ServerThemes.NestedThemeRule) => p.onChange({ ...p.rule, ...r }),
      [p]
   );

   return (
      <div className="rule">
         <div>
            <span className="name">Description</span>
            <span className="value">
               {p.rule.type === "default" ? (
                  "Default colors"
               ) : (
                  <Input
                     placeholder="rule description"
                     fluid={true}
                     value={p.rule.name}
                     onChange={onNameChange}
                  />
               )}
            </span>
         </div>
         <div>
            <span className="name">Style</span>
            <span className="value">
               <ColorEditor
                  label="Color"
                  field="color"
                  rule={p.rule}
                  onChange={p.onChange}
                  title="Color for text"
               />
               <ColorEditor
                  label="Stroke"
                  field="stroke"
                  rule={p.rule}
                  onChange={p.onChange}
                  title="Color for lines"
               />
               <ColorEditor
                  label="Fill"
                  field="fill"
                  rule={p.rule}
                  onChange={p.onChange}
                  title="Fill color for shapes"
               />
               <FontWeightEditor label="" rule={p.rule} onChange={p.onChange} />
            </span>
         </div>
         <NestedRuleEditor
            rule={p.rule}
            ops={p.ops}
            onChange={onNestedRuleChange}
         />
      </div>
   );
});

/**
 * Convert the metadata lists to dropdown items, to help create GUI
 * selectors for them
 */

const metadataToDropdown = (p: MetadataDict): AllOptions => {
   const typeToName: { [id: number]: string } = {};

   const build_operators = (typ: GP_JSON.OperatorTypes) => {
      const f = p.theme_operators.filter(t => t.basetype === typ);
      return [DO_NOTHING_OP, ...f].map(s => ({
         key: s.op,
         value: s.op,
         text: s.label
      }));
   };

   const characteristic_types = p.characteristic_types.map(s => ({
      key: s.id,
      value: s.id,
      text: s.name
   }));
   const event_types = p.event_types.map(s => {
      typeToName[s.id] = s.name;
      return {
         key: s.id,
         value: s.id,
         text: s.name
      };
   });
   const event_type_roles = p.event_type_roles.map(s => {
      const typ = s.type_id === null ? "all" : typeToName[s.type_id];
      const sub = `for ${typ} events`;
      return {
         key: s.id,
         value: s.id,
         text: s.name,
         content: <Header content={s.name} subheader={sub} />
      };
   });
   const all_operators: { [id: string]: GP_JSON.OperatorDescr } = {};
   for (const s of p.theme_operators) {
      all_operators[s.op] = s;
   }

   return {
      int_theme_operators: build_operators("int"),
      str_theme_operators: build_operators("str"),
      bool_theme_operators: build_operators("bool"),
      person_theme_operators: build_operators("person"),
      characteristic_types,
      event_types,
      event_type_roles,
      all_operators
   };
};
const useMetadataToDropdown = createSelector(metadataToDropdown);

/**
 * Theme Editor
 * Editing a whole theme, its name and list of rules.
 * This lets you chose which theme to edit.
 */

interface ThemeEditorProps {
   dispatch: GPDispatch;
   metadata: MetadataDict;
}

const ThemeEditorConnected: React.FC<ThemeEditorProps> = p => {
   const [themeList, setThemeList] = React.useState<GP_JSON.ColorScheme[]>(
      p.metadata.themes
   );
   const [selected, setSelected] = React.useState(NEW_THEME.id);
   const [modified, setModified] = React.useState(false);
   const [name, setName] = React.useState("");
   const [rules, setRules] = React.useState<ServerThemes.ThemeRule[]>([]);
   const ops = useMetadataToDropdown(p.metadata); // memoized

   React.useEffect(() => {
      for (const t of themeList) {
         if (t.id === selected) {
            setName(t.name);
            break;
         }
      }
   }, [selected, themeList]);

   React.useEffect(() => {
      setThemeList([...p.metadata.themes, NEW_THEME]);
   }, [p.metadata.themes]);

   const loadRuleList = React.useCallback(() => {
      if (selected === -1) {
         setRules([DEFAULT_RULE]);
         return;
      }

      ServerThemes.fetchThemeRulesFromServer(selected).then(
         (d: ServerThemes.RuleList) => {
            setRules(d.rules.length === 0 ? [DEFAULT_RULE] : d.rules);
         }
      );
   }, [selected, setRules]);
   React.useEffect(loadRuleList, [loadRuleList]);

   const onChange = React.useCallback(
      (e: {}, data: DropdownProps) => setSelected(Number(data.value)),
      []
   );

   const onNameChange = React.useCallback(
      (e: {}, data: InputProps) => {
         setModified(true);
         setName(data.value as string);
      },
      [setName]
   );

   const onRulesChange = React.useCallback(
      (rules: ServerThemes.ThemeRule[]) => {
         setModified(true);
         setRules(rules);
      },
      []
   );

   const onDeleteTheme = React.useCallback(() => {
      ServerThemes.deleteThemeOnServer(selected).then(() => {
         setModified(false);
         setSelected(NEW_THEME.id);
         fetchMetadata.execute(p.dispatch, { force: true });
      });
   }, [selected, p.dispatch]);

   const onCancel = React.useCallback(() => {
      loadRuleList();
      setModified(false);
   }, [loadRuleList]);

   const onSave = React.useCallback(() => {
      // Reload list of themes
      ServerThemes.saveThemeOnServer(selected, name, rules).then(
         (theme_id: number) => {
            setModified(false);
            fetchMetadata.execute( p.dispatch, { force: true });
            setSelected(theme_id); //  ??? Only once we have reloaded
         }
      );
   }, [selected, name, rules, p.dispatch]);

   const renderRule = React.useCallback(
      (
         rule: ServerThemes.ThemeRule,
         onChange: (rule: ServerThemes.ThemeRule) => void
      ) => <RuleEditor rule={rule} onChange={onChange} ops={ops} />,
      [ops]
   );

   const createRule = React.useCallback(() => NEW_RULE, []);

   const main = (
      <div className="colortheme">
         <div>
            <h2>Color Theme</h2>
            <Select
               fluid={false}
               options={themeList.map(s => ({ text: s.name, value: s.id }))}
               onChange={onChange}
               value={selected}
               disabled={modified}
            />
            <Input
               value={name}
               onChange={onNameChange}
               required={true}
               error={!name}
               placeholder="theme name"
               style={{ marginTop: 0 }}
            />
            {selected !== -1 && (
               <Button
                  icon="trash"
                  title="Delete this theme"
                  onClick={onDeleteTheme}
               />
            )}
         </div>
         <p>
            Rules are applied independently for each person. The styles of the
            matching rules are then applied from top to bottom, and later rules
            override the style set by earlier ones.
         </p>
         <EditableList
            list={rules}
            render={renderRule}
            create={createRule}
            onChange={onRulesChange}
            orderable={true}
         />
         {modified && (
            <Button.Group floated="right">
               <Button onClick={onCancel}>Cancel</Button>
               <Button.Or />
               <Button onClick={onSave} positive={true} disabled={!name}>
                  Save
               </Button>
            </Button.Group>
         )}
      </div>
   );

   return <Page leftSide={<div />} main={main} />;
};

const ThemeEditor = connect(
   (state: AppState) => ({
      metadata: state.metadata
   }),
   (dispatch: GPDispatch) => ({
      dispatch
   })
)(ThemeEditorConnected);

export default ThemeEditor;

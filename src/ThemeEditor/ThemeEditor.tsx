import * as React from 'react';
import { connect } from 'react-redux';
import { Button, Checkbox, CheckboxProps,
         Dropdown, DropdownItemProps, DropdownProps,
         Form, Header, Input, InputProps,
         Select } from 'semantic-ui-react';
import Page from '../Page';
import { AppState, GPDispatch } from '../Store/State';
import * as GP_JSON from '../Server/JSON';
import * as ServerThemes from '../Server/Themes';
import { createSelector } from '../Hooks';
import './ThemeEditor.css';

const DO_NOTHING_OP = {
   op: 'ignore',
   label: 'any',
   doc: 'Ignorw this attribute',
};

const DEFAULT_RULE: ServerThemes.ThemeRule = {
   name: '',
   type: 'default',
   fill: 'none',
   color: '#333333',
   stroke: '#000000',
   fontWeight: 'normal',
   parts: {},
   children: [],
};

const NEW_NESTED_RULE: ServerThemes.NestedThemeRule = {
   type: 'event',
   parts: {},
   children: [],
}

const NEW_RULE: ServerThemes.ThemeRule = {
   ...NEW_NESTED_RULE,
   name: '',
   fill: 'none',
   color: '#333333',
   stroke: '#000000',
   fontWeight: 'normal',
};

const NEW_THEME: GP_JSON.ColorScheme = {name: 'New Theme', id: -1};

const FONT_WEIGHT_OPTIONS = [
    {key: 0, value: 'normal', text: 'normal'},
    {key: 1, value: 'bold', text: 'bold'},
];

interface AllOptions {
   theme_operators: DropdownItemProps[];
   characteristic_types: DropdownItemProps[];
   event_types: DropdownItemProps[];
   event_type_roles: DropdownItemProps[];
}

interface RuleProps {
   rule: ServerThemes.NestedThemeRule;
   ops: AllOptions;
   onChange: (r: ServerThemes.NestedThemeRule) => void;
}

/**
 * Field, operator and value as string
 */

interface FieldOperatorValueProps extends RuleProps {
   label: string;
   field: string;
   title?: string;

   choices?: DropdownItemProps[];
   // If specified, only a limited set of values is possible

   asPerson?: boolean;
   // If true, the value is a person. Ignored if choices is set.

   forcedOperator?: GP_JSON.OperatorString;
   // If specified, the operator cannot be configured by users
}
const FieldOperatorValue = (p: FieldOperatorValueProps) => {
   const old = p.rule.parts[p.field];
   const onChange = React.useCallback(
      (v: ServerThemes.OperatorValue) => {
         const parts = {...p.rule.parts, [p.field]: v};

         if (v.operator == DO_NOTHING_OP.op) {
            delete parts[p.field];
         }

         p.onChange({...p.rule, parts});
      },
      [p.rule, p.onChange]);

   const onOpChange = React.useCallback(
      (e: any, data: DropdownProps) => {
         const d = old
            ? old.value
            : (p.choices && p.choices[0]) ? p.choices[0].value as string : '';
         onChange({operator: data.value as string, value: d});
      },
      [onChange]);

   const onValueChange = React.useCallback(
      (e: any, data: {value?: string|number|boolean|(string|number|boolean)[]|undefined}) =>
         onChange({operator: old.operator, value: data.value as string}),
      [onChange]);

   // ??? Editing multiple values when operator is "in"

   return (
      <div>
         <span className="name">{p.label}</span>
         <span className="value">
            {
               !p.forcedOperator &&
               <Dropdown
                  defaultValue={old ? old.operator : DO_NOTHING_OP.op}
                  selection={true}
                  options={p.ops.theme_operators}
                  placeholder="How to compare values"
                  title={p.title}
                  onChange={onOpChange}
               />
            }
            {
               old &&
               (p.choices ? (
                  <Dropdown
                     defaultValue={old.value}
                     selection={true}
                     options={p.choices}
                     title={p.title}
                     onChange={onValueChange}
                  />
               ) : p.asPerson ? (
                  <Input
                     defaultValue={old.value}
                     onChange={onValueChange}
                     placeholder="persoon"
                  />
               ) : (
                  <Input
                     defaultValue={old.value}
                     placeholder="value"
                     title={p.title}
                     onChange={onValueChange}
                  />
               ))
            }
          </span>
      </div>
   );
};

/**
 * RuleAlive
 */

const RuleAlive = (p: RuleProps) => {
   const options = [
      {key: 0, value: 'Y', text: 'Currently alive'},
      {key: 1, value: 'N', text: 'Dead, or more than 110 year old'},
   ];
   return (
      <>
         <FieldOperatorValue
            {...p}
            label="Alive ?"
            field="alive"
            forcedOperator="="
            choices={options}
         />
         <FieldOperatorValue
            {...p}
            label="Age"
            field="age"
            title="Comparing current age of the person"
         />
      </>
   );
};

/**
 * RuleWithRef
 */

const RuleWithRef = (p: RuleProps, label: string) => {
   return (
      <FieldOperatorValue
         {...p}
         label={label}
         field="ref"
         asPerson={true}
         forcedOperator="="
      />
   );
};

const RuleAncestor = (p: RuleProps) => RuleWithRef(p, 'Ancestor of');
const RuleDescendant = (p: RuleProps) => RuleWithRef(p, 'Descendant of');

/**
 * RuleWithSubs
 */

const RuleWithSubs = (p: RuleProps, label: string) => {
   const onChange = (children: ServerThemes.NestedThemeRule[]) =>
      p.onChange({...p.rule, children});
   const onAddRule = () =>
      p.onChange({...p.rule, children: [...p.rule.children, NEW_NESTED_RULE]});

   if (p.rule.children.length == 0) {
      onAddRule();
      return null;
   }

   return (
      <div>
         <span className="name top">{label}</span>
         <span className="value">
            <RuleListEditor
               ops={p.ops}
               rules={p.rule.children}
               component={NestedRuleEditor}
               onChange={onChange}
               onAddRule={onAddRule}
            />
         </span>
      </div>
   )
};

const RuleAnd = (p: RuleProps) => RuleWithSubs(p, 'All must match');
const RuleOr = (p: RuleProps) => RuleWithSubs(p, 'At least one must match');

/**
 * RuleKnown
 */

const RuleKnown= (p: RuleProps, label: string) => {
   const options = [
      {key: 0, value: "true", text: `${label} is known`},
      {key: 1, value: "false", text: `${label} is unknown`},
   ];
   return (
      <FieldOperatorValue
         {...p}
         label="Known ?"
         field="known"
         forcedOperator="="
         choices={options}
      />
   );
};

const RuleKnownFather = (p: RuleProps) => RuleKnown(p, 'Father');
const RuleKnownMother = (p: RuleProps) => RuleKnown(p, 'Mother');

/**
 * RuleImplex
 */

const RuleImplex = (p: RuleProps) => {
   return (
      <>
         <FieldOperatorValue
            {...p}
            label="In tree of"
            field="ref"
            asPerson={true}
            forcedOperator="="
         />
         <FieldOperatorValue
            {...p}
            label="Count"
            field="count"
            title="How many times the person appears in the tree"
         />
      </>
   );
};

/**
 * RuleDefault
 */

const RuleDefault = (p: RuleProps) => {
   return null;
}

/**
 * RuleCharacteristic
 */

const RuleCharacteristic = (p: RuleProps) => {
   return (
      <>
         <FieldOperatorValue
            {...p}
            label="Characteristic"
            field="typ"
            title="Which characteristic to test"
            choices={p.ops.characteristic_types}
         />
         <FieldOperatorValue
            {...p}
            label="Value"
            field="value"
            title="What value the characteristic should have"
         />
      </>
   );
};

/**
 * RuleEvent
 */

const RuleEvent = (p: RuleProps) => {
   return (
      <>
         <FieldOperatorValue
            {...p}
            label="Event"
            field="typ"
            title="Which event to test"
            choices={p.ops.event_types}
         />
         <FieldOperatorValue
            {...p}
            label="Count"
            field="count"
            title="Number of times this event occurs for the person (for instance number of time she was married)"
         />
         <FieldOperatorValue
            {...p}
            label="Role"
            field="role"
            title="Role the person plays in the event"
            choices={p.ops.event_type_roles}
         />
         <FieldOperatorValue
            {...p}
            label="Date"
            field="date"
            title="When the event took place"
         />
         <FieldOperatorValue
            {...p}
            label="Place name"
            field="place_name"
            title="Where the event took place"
         />
         <FieldOperatorValue
            {...p}
            label="Person's age"
            field="age"
            title="Age of the person when the event took place"
         />
      </>
   );
};

interface RuleTypeDescr {
   name: string;
   descr: string;
   component: React.ComponentType<RuleProps>;
}

// `id` must match the name of rules defined in python and the database
const RULE_TYPES: {[id: string]: RuleTypeDescr}  = {
   'characteristic': {name: 'Characteristic',
                      descr: 'At least one characteristic matches',
                      component: RuleCharacteristic},
   'event':          {name: 'Event', descr: 'At least one event matches',
                      component: RuleEvent},
   'and':            {name: 'And', descr: 'All nested rules must match',
                      component: RuleAnd},
   'or':             {name: 'Or', descr: 'At least one nested rule must match',
                      component: RuleOr},
   'alive':          {name: 'Alive', descr: 'Is the person alive?',
                      component: RuleAlive},
   'knownfather':    {name: 'Known father', descr: 'Is the father known ?',
                      component: RuleKnownFather},
   'knownmother':    {name: 'Known mother', descr: 'Is the mother known ?',
                      component: RuleKnownMother},
   'ancestor':       {name: 'Ancestor', descr: 'Is the person an ancestor',
                      component: RuleAncestor},
   'descendant':     {name: 'Descendant', descr: 'Is the person a descendant',
                      component: RuleDescendant},
   'implex':         {name: 'Implex', descr: 'Multiple times in the tree',
                      component: RuleImplex},
   'default':        {name: 'Always matches', descr: '',
                      component: RuleDefault},
};

const RULE_TYPE_OPTIONS = Object.entries(RULE_TYPES).map(([id, r]) =>
   ({
      key: id,
      value: id,
      text: r.name,
      content: <Header content={r.name} subheader={r.descr} />
    }));

/**
 * Editing colors
 */

interface ColorEditorProps {
   label: string;
   title?: string;
   field: 'fill' | 'color' | 'stroke';
   rule: ServerThemes.ThemeRule;
   onChange: (r: Partial<ServerThemes.ThemeRule>) => void;
}
const ColorEditor = (p: ColorEditorProps) => {
   const onColorChange = React.useCallback(
      (e: any, d: InputProps) => p.onChange({[p.field]: d.value}),
      [p.onChange]);
   const toggleNone = React.useCallback(
      (e: any, d: CheckboxProps) =>
         p.onChange({[p.field]: d.checked ? '#000000' : 'none'}),
      [p.onChange]);
   return (
      <span className='color'>
         <Checkbox
            checked={p.rule[p.field] !== 'none'}
            onChange={toggleNone}
            label={p.label}
            style={{marginRight: 5}}
         />
         {
            // Complex markup is so that checking/unchecking the checkbox
            // properly resets the <input> value to #000
            p.rule[p.field] === 'none' ? (
               <div className="ui input">
                  <input type="color" disabled={true}/>
               </div>
            ) : (
               <Input
                  type="color"
                  defaultValue={p.rule[p.field]}
                  onChange={onColorChange}
                  title={p.title}
               />
            )
         }
      </span>
   );
};

/**
 * Nested rule editor
 */

interface NestedRuleEditorProps {
   rule: ServerThemes.NestedThemeRule;
   ops: AllOptions;
   onChange: (r: ServerThemes.NestedThemeRule) => void;
}
const NestedRuleEditor = (p: NestedRuleEditorProps) => {
   const onTypeChange = (e: any, d: DropdownProps) =>
      p.onChange({type: d.value as string, parts: {}, children: []});
   const onPartsChange = (r: ServerThemes.NestedThemeRule) => p.onChange(r);
   const comp = RULE_TYPES[p.rule.type];

   return (
      <>
         <div>
            <span className="name">Rule type</span>
            <span className="value">
               <Dropdown
                  defaultValue={p.rule.type}
                  selection={true}
                  fluid={true}
                  options={RULE_TYPE_OPTIONS}
                  placeholder="Choose rule type"
                  onChange={onTypeChange}
               />
            </span>
         </div>
         <comp.component
            rule={p.rule}
            ops={p.ops}
            onChange={onPartsChange}
         />
      </>
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
   onChange: (rules: Partial<ServerThemes.ThemeRule>) => void;
}
const RuleEditor = (p: RuleEditorProps) => {
   const onNameChange = (e: any, d: InputProps) => p.onChange({name: d.value});
   const onFillChange = (e: any, d: InputProps) => p.onChange({fill: d.value});
   const onStrokeChange = (e: any, d: InputProps) =>
      p.onChange({stroke: d.value});
   const onFWChange = (e: any, d: DropdownProps) =>
      p.onChange({fontWeight: d.value as GP_JSON.FontWeight});
   const onNestedRuleChange = (r: ServerThemes.NestedThemeRule) =>
      p.onChange(r);

   return (
      <div className="rule">
         <div>
            <span className="name">Description</span>
            <span className="value">
               {
                  p.rule.type === 'default' ? 'Default colors' :
                  <Input
                     placeholder="rule description"
                     fluid={true}
                     defaultValue={p.rule.name}
                     onChange={onNameChange}
                  />
               }
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
               <Dropdown
                  defaultValue={p.rule.fontWeight}
                  selection={true}
                  options={FONT_WEIGHT_OPTIONS}
                  onChange={onFWChange}
               />
            </span>
         </div>
         <NestedRuleEditor
            rule={p.rule}
            ops={p.ops}
            onChange={onNestedRuleChange}
         />
      </div>
   );
};

/**
 * Editing a list of rules.
 * Possibility to add new rules, remove some, reorder them,...
 */

interface RuleListEditorProps<T extends ServerThemes.NestedThemeRule> {
   rules: T[];
   ops: AllOptions;
   onChange: (rules: T[]) => void;
   onAddRule: () => void;
   component: React.ComponentType<{
      rule: T;
      ops: AllOptions;
      onChange: (r: Partial<T>) => void;
   }>;
}

const RuleListEditor = <T extends ServerThemes.NestedThemeRule>(
   p: RuleListEditorProps<T>
) => {
   return (
      <div>
         {p.rules.map((r, idx) =>
            <p.component
               key={idx}
               rule={r}
               ops={p.ops}
               onChange={(r: Partial<T>) => {
                  const tmp = [...p.rules];
                  tmp[idx] = {...tmp[idx], ...r};
                  p.onChange(tmp);
               }}
            />)
         }
         <Button icon="add" onClick={p.onAddRule}/>
      </div>
   );
};

/**
 * Convert the metadata lists to dropdown items, to help create GUI
 * selectors for them
 */

const metadataToDropdown = (p: GP_JSON.Metadata): AllOptions => {
   const typeToName: {[id: number]: string} = {};
   const theme_operators = [DO_NOTHING_OP, ...p.theme_operators].map(s => ({
      key: s.op,
      value: s.op,
      text: s.label,
      content: <Header content={s.label} subheader={s.doc} />
   }));
   const characteristic_types = p.characteristic_types.map(s => ({
      key: s.id,
      value: s.id,
      text: s.name,
   }));
   const event_types = p.event_types.map(s => {
      typeToName[s.id] = s.name;
      return {
         key: s.id,
         value: s.id,
         text: s.name,
      };
   });
   const event_type_roles = p.event_type_roles.map(s => {
      const typ = s.type_id === null ?  'all' : typeToName[s.type_id];
      const sub = `for ${typ} events`;
      return {
         key: s.id,
         value: s.id,
         text: s.name,
         content: <Header content={s.name} subheader={sub} />
      };
   });
   return {theme_operators, characteristic_types,
           event_types, event_type_roles};
};
const useMetadataToDropdown = createSelector(metadataToDropdown);

/**
 * Theme Editor
 * Editing a whole theme, its name and list of rules.
 * This lets you chose which theme to edit.
 */

interface ThemeEditorProps {
   dispatch: GPDispatch;
   metadata: GP_JSON.Metadata;
}

const ThemeEditorConnected = (p: ThemeEditorProps) => {
   const [themeList, setThemeList] = React.useState<GP_JSON.ColorScheme[]>([]);
   const [selected, setSelected] = React.useState(-1);
   const [modified, setModified] = React.useState(false);
   const [name, setName] = React.useState('');
   const [rules, setRules] = React.useState<ServerThemes.ThemeRule[]>([]);
   const ops = useMetadataToDropdown(p.metadata); // memoized

   const selectTheme = (index: number) => {
      for (const t of themeList) {
         if (t.id == index) {
            setName(t.name);
            break;
         }
      }
      setSelected(index); // Will automatically reload rules from server
   };

   React.useEffect(
      () => {
         setThemeList([...p.metadata.themes, NEW_THEME]);
         setSelected(0);
      },
      [p.metadata.themes]);

   const loadRuleList = () => {
      if (themeList.length == 0 || selected == -1) {
         return;
      }

      ServerThemes.fetchThemeRulesFromServer(selected)
      .then((d: ServerThemes.RuleList) => {
         setRules(d.rules.length === 0 ? [DEFAULT_RULE] : d.rules);
      })
   };
   React.useEffect(loadRuleList, [themeList, selected]);

   const onChange = React.useCallback(
      (_: any, data: DropdownProps) => selectTheme(data.data as number),
      [themeList]);

   const onNameChange = React.useCallback(
      (_: any, data: InputProps) => {
         setModified(true);
         setName(data.value as string);
      },
      [setName]);

   const onRulesChange = (rules: ServerThemes.ThemeRule[]) => {
      setModified(true);
      setRules(rules);
   };

   const onAddRule = () => {
      setModified(true);
      setRules([...rules, NEW_RULE]);
   };
   const onCancel = () => {
      loadRuleList();
      setModified(false);
   };

   const onSave = () => {
      window.console.log(
         `/data/rulelist/set?theme=${selected}&name=${name}`,
         JSON.stringify(rules)
      );
   };

   const main = (
      <div className="colortheme">
         <div>
            <h2>Color Theme</h2>
            <Select
               fluid={false}
               options={themeList.map(s => ({text: s.name, value: s.id}))}
               onChange={onChange}
               defaultValue={selected}
               disabled={modified}
            />
            <Input
               defaultValue={name}
               onChange={onNameChange}
               required={true}
               error={!name}
               placeholder='theme name'
               style={{marginTop: 0}}
            />
         </div>
         <RuleListEditor
            rules={rules}
            ops={ops}
            onChange={onRulesChange}
            onAddRule={onAddRule}
            component={RuleEditor}
         />
         {
            modified &&
            <Button.Group floated="right">
               <Button onClick={onCancel}>Cancel</Button>
               <Button.Or/>
               <Button
                  onClick={onSave}
                  positive={true}
                  disabled={!name}
               >
                  Save
               </Button>
            </Button.Group>
         }
      </div>
   );

   return (
      <Page
         leftSide={
            <div/>
         }
         main={main}
      />
   );
};

const ThemeEditor = connect(
   (state: AppState) => ({
      metadata: state.metadata,
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(ThemeEditorConnected);

export default ThemeEditor;

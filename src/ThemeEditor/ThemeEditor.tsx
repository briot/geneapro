import * as React from 'react';
import { connect } from 'react-redux';
import { Button, Checkbox, CheckboxProps,
         Dropdown, DropdownItemProps, DropdownProps,
         Form, Header, Input, InputProps,
         Select } from 'semantic-ui-react';
import Page from '../Page';
import { ColorScheme } from '../Store/ColorTheme';
import { AppState, GPDispatch } from '../Store/State';
import { FontWeight } from '../Server/JSON';
import { fetchThemeListFromServer, fetchThemeRulesFromServer,
         RuleList, ThemeRule, RuleParts, OperatorString, OperatorList,
         OperatorValue } from '../Server/Themes';
import './ThemeEditor.css';

/**
 * Field, operator and value editor
 */

interface FieldOperatorValueProps {
   label: string;
   title?: string;
   ops: DropdownItemProps[];
   defaultValue: OperatorValue|undefined;
   onChange: (p: OperatorValue) => void;
}

const FieldOperatorValue = (p: FieldOperatorValueProps) => {
   if (!p.defaultValue) {
      p.onChange({operator: '=', value: ''});
      return null;
   }

   const onOpChange = (e: any, d: DropdownProps) =>
      p.onChange({operator: d.value as string, value: p.defaultValue!.value});
   const onValChange = (e: any, d: InputProps) =>
      p.onChange({operator: p.defaultValue!.operator, value: d.value});

   // ??? Editing multiple values when operator is "in"
   // ??? Specify valid values for "value" (list of characteristic type,
   //    numbers,...)

   return (
      <div>
         <span className="name">{p.label}</span>
         <span className="value">
            <Dropdown
               defaultValue={p.defaultValue.operator}
               selection={true}
               options={p.ops}
               placeholder="How to compare values"
               onChange={onOpChange}
            />
            <Input
               defaultValue={p.defaultValue.value}
               placeholder={"value"}
               title={p.title}
               onChange={onValChange}
            />
          </span>
      </div>
   );
};

/**
 * Field as a choice between a set of values
 */

interface FieldChoiceProps {
   label: string;
   title?: string;
   defaultValue: OperatorValue|undefined;
   choices: DropdownItemProps[];
   onChange: (p: OperatorValue) => void;
}

const FieldChoice = (p: FieldChoiceProps) => {
   const onDropChange = (e: any, data: DropdownProps) =>
      p.onChange({value: data.value as string, operator: '='});

   if (!p.defaultValue) {
      p.onChange({value: p.choices[0].value as string, operator: '='});
      return null;
   }

   return (
      <div>
         <span className="name">{p.label}</span>
         <span className="value">
            <Dropdown
               defaultValue={p.defaultValue.value}
               selection={true}
               options={p.choices}
               title={p.title}
               onChange={onDropChange}
            />
         </span>
      </div>
   );
};

/**
 * Field that selects a person
 */

interface FieldPersonProps {
   label: string;
   defaultValue: OperatorValue|undefined;
   onChange: (p: OperatorValue) => void;
}

const FieldPerson = (p: FieldPersonProps) => {
   const onChange = (e: any, data: InputProps) =>
      p.onChange({value: data.value, operator: '='});

   if (!p.defaultValue) {
      p.onChange({value: '1', operator: '='});
      return null;
   }

   return (
      <div>
         <span className="name">{p.label}</span>
         <span className="value">
            <Input defaultValue={p.defaultValue.value} onChange={onChange}/>
         </span>
      </div>
   );
};

/**
 * RuleAlive
 */

interface RuleProps {
   rule: ThemeRule;
   ops: DropdownItemProps[];
   onChange: (r: ThemeRule) => void;
}

const RuleAlive = (p: RuleProps) => {
   const onAliveChange = (v: OperatorValue) =>
      p.onChange({...p.rule, parts: {...p.rule.parts, alive: v}});
   const onAgeChange = (v: OperatorValue) =>
      p.onChange({...p.rule, parts: {...p.rule.parts, age: v}});

   const options = [
      {key: 0, value: 'Y', text: 'Currently alive'},
      {key: 1, value: 'N', text: 'Dead, or more than 110 year old'},
   ];

   return (
      <>
         <FieldChoice
            label="Alive ?"
            choices={options}
            defaultValue={p.rule.parts.alive}
            onChange={onAliveChange}
         />
         <FieldOperatorValue
            label="age"
            title="Comparing current age of the person"
            ops={p.ops}
            defaultValue={p.rule.parts.age}
            onChange={onAgeChange}
         />
      </>
   );
};

/**
 * RuleWithRef
 */

const RuleWithRef = (p: RuleProps, label: string) => {
   const onRefChange = (v: OperatorValue) =>
      p.onChange({...p.rule, parts: {...p.rule.parts, ref: v}});

   return (
      <FieldPerson
         label={label}
         defaultValue={p.rule.parts.ref}
         onChange={onRefChange}
      />
   );
};

const RuleAncestor = (p: RuleProps) => RuleWithRef(p, 'Ancestor of');
const RuleDescendant = (p: RuleProps) => RuleWithRef(p, 'Descendant of');

/**
 * RuleWithSubs
 */

const RuleWithSubs = (p: RuleProps, label: string) => {
   const onChange = (children: ThemeRule[]) =>
      p.onChange({...p.rule, children});

   if (p.rule.children.length == 0) {
      p.onChange({...p.rule, children: [NEW_RULE]});
      return null;
   }

   return (
      <div>
         <span className="name top">{label}</span>
         <span className="value">
            <RuleListEditor
               ops={p.ops}
               rules={p.rule.children}
               withStyle={false}
               onChange={onChange}
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
   const onChange = (v: OperatorValue) =>
      p.onChange({...p.rule, parts: {...p.rule.parts, known: v}});
   const options = [
      {key: 0, value: "true", text: `${label} is known`},
      {key: 1, value: "false", text: `${label} is unknown`},
   ];
   return (
      <FieldChoice
         label="Known ?"
         defaultValue={p.rule.parts.known}
         choices={options}
         onChange={onChange}
      />
   );
};

const RuleKnownFather = (p: RuleProps) => RuleKnown(p, 'Father');
const RuleKnownMother = (p: RuleProps) => RuleKnown(p, 'Mother');

/**
 * RuleImplex
 */

const RuleImplex = (p: RuleProps) => {
   const onRefChange = (v: OperatorValue) =>
      p.onChange({...p.rule, parts: {...p.rule.parts, ref: v}});
   const onCountChange = (v: OperatorValue) =>
      p.onChange({...p.rule, parts: {...p.rule.parts, count: v}});
   return (
      <>
         <FieldPerson
            label="In tree of"
            defaultValue={p.rule.parts.ref}
            onChange={onRefChange}
         />
         <FieldOperatorValue
            label="count"
            title="How many times the person appears in the tree"
            ops={p.ops}
            defaultValue={p.rule.parts.count}
            onChange={onCountChange}
         />
      </>
   );
};

/**
 * RuleCharacteristic
 */

const RuleCharacteristic = (p: RuleProps) => {
   const onTypeChange = (v: OperatorValue) =>
      p.onChange({...p.rule, parts: {...p.rule.parts, type: v}});
   const onValueChange = (v: OperatorValue) =>
      p.onChange({...p.rule, parts: {...p.rule.parts, value: v}});
   return (
      <>
         <FieldOperatorValue
            label="characteristic"
            title="Which characteristic to test"
            ops={p.ops}
            defaultValue={p.rule.parts.type}
            onChange={onTypeChange}
         />
         <FieldOperatorValue
            label="value"
            title="What value the characteristic should have"
            ops={p.ops}
            defaultValue={p.rule.parts.value}
            onChange={onValueChange}
         />
      </>
   );
};

const NEW_THEME: ColorScheme = {name: 'New Theme', id: -1};
const NEW_RULE: ThemeRule = {
   name: '',
   type: 'alive',
   fill: 'none',
   color: 'none',
   stroke: 'none',
   fontWeight: 'normal',
   parts: {},
   children: [],
};

interface RuleTypeDescr {
   name: string;
   descr: string;
   component: React.ComponentType<RuleProps>;
}

// `id` must match the name of rules defined in python and the database
const RULE_TYPES: {[id: string]: RuleTypeDescr}  = {
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
   'characteristic': {name: 'Characteristic',
                      descr: 'At least one characteristic matches',
                      component: RuleCharacteristic},
   'event': {name: 'Event', descr: 'At least one event matches',
       component: RuleAlive},
//    fields: {'count': {type: 'number', descr: 'number of times this rule matches'},
//             'role': {type: 'string', descr: 'role the person plays in the event'},
//             'date': {type: 'date', descr: 'when the event took place'},
//             'place_name': {type: 'string', descr: 'where the event took place'},
//             'age': {type: 'number', descr: 'age of the person at that time'}}},
};

const RULE_TYPE_OPTIONS = Object.entries(RULE_TYPES).map(([id, r]) =>
   ({
      key: id,
      value: id,
      text: r.name,
      content: <Header content={r.name} subheader={r.descr} />
    }));

/**
 * Rule Editor
 * Editing a rule (and possibly its style and name).
 * This edits the index-th rule in the `rules` array.
 */

const FONT_WEIGHT_OPTIONS = [
    {key: 0, value: 'normal', text: 'normal'},
    {key: 1, value: 'bold', text: 'bold'},
];

interface RuleEditorProps {
   index: number;
   rules: ThemeRule[];
   ops: DropdownItemProps[];
   onChange: (rules: ThemeRule[]) => void;
   withStyle?: boolean;
}
const RuleEditor = (p: RuleEditorProps) => {
   const rule = p.rules[p.index];

   // Apply partial changes to current rule, and send full list of rules
   const ruleChange = (diff: Partial<ThemeRule>) => {
        const tmp = [...p.rules];
        tmp[p.index] = {...rule, ...diff};
        p.onChange(tmp);
   };

   const onNameChange = (e: any, d: InputProps) => ruleChange({name: d.value});
   const onTypeChange = (e: any, d: DropdownProps) =>
      ruleChange({type: d.value as string, parts: {}, children: []});
   const onFillChange = (e: any, d: InputProps) => ruleChange({fill: d.value});
   const onStrokeChange =
      (e: any, d: InputProps) => ruleChange({stroke: d.value});
   const onColorChange =
      (e: any, d: InputProps) => ruleChange({color: d.value});
   const onFWChange =
      (e: any, d: DropdownProps) =>
         ruleChange({fontWeight: d.value as FontWeight});
   const onPartsChange = (r: ThemeRule) => ruleChange(r);

   const comp = RULE_TYPES[rule.type];

   return (
      <div className="rule">
         {p.withStyle &&
          <div>
             <span className="name">Description</span>
             <span className="value">
                <Input
                   placeholder="rule description"
                   fluid={true}
                   defaultValue={rule.name}
                   onChange={onNameChange}
                />
             </span>
          </div>
         }
         {p.withStyle &&
          <div>
             <span className="name">Style</span>
             <span className="value">
                <Input
                   type="color"
                   defaultValue={rule.color}
                   onChange={onColorChange}
                   label="Color"
                   title="Color for text" />
                <Input
                   type="color"
                   defaultValue={rule.stroke}
                   onChange={onStrokeChange}
                   label="Stroke"
                   title="Color for lines" />
                <Input
                   type="color"
                   defaultValue={rule.fill}
                   onChange={onFillChange}
                   label="Fill"
                   title="fill color for shapes" />
                <Dropdown
                   defaultValue={rule.fontWeight}
                   selection={true}
                   options={FONT_WEIGHT_OPTIONS}
                   onChange={onFWChange}
                />
             </span>
          </div>
         }
         <div>
            <span className="name">Type</span>
            <span className="value">
               <Dropdown
                  defaultValue={rule.type}
                  selection={true}
                  fluid={true}
                  options={RULE_TYPE_OPTIONS}
                  placeholder="Choose rule type"
                  onChange={onTypeChange}
               />
            </span>
         </div>
         <comp.component
            rule={rule}
            ops={p.ops}
            onChange={onPartsChange}
         />
      </div>
   );
};

/**
 * Editing a list of rules.
 * Possibility to add new rules, remove some, reorder them,...
 */

interface RuleListEditorProps {
   rules: ThemeRule[];
   ops: DropdownItemProps[];
   onChange: (rules: ThemeRule[]) => void;
   withStyle: boolean;
}

const RuleListEditor = (p: RuleListEditorProps) => {
   const addRule = () => p.onChange([...p.rules, NEW_RULE]);
   return (
      <div>
         {p.rules.map((r, idx) =>
            <RuleEditor
               key={idx}
               index={idx}
               rules={p.rules}
               ops={p.ops}
               onChange={p.onChange}
               withStyle={p.withStyle}
            />)
         }
         <Button icon="add" onClick={addRule}/>
      </div>
   );
};

/**
 * Theme Editor
 * Editing a whole theme, its name and list of rules.
 * This lets you chose which theme to edit.
 */

interface ThemeEditorProps {
   dispatch: GPDispatch;
}

const ThemeEditorConnected = (p: ThemeEditorProps) => {
   const [themeList, setThemeList] = React.useState<ColorScheme[]>([]);
   const [selected, setSelected] = React.useState<number>(-1);
   const [rules, setRules] = React.useState<ThemeRule[]>([]);
   const [ops, setOps] = React.useState<OperatorList>([]);

   window.console.log('MANU ', rules);

   React.useEffect(() => {
      fetchThemeListFromServer().then(
         d => setThemeList([NEW_THEME].concat(d))
      );
   }, []);

   React.useEffect(() => {
      fetchThemeRulesFromServer(selected).then((d: RuleList) => {
         setRules(d.rules);
         setOps(d.operators);
      })
   }, [selected]);

   const onChange = React.useCallback(
      (_: any, data: DropdownProps) => setSelected(data.data as number),
      [themeList]);

   const onRulesChange = (rules: ThemeRule[]) => setRules(rules);

   const opsOptions: DropdownItemProps[] = ops.map(s =>
      ({
         key: s.op,
         value: s.op,
         text: s.label,
         content: <Header content={s.label} subheader={s.doc} />
       }));

   const main = (
      <Form className="colortheme">
         <div>
            <h2>Color Theme</h2>
            <Select
               fluid={false}
               options={themeList.map(s => ({text: s.name, value: s.id}))}
               onChange={onChange}
               defaultValue={selected}
            />
         </div>
         <RuleListEditor
            rules={rules}
            ops={opsOptions}
            withStyle={true}
            onChange={onRulesChange}
         />
      </Form>
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
   (state: AppState) => ({}),
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(ThemeEditorConnected);

export default ThemeEditor;

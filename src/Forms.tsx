import * as React from 'react';
import { Checkbox, CheckboxProps, DropdownProps,
         Form, Select } from 'semantic-ui-react';

interface SelectProps<T extends number> {
   defaultValue: T;
   label: string;
   fieldName: string;
   names: {[id: number]: string};
   onChange: (diff: Partial<{[name: string]: T}>) => void;
}
export class SelectField<T extends number> extends React.PureComponent<SelectProps<T>> {
   change = (e: Event|React.SyntheticEvent, data: DropdownProps) => {
      this.props.onChange({[this.props.fieldName]: data.value as T});
   }

   render() {
      const colors = Object.keys(this.props.names)
         .map(p => Number(p))
         .map(p => ({text: this.props.names[p], value: p}));
      return (
         <Form.Field>
            <label>{this.props.label}</label>
            <Select
               fluid={true}
               options={colors}
               onChange={this.change}
               defaultValue={this.props.defaultValue}
            />
         </Form.Field>
      );
   }
}

interface SliderProps {
   defaultValue: number;
   label: string;
   fieldName: string;
   min: number;
   max: number;
   onChange: (diff: Partial<{[name: string]: number}>) => void;
   doc?: string;
}
export class SliderField extends React.PureComponent<SliderProps> {
   change = (data: {target: {value: string}}) => {
      this.props.onChange({[this.props.fieldName]: Number(data.target.value)});
   }

   render() {
      return (
         <Form.Field>
            <label>
               {this.props.label}&nbsp;({this.props.defaultValue})
            </label>
            <input
               style={({width: '100%'})}
               type="range"
               min={this.props.min.toString()}
               max={this.props.max.toString()}
               defaultValue={this.props.defaultValue.toString()}
               onChange={this.change}
               title={this.props.doc}
            />
         </Form.Field>
      );
   }
}

interface CheckboxFieldProps {
   defaultChecked: boolean;
   label: string;
   fieldName: string;
   onChange: (diff: Partial<{[name: string]: boolean}>) => void;
}
export class CheckboxField extends React.PureComponent<CheckboxFieldProps> {
   change = (e: Event|React.SyntheticEvent, data: CheckboxProps) => {
      this.props.onChange({[this.props.fieldName]: data.checked});
   }

   render() {
      return (
         <Form.Field>
            <Checkbox
               label={this.props.label}
               defaultChecked={this.props.defaultChecked}
               onChange={this.change}
            />
         </Form.Field>
      );
   }
}

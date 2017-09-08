import * as React from 'react';
import { Checkbox, Form, Select } from 'semantic-ui-react';

interface SelectProps<T extends number> {
   defaultValue: T;
   label: string;
   fieldName: string;
   names: {[id: number]: string};
   onChange: (diff: Partial<{[name: string]: T}>) => void;
}
export class SelectField<T extends number> extends React.PureComponent<SelectProps<T>> {
   change = (e: React.FormEvent<HTMLElement>, data: {value: T}) => {
      this.props.onChange({[this.props.fieldName]: data.value});
   }

   render() {
      const colors = Object.keys(this.props.names)
         .map(p => ({text: this.props.names[p], value: Number(p)}));
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
            />
         </Form.Field>
      );
   }
}

interface CheckboxProps {
   defaultChecked: boolean;
   label: string;
   fieldName: string;
   onChange: (diff: Partial<{[name: string]: boolean}>) => void;
}
export class CheckboxField extends React.PureComponent<CheckboxProps> {
   change = (e: React.FormEvent<HTMLElement>, data: {checked: boolean}) => {
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

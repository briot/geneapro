import * as React from "react";
import {
   Checkbox,
   CheckboxProps,
   DropdownProps,
   Form,
   Select
} from "semantic-ui-react";
import { useDebounce } from './Hooks';

/**
 * SelectField
 */

export const SelectField = React.memo(
   <T extends number>(p: {
      defaultValue: T;
      label: string;
      fieldName: string;
      names: { [id: number]: string };
      onChange: (diff: Partial<{ [name: string]: T }>) => void;
   }) => {
      const onChange = React.useCallback(
         (e: Event | React.SyntheticEvent, data: DropdownProps) =>
            p.onChange({ [p.fieldName]: data.value as T }),
         [p.onChange, p.fieldName]
      );
      const colors = Object.keys(p.names)
         .map(d => Number(d))
         .map(d => ({ text: p.names[d], value: d }));
      return (
         <Form.Field>
            <label>{p.label}</label>
            <Select
               fluid={true}
               options={colors}
               onChange={onChange}
               defaultValue={p.defaultValue}
            />
         </Form.Field>
      );
   }
);

/**
 * SliderField
 */

export const SliderField = React.memo(
   (p: {
      defaultValue: number;
      label: string;
      fieldName: string;
      min: number;
      max: number;
      onChange: (diff: Partial<{ [name: string]: number }>) => void;
      doc?: string;

      debounce?: number;
      // How long to wait before executing onChange. This should be around
      // 250ms if the result of the change is going to be a slow operation

   }) => {
      const reportChange = React.useCallback(
         useDebounce(
            (val: number) => p.onChange({ [p.fieldName]: val}),
            p.debounce || 0),
         [p.onChange, p.fieldName, p.debounce]);

      const onChange = (data: { target: { value: string } }) =>
         reportChange(Number(data.target.value));

      return (
         <Form.Field>
            <label>
               {p.label}&nbsp;({p.defaultValue})
            </label>
            <input
               style={{ width: "100%" }}
               type="range"
               min={p.min.toString()}
               max={p.max.toString()}
               defaultValue={p.defaultValue.toString()}
               onChange={onChange}
               title={p.doc}
            />
         </Form.Field>
      );
   }
);

/**
 * CheckboxField
 */

export const CheckboxField = React.memo(
   (p: {
      defaultChecked: boolean;
      label: string;
      fieldName: string;
      onChange: (diff: Partial<{ [name: string]: boolean }>) => void;
   }) => {
      const onChange = React.useCallback(
         (e: Event | React.SyntheticEvent, data: CheckboxProps) =>
            p.onChange({ [p.fieldName]: data.checked }),
         [p.onChange, p.fieldName]
      );
      return (
         <Form.Field>
            <Checkbox
               label={p.label}
               defaultChecked={p.defaultChecked}
               onChange={onChange}
            />
         </Form.Field>
      );
   }
);

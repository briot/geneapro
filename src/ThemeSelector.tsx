import * as React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button, DropdownProps, Form, Select } from 'semantic-ui-react';
import { SelectField } from './Forms';
import { predefinedThemes } from './Store/ColorTheme';
import { fetchMetadata } from './Store/Sagas';
import { AppState, GPDispatch } from './Store/State';
import * as GP_JSON from './Server/JSON';

interface ThemeSelectorProps {
   dispatch: GPDispatch;
   defaultValue: GP_JSON.ColorSchemeId;
   metadata: GP_JSON.Metadata;

   label?: string;

   fieldName: string;
   onChange: (diff: Partial<{[name: string]: GP_JSON.ColorSchemeId}>) => void;
   // on change, a diff with a single field fieldName will be sent
}

function ThemeSelectorConnected(p: ThemeSelectorProps) {
   const vals = predefinedThemes.concat(p.metadata.themes)
      .map(s => ({text: s.name, value: s.id}));
   const onChange = React.useCallback(
      (_: any, data: DropdownProps) =>
         p.onChange({[p.fieldName]: data.value as number}),
      [p.onChange, p.fieldName, p.metadata.themes]);

   React.useEffect(
      () => fetchMetadata.execute(p.dispatch, {}),
      []);

   return (
      <Form.Field>
         <label>{p.label || 'Colors'}</label>
         <span>
            <Select
               fluid={false}
               options={vals}
               onChange={onChange}
               defaultValue={p.defaultValue}
            />
            <Link to="/themeeditor">
               <Button
                  basic={true}
                  compact={true}
                  size="mini"
                  icon="ellipsis horizontal"
               />
            </Link>
         </span>
      </Form.Field>
   );
}

const ThemeSelector = connect(
   (state: AppState) => ({
      metadata: state.metadata,
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(ThemeSelectorConnected);
export default ThemeSelector;


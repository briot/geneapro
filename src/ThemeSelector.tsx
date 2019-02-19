import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button, DropdownProps, Form, Select } from 'semantic-ui-react';
import { SelectField } from './Forms';
import { ColorScheme, predefinedThemes } from './Store/ColorTheme';
import { fetchThemeListFromServer } from './Server/Themes';

interface ThemeSelectorProps {
   defaultValue: ColorScheme;

   label?: string;

   fieldName: string;
   onChange: (diff: Partial<{[name: string]: ColorScheme}>) => void;
   // on change, a diff with a single field fieldName will be sent
}

interface JSONThemeList {
   themes: {[id: number]: string},
}

export default function ThemeSelector(p: ThemeSelectorProps) {
   const [themeList, setThemeList] = React.useState<ColorScheme[]>([]);

   // Fetch the list of custom themes on mount
   React.useEffect(() => {
      fetchThemeListFromServer().then(
         d => setThemeList(predefinedThemes.concat(d))
      );
   }, []);

   const vals = themeList.map(s => ({text: s.name, value: s.id}));

   const onChange = React.useCallback(
      (_: any, data: DropdownProps) =>
        p.onChange({[p.fieldName]: themeList.find((e) => e.id == data.value)}),
      [p.onChange, p.fieldName, themeList]);

   return (
      <Form.Field>
         <label>{p.label || 'Colors'}</label>
         <span>
            <Select
               fluid={false}
               options={vals}
               onChange={onChange}
               defaultValue={p.defaultValue.id}
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


import * as React from 'react';
import { SelectField } from './Forms';
import { ColorScheme, predefinedThemes } from './Store/ColorTheme';
import { DropdownProps, Form, Select } from 'semantic-ui-react';

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
      window.fetch('/data/themelist')
         .then((r: Response) => r.json())
         .then((d: JSONThemeList) =>
            setThemeList(predefinedThemes.concat(
               Object.entries(d.themes).map(
                  ([id, name]) => ({id: Number(id), name}))))
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
         <Select
            fluid={true}
            options={vals}
            onChange={onChange}
            defaultValue={p.defaultValue.id}
         />
      </Form.Field>
   );
}


import { actionCreator } from '../Store/Actions';
import { ColorScheme, WHITE } from '../Store/ColorTheme';

export interface PersonaListSettings {
   colors: ColorScheme;
}

export const defaultPersonaList: PersonaListSettings = {
   colors: WHITE,
};

/**
 * Action: change one or more settings
 */
export const changePersonaListSettings = actionCreator<
   {diff: Partial<PersonaListSettings>}>('PERSONALIST/SETTINGS');

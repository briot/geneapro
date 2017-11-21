import { actionCreator } from '../Store/Actions';

export interface QuiltsSettings {
   ancestors: number;
   loading: boolean;
}

/**
 * Action: change one or more pedigree settings
 */
export const changeQuiltsSettings = actionCreator<
   {diff: Partial<QuiltsSettings>}>('QUILTS/SETTINGS');

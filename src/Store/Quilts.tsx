import { actionCreator } from '../Store/Actions';

export interface QuiltsSettings {
   ancestors: number;
   loading: boolean;

   decujusTreeOnly: boolean;
   // Whether to only display persons in the decuju's tree
}

/**
 * Action: change one or more pedigree settings
 */
export const changeQuiltsSettings = actionCreator<
   {diff: Partial<QuiltsSettings>}>('QUILTS/SETTINGS');

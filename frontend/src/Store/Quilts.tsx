import { actionCreator } from "../Store/Actions";

export interface QuiltsSettings {
   ancestors: number;
}

export const defaultQuilts: QuiltsSettings = {
   ancestors: 60,
};

/**
 * Action: change one or more pedigree settings
 */
export const changeQuiltsSettings = actionCreator<{
   diff: Partial<QuiltsSettings>;
}>("QUILTS/SETTINGS");

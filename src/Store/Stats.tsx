import { actionCreator } from '../Store/Actions';

export interface StatsSettings {
   max_age: number;
   // Guess death date for people who do not have an explicit death event.
   // They are assumed to be dead `max_age` years after their birth, or ignored
   // if max_age is 0.
}

export const defaultStats: StatsSettings = {
   max_age: 0,
};

/**
 * Action: change one or more stats settings
 */
export const changeStatsSettings = actionCreator<
   {diff: Partial<StatsSettings>}>('STATS/SETTINGS');

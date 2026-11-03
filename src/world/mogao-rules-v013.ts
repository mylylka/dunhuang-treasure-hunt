import { MOGAO_SESSION_OPTIONS as previousOptions } from './mogao-rules-v012';
export * from './mogao-rules-v012';
export const MOGAO_SESSION_KEY='dunhuang:mogao-preview:v13';
export const MOGAO_SESSION_OPTIONS={...previousOptions,key:MOGAO_SESSION_KEY};

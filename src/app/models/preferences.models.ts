export interface Preferences {
  theme: string;
  showTips: boolean;
  compact: boolean;
}

export const DEFAULT_PREFERENCES: Readonly<Preferences> = {
  theme: 'light',
  showTips: true,
  compact: false
};

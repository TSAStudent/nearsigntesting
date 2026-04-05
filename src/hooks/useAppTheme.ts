'use client';

import useStore from '@/store/useStore';

/**
 * Default (white) theme + not high-contrast: light blue brand chrome (gradient shell).
 * Grey/black theme or high-contrast: solid backgrounds from CSS vars.
 */
export function useAppTheme() {
  const highContrastMode = useStore((s) => s.highContrastMode);
  const themePreference = useStore((s) => s.currentUser?.themePreference ?? 'white');
  const isWarmGradient = !highContrastMode && themePreference === 'white';

  return {
    highContrastMode,
    themePreference,
    /** True when using default light brand chrome (light blue gradient shell) */
    isWarmGradient,
  };
}

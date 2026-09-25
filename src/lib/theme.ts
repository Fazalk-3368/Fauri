/**
 * Next's viewport metadata is plain sRGB and cannot read a CSS custom property,
 * so the browser chrome colour has to be transcribed from `--bg` by hand. These
 * two constants are the acknowledged duplication; keep them in step with the
 * `--bg` declaration in globals.css.
 */
export const THEME_COLOR_LIGHT = '#fcfbf7';
export const THEME_COLOR_DARK = '#1c1a17';

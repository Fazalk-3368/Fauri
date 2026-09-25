/**
 * Next's viewport metadata is plain sRGB and cannot read a CSS custom property,
 * so the browser chrome colour has to be transcribed from `--bg` by hand. This
 * is the acknowledged duplication; keep it in step with globals.css.
 *
 * One value, because the app is light only.
 */
export const THEME_COLOR = '#f5f6f8';

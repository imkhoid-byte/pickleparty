// The design system: "neon court at night". One deep background, raised surfaces with
// hairline edges, and neon accents that glow. Screens build on these, not on raw values.

export const colors = {
  /** The page, and the darkest tone. */
  bg: '#12081F',
  /** Cards and inputs. */
  surface: '#1F1136',
  /** Raised or pressed things on a surface: secondary buttons, chips. */
  surfaceHi: '#2D1A4F',
  /** The hairline around surfaces. */
  line: 'rgba(255,255,255,0.09)',
  lineStrong: 'rgba(255,255,255,0.18)',
  pickle: '#B6F23A',
  pickleDark: '#6E9F12',
  pink: '#FF3D8B',
  orange: '#FF9F1C',
  sky: '#3DD6FF',
  text: '#FFFFFF',
  muted: '#B9A8D9',
  /** Captions and section labels. */
  faint: '#8D7BB5',
  danger: '#FF5A5A',
  /** Text on a pickle-green fill. */
  onPickle: '#14220A',
};

export const teamColors = [colors.pickle, colors.pink] as const;

export const radius = { sm: 12, md: 18, lg: 26, pill: 999 };

/** Gradients, top to bottom unless a component says otherwise. */
export const gradients = {
  /** The page: a little light at the top, like a court under floodlights. */
  page: ['#22103F', '#160A2B', '#12081F'],
  pickle: ['#D4FF5C', '#A4E81F'],
  pink: ['#FF66A8', '#F2287A'],
  orange: ['#FFB84D', '#FF8A0F'],
  danger: ['#FF7A7A', '#F04444'],
  surface: ['#2A1748', '#1F1136'],
} as const satisfies Record<string, readonly [string, string, ...string[]]>;

/**
 * The display face (Fredoka, loaded in app/_layout): rounded like the logo. Headings,
 * buttons, labels and numbers use it; long text stays in the system font, which reads
 * better small. A custom face carries its own weight, so these replace `fontWeight`.
 */
export const font = {
  bold: 'Fredoka_700Bold',
  semi: 'Fredoka_600SemiBold',
  medium: 'Fredoka_500Medium',
} as const;

/** A soft colored glow under a filled control (buttons, selected chips). */
export const glow = (color: string, strength: 'soft' | 'strong' = 'soft') => ({
  boxShadow: strength === 'strong' ? `0px 8px 28px ${alpha(color, 0.45)}` : `0px 6px 18px ${alpha(color, 0.28)}`,
});

/** The lift under cards and pop-ups. */
export const lift = { boxShadow: '0px 10px 30px rgba(6,2,14,0.45)' };

/** "#RRGGBB" at an opacity, as rgba(). */
export function alpha(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity})`;
}

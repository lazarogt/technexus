export const colorTokens = {
  brand: {
    ink: "#101828",
    pine: "#24433d",
    ember: "#c7652d",
    shell: "#fefcf8",
    mist: "#f7f4ee",
    slate: "#5f6c6a",
    line: "rgba(16, 24, 40, 0.08)"
  },
  status: {
    success: "#1f7a4c",
    successSoft: "#eaf7ee",
    warning: "#a4641a",
    warningSoft: "#fff3df",
    error: "#b42318",
    errorSoft: "#feeceb",
    info: "#175cd3",
    infoSoft: "#e8f1ff"
  }
} as const;

export const typographyTokens = {
  fontFamily: {
    display: ['"Space Grotesk"', "ui-sans-serif", "system-ui"],
    body: ['"Manrope"', "ui-sans-serif", "system-ui"]
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem"
  }
} as const;

export const spacingTokens = {
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem"
} as const;

export const radiiTokens = {
  sm: "0.75rem",
  md: "1rem",
  lg: "1.25rem",
  xl: "1.5rem",
  panel: "1.75rem",
  pill: "999px"
} as const;

export const shadowTokens = {
  panel: "0 18px 45px rgba(16, 24, 40, 0.08)",
  overlay: "0 30px 80px rgba(16, 24, 40, 0.16)",
  hover: "0 22px 50px rgba(16, 24, 40, 0.14)"
} as const;

export const zIndexTokens = {
  base: "1",
  sticky: "20",
  sidebar: "30",
  modal: "50",
  toast: "60"
} as const;

export const breakpointTokens = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px"
} as const;

export const designTokens = {
  colors: colorTokens,
  typography: typographyTokens,
  spacing: spacingTokens,
  radii: radiiTokens,
  shadows: shadowTokens,
  zIndex: zIndexTokens,
  breakpoints: breakpointTokens
} as const;

export type TechNexusDesignTokens = typeof designTokens;

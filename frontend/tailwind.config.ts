import type { Config } from "tailwindcss";
import {
  breakpointTokens,
  colorTokens,
  radiiTokens,
  shadowTokens,
  spacingTokens,
  typographyTokens,
  zIndexTokens
} from "./src/styles/tokens";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    screens: breakpointTokens,
    extend: {
      colors: {
        ink: colorTokens.brand.ink,
        mist: colorTokens.brand.mist,
        shell: colorTokens.brand.shell,
        ember: colorTokens.brand.ember,
        pine: colorTokens.brand.pine,
        slate: colorTokens.brand.slate,
        line: colorTokens.brand.line,
        success: colorTokens.status.success,
        "success-soft": colorTokens.status.successSoft,
        warning: colorTokens.status.warning,
        "warning-soft": colorTokens.status.warningSoft,
        error: colorTokens.status.error,
        "error-soft": colorTokens.status.errorSoft,
        info: colorTokens.status.info,
        "info-soft": colorTokens.status.infoSoft
      },
      fontFamily: {
        display: typographyTokens.fontFamily.display,
        body: typographyTokens.fontFamily.body
      },
      spacing: spacingTokens,
      borderRadius: {
        sm: radiiTokens.sm,
        md: radiiTokens.md,
        lg: radiiTokens.lg,
        xl: radiiTokens.xl,
        panel: radiiTokens.panel,
        pill: radiiTokens.pill
      },
      boxShadow: {
        panel: shadowTokens.panel,
        overlay: shadowTokens.overlay,
        hover: shadowTokens.hover
      },
      zIndex: {
        base: zIndexTokens.base,
        sticky: zIndexTokens.sticky,
        sidebar: zIndexTokens.sidebar,
        modal: zIndexTokens.modal,
        toast: zIndexTokens.toast
      }
    }
  },
  plugins: []
} satisfies Config;

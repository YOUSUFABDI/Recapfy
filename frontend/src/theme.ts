import { createTheme, type PaletteMode } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    brand?: { main: string; contrastText: string };
  }
  interface PaletteOptions {
    brand?: { main: string; contrastText: string };
  }
}

export const BRAND = {
  primary: "#7C87FF",
  white: "#FFFFFF",
} as const;

export function getTheme(mode: PaletteMode) {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: { main: BRAND.primary, contrastText: BRAND.white },
      background: {
        default: isDark ? "#0B0B12" : "#F8F9FF",
        paper: isDark ? "#11121A" : "#FFFFFF",
      },
      text: {
        primary: isDark ? "#EDEDF7" : "#0F1020",
        secondary: isDark ? "#B9BBD2" : "#4A4D73",
      },
      brand: { main: BRAND.primary, contrastText: BRAND.white },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily:
        'var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      h1: { fontWeight: 700, letterSpacing: -0.5 },
      h2: { fontWeight: 700, letterSpacing: -0.3 },
      h3: { fontWeight: 700, letterSpacing: -0.2 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      // ✅ Make useMediaQuery SSR-safe to reduce hydration diffs
      MuiUseMediaQuery: { defaultProps: { noSsr: true } },

      MuiButton: {
        styleOverrides: { root: { borderRadius: 12, paddingInline: 16 } },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow:
              "0 10px 25px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.02)",
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isDark
              ? "radial-gradient(40rem 20rem at 10% -10%, rgba(124,135,255,0.15), transparent), radial-gradient(30rem 18rem at 120% 10%, rgba(124,135,255,0.10), transparent)"
              : "radial-gradient(40rem 20rem at 10% -10%, rgba(124,135,255,0.12), transparent), radial-gradient(30rem 18rem at 120% 10%, rgba(124,135,255,0.10), transparent)",
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            borderRadius: 9999,
            padding: 4,
            background:
              "linear-gradient(180deg, rgba(124,135,255,0.18), rgba(124,135,255,0.06))",
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: { border: "none", borderRadius: 9999, paddingInline: 12 },
        },
      },
    },
  });
}

export const theme = getTheme("light");

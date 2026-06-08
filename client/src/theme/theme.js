import { createTheme } from "@mui/material/styles";

const sansStack = "Manrope, Inter, Roboto, Arial, sans-serif";

export const createAppTheme = (mode) => {
  const isDark = mode === "dark";
  const charcoal = "#262424";
  const charcoalSoft = "#312f2f";
  const porcelain = "#e7e7e1";
  const ivory = "#f7f6f1";
  const ink = "#11100f";
  const taupe = "#9f9586";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? ivory : charcoal,
        contrastText: isDark ? charcoal : ivory
      },
      secondary: {
        main: taupe,
        contrastText: ink
      },
      info: {
        main: "#8f806a",
        contrastText: ivory
      },
      success: {
        main: "#6f8b5f"
      },
      warning: {
        main: "#b8955f"
      },
      error: {
        main: "#b75f5a"
      },
      background: {
        default: isDark ? charcoal : porcelain,
        paper: isDark ? charcoalSoft : ivory
      },
      text: {
        primary: isDark ? "#f4f1eb" : ink,
        secondary: isDark ? "#c9c5bd" : "#55514b"
      },
      divider: isDark ? "rgba(247, 246, 241, 0.18)" : "rgba(38, 36, 36, 0.18)",
      action: {
        hover: isDark ? "rgba(247, 246, 241, 0.08)" : "rgba(38, 36, 36, 0.06)",
        selected: isDark ? "rgba(247, 246, 241, 0.14)" : "rgba(38, 36, 36, 0.1)"
      }
    },
    shape: {
      borderRadius: 22
    },
    typography: {
      fontFamily: sansStack,
      h1: { fontFamily: sansStack, fontWeight: 800, letterSpacing: 0 },
      h2: { fontFamily: sansStack, fontWeight: 800, letterSpacing: 0 },
      h3: { fontFamily: sansStack, fontWeight: 800, letterSpacing: 0 },
      h4: { fontFamily: sansStack, fontWeight: 800, letterSpacing: 0, fontSize: "2rem" },
      h5: { fontFamily: sansStack, fontWeight: 800, letterSpacing: 0 },
      h6: { fontFamily: sansStack, fontWeight: 800, letterSpacing: 0 },
      allVariants: {
        fontVariantNumeric: "tabular-nums"
      },
      button: {
        textTransform: "none",
        fontWeight: 700,
        letterSpacing: 0
      }
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            borderRadius: 24
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 24
          }
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true
        },
        styleOverrides: {
          root: {
            minHeight: 44,
            borderRadius: 999,
            paddingInline: 22
          },
          outlined: {
            borderColor: isDark ? "rgba(247, 246, 241, 0.42)" : "rgba(38, 36, 36, 0.42)"
          }
        }
      },
      MuiTextField: {
        defaultProps: {
          size: "small"
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 18
          }
        }
      },
      MuiSelect: {
        defaultProps: {
          size: "small"
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 700
          }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 999
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 800
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: charcoal,
            color: ivory,
            borderRadius: 0
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? charcoal : ivory,
            borderRadius: 0
          }
        }
      }
    }
  });
};

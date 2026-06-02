import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        bone: {
          DEFAULT: "hsl(var(--bone))",
          muted: "hsl(var(--bone-muted))",
        },
        stone: {
          950: "hsl(var(--stone-950))",
          900: "hsl(var(--stone-900))",
          850: "hsl(var(--stone-850))",
          800: "hsl(var(--stone-800))",
          700: "hsl(var(--stone-700))",
        },
        leather: {
          500: "hsl(var(--leather-500))",
          400: "hsl(var(--leather-400))",
          300: "hsl(var(--leather-300))",
          200: "hsl(var(--leather-200))",
        },
        moss: {
          500: "hsl(var(--moss-500))",
          400: "hsl(var(--moss-400))",
          300: "hsl(var(--moss-300))",
          200: "hsl(var(--moss-200))",
        },
        ember: {
          400: "hsl(var(--ember-400))",
          300: "hsl(var(--ember-300))",
        },
        plum: {
          400: "hsl(var(--plum-400))",
          300: "hsl(var(--plum-300))",
        },
        // Warm Almanac (Kairos redesign) — parallel namespace.
        // Hex tokens, not HSL. See globals.css :root for the source.
        almanac: {
          bg: "var(--almanac-bg)",
          bg2: "var(--almanac-bg2)",
          bg3: "var(--almanac-bg3)",
          bg4: "var(--almanac-bg4)",
          line: "var(--almanac-line)",
          "line-hi": "var(--almanac-line-hi)",
          ink: "var(--almanac-ink)",
          "ink-dim": "var(--almanac-ink-dim)",
          "ink-soft": "var(--almanac-ink-soft)",
          "ink-faint": "var(--almanac-ink-faint)",
          brick: "var(--almanac-brick)",
          "brick-hi": "var(--almanac-brick-hi)",
          copper: "var(--almanac-copper)",
          "copper-hi": "var(--almanac-copper-hi)",
          ember: "var(--almanac-ember)",
          sage: "var(--almanac-sage)",
          plum: "var(--almanac-plum)",
          midnight: "var(--almanac-midnight)",
          starlight: "var(--almanac-starlight)",
          kairos: "var(--almanac-kairos)",
          "kairos-hi": "var(--almanac-kairos-hi)",
          "kairos-lo": "var(--almanac-kairos-lo)",
          prism: "var(--almanac-prism)",
          chronos: "var(--almanac-chronos)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-body)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          "var(--font-display)",
          "\"Iowan Old Style\"",
          "Georgia",
          "serif",
        ],
        display: [
          "var(--font-display)",
          "\"Iowan Old Style\"",
          "Georgia",
          "serif",
        ],
        // Warm Almanac type stack — Cormorant for editorial, DM Sans for body,
        // JetBrains Mono for almanac data, Cinzel reserved for STELLOQUY display.
        "almanac-serif": [
          "var(--font-almanac-serif)",
          "\"EB Garamond\"",
          "Georgia",
          "serif",
        ],
        "almanac-body": [
          "var(--font-almanac-body)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        "almanac-mono": [
          "var(--font-almanac-mono)",
          "\"IBM Plex Mono\"",
          "ui-monospace",
          "monospace",
        ],
        "almanac-display": [
          "var(--font-almanac-display)",
          "\"Trajan Pro\"",
          "serif",
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(189, 165, 136, 0.14), 0 18px 42px rgba(0, 0, 0, 0.28)",
        panel: "0 12px 28px rgba(0, 0, 0, 0.2)",
      },
      backgroundImage: {
        "shell-glow":
          "radial-gradient(circle at top, rgba(189,165,136,0.08), transparent 40%), radial-gradient(circle at 80% 20%, rgba(110,130,108,0.08), transparent 28%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;

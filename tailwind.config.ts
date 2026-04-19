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
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          "\"Iowan Old Style\"",
          "\"Palatino Linotype\"",
          "\"Book Antiqua\"",
          "Georgia",
          "serif",
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(189, 165, 136, 0.18), 0 24px 60px rgba(0, 0, 0, 0.38)",
        panel: "0 18px 40px rgba(0, 0, 0, 0.28)",
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

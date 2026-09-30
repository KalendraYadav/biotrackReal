/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        biotrace: {
          50: "#f5f9ff",
          100: "#e6f1fc",
          200: "#cce3f9",
          300: "#99c6f2",
          400: "#55a3e8",
          500: "#1185c6", // Secondary blue
          600: "#07559b", // Primary blue
          700: "#054179",
          800: "#043460",
          900: "#03275d", // Primary dark navy
          950: "#0b1f3a", // Dark navy text
        },
        biohazard: {
          50: "#fff1f0",
          100: "#ffe1df",
          200: "#ffc8c5",
          300: "#ffa19c",
          400: "#ff6961",
          500: "#f03e3e",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
        },
        hazmat: {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
          700: "#a16207",
          800: "#854d0e",
          900: "#713f12",
          950: "#422006",
        },
        forest: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14462a",
          950: "#0b2e1b",
        },
        steel: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#090d16",
        },
        cream: {
          50: "#fcfbf7",
          100: "#f7f5ed",
          200: "#eee9d8",
          300: "#e1d9be",
          400: "#cfc29c",
          500: "#bda97e",
          600: "#ab9166",
          700: "#8f7453",
          800: "#745e45",
          900: "#5f4d3a",
          950: "#34291e",
        },
        brand: {
          blue: "#07559b",
          blueHover: "#03275d",
          blueLight: "#f0f7ff",
          blueDark: "#043460",
          teal: "#00c49e",
          tealLight: "#e6fbf7",
          green: "#00ca92",
          greenHover: "#059669",
          greenLight: "#dcfce7",
          orange: "#ff881b",
          orangeHover: "#ea580c",
          orangeLight: "#fff7ed",
        }
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Public Sans', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['IBM Plex Serif', 'Roboto Slab', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        elevation: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.25)',
        nav: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)'
      }
    },
  },
  plugins: [],
}

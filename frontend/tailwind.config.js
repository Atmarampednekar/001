/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: {
          900: "#1A1A1A",
          800: "#222222",
          DEFAULT: "#2A2A2A", // page background
          700: "#333333", // card surface
          600: "#3D3D3D", // card hover / secondary border
        },
        silver: {
          light: "#E5E5E5",
          DEFAULT: "#C0C0C0", // text, icons, thin lines
          muted: "#9E9E9E",
          dim: "#6B6B6B",
        },
        signalRed: {
          DEFAULT: "#E10600", // single primary accent
          hover: "#C00500",
          dim: "rgba(225, 6, 0, 0.15)",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      maxWidth: {
        column: "720px",
      },
      borderWidth: {
        thin: "1px",
      },
    },
  },
  plugins: [],
}

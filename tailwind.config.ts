import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        moss: "#586d4d",
        coral: "#d76455",
        skyglass: "#d9eef2",
        paper: "#f8f5ef"
      },
      boxShadow: {
        line: "0 1px 0 rgba(23, 32, 27, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

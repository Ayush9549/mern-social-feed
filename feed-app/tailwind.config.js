module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: "#a18cd1",
          DEFAULT: "#6d5bba",
          dark: "#3a2d6a"
        },
        secondary: {
          light: "#fbc2eb",
          DEFAULT: "#eeaeca",
          dark: "#a770ef"
        },
        accent: {
          light: "#f8fafc",
          DEFAULT: "#e0e7ff",
          dark: "#6366f1"
        },
        background: {
          DEFAULT: "#f3f0f7"
        }
      }
    }
  },
  plugins: [],
};


/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    colors: {
      paper: '#F1F0EA',
      ink: '#1B2430',
      stamp: '#C23B2E',
      rule: '#8FA8C9',
      pass: '#3F7150',
      muted: '#6B6F76',
      transparent: 'transparent',
    },
    fontFamily: {
      headline: ['"Special Elite"', 'cursive'],
      body: ['"IBM Plex Sans"', 'sans-serif'],
      mono: ['"IBM Plex Mono"', 'monospace'],
    },
    extend: {},
  },
  plugins: [],
}

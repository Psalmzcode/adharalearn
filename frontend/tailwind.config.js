/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#060A12',
        bg2:      '#0B1118',
        surface:  '#0E1520',
        surface2: '#141F2E',
        surface3: '#1A2840',
        gold:     '#F0A500',
        gold2:    '#FFD166',
        teal:     '#00D4AA',
        teal2:    '#00F5C4',
        red:      '#FF4D4D',
        blue:     '#3B82F6',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '20px',
        xl: '28px',
      },
    },
  },
  plugins: [],
};

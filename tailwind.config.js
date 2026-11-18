export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: '#0B1220', deep: '#14213D', violet: { DEFAULT: '#7C5CFC', soft: 'var(--violet-soft)' }, electric: '#4F8CFF', fin: '#10B981', danger: '#EF4444', warn: '#F59E0B',
        surface: 'var(--surface)', card: 'var(--card)', ink: 'var(--ink)', muted: 'var(--muted)', line: 'var(--line)', sub: 'var(--sub)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(11,18,32,.04), 0 10px 28px -14px rgba(11,18,32,.18)' },
    },
  },
  plugins: [],
}

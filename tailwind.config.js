/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0a0908',
        surface: '#151310',
        surface2: '#1d1a16',
        panel: '#100f0d',
        line: '#332d24',
        line2: '#4a4032',
        ember: '#ff4310',
        ember2: '#ff8a3d',
        emberDeep: '#a8280a',
        acid: '#d7ff3f',
        acidDeep: '#8fae1a',
        signal: '#4fd6c4',
        signalDeep: '#1f7d70',
        paper: '#ede6d8',
      },
      fontFamily: {
        display: ['"Archivo Black"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 50px -12px rgba(255,67,16,0.5)',
        acid: '0 0 40px -10px rgba(215,255,63,0.45)',
        signal: '0 0 34px -8px rgba(79,214,196,0.45)',
        press: 'inset 0 2px 0 rgba(255,255,255,0.08), inset 0 -3px 6px rgba(0,0,0,0.5)',
        plate: '0 1px 0 rgba(255,255,255,0.06), 0 12px 30px -14px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        pulseSlow: {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '1' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
      },
      animation: {
        pulseSlow: 'pulseSlow 2.2s ease-in-out infinite',
        rise: 'rise 0.3s cubic-bezier(0.2,0.8,0.2,1) both',
        blink: 'blink 1.1s steps(2,jump-none) infinite',
      },
    },
  },
  plugins: [],
};

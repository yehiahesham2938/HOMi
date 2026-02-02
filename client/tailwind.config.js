/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // HOMI Light Blue Branding
                homi: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',  // Main HOMI blue
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                // Accent colors
                accent: {
                    light: '#67e8f9',
                    DEFAULT: '#06b6d4',
                    dark: '#0891b2',
                }
            },
            backgroundImage: {
                'gradient-homi': 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #7dd3fc 100%)',
                'gradient-homi-dark': 'linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0ea5e9 100%)',
            },
            animation: {
                'float': 'float 3s ease-in-out infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-up': 'slideUp 0.5s ease-out',
                'fade-in': 'fadeIn 0.6s ease-out',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
            boxShadow: {
                'homi': '0 20px 60px -15px rgba(14, 165, 233, 0.3)',
                'homi-lg': '0 25px 70px -20px rgba(14, 165, 233, 0.4)',
            },
        },
    },
    plugins: [],
}

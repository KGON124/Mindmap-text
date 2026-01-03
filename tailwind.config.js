/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#646cff',
                secondary: '#535bf2',
                surface: '#2b2b2b',
                'surface-hover': '#3a3a3a',
            },
        },
    },
    plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
    // Use class strategy so `.dark` and `.light` classes control Tailwind dark/light variants
    darkMode: 'class',
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {},
    },
    plugins: [],
};

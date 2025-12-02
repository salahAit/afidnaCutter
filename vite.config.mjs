import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        svelte(),
        tailwindcss(),
    ],
    base: './', // Important for Electron to find assets
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    }
});

import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),

    kit: {
        adapter: adapter({
        pages: 'docs',     // Output folder for pages
        assets: 'docs',    // Output folder for static assets
        fallback: 'index.html'     // or null if you're not doing SPA routing
    }),
        paths: {
            base: process.env.NODE_ENV === 'production' ? '/sveltekit-github-pages' : '',
        }
    }
};

export default config;

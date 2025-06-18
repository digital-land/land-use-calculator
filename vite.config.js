import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	worker: { format: 'es' },
	base: '/sveltekit-github-pages/'
});

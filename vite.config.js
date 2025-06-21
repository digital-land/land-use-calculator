import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	  build: {
			rollupOptions: {
			output: {
				format: 'es', // <- Make sure this is 'es' not 'iife'
			},
			},
		},
		  worker: {
    format: 'es', // ✅ This is what fixes your issue
    rollupOptions: {
      output: {
        format: 'es' // ✅ Explicitly set ES module output for workers
      }
    }
  }
});

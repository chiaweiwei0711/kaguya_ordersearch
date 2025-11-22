import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Property 'cwd' does not exist on type 'Process'. Casting process to any to bypass type check.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Properly polyfill process.env for browser compatibility
      'process.env': {
         API_KEY: JSON.stringify(env.VITE_API_KEY || '')
      }
    },
    server: {
      host: true
    }
  };
});
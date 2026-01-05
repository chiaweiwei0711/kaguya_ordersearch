import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use '.' to refer to the current working directory as envDir to avoid TypeScript errors with process.cwd()
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    server: {
      host: true
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY)
    }
  };
});
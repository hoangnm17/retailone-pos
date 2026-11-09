import {defineConfig} from 'vite';
import {fileURLToPath, URL} from 'node:url';
export default defineConfig({
  esbuild: {jsx: 'automatic'},
  resolve: {alias: Object.fromEntries(['app', 'components', 'hooks', 'services', 'utils', 'style'].map(name => [name, fileURLToPath(new URL(`./src/${name}`, import.meta.url))]))},
  server: {port: 5173, strictPort: true},
  preview: {port: 5173, strictPort: true},
  build: {outDir: 'dist'}
});

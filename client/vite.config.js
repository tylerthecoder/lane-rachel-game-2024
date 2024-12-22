import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path, { resolve } from 'path';
import { fileURLToPath } from 'url';
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@shared': resolve(__dirname, '../shared')
        }
    }
});

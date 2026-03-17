import { defineConfig } from 'vite';
import livePreview from 'vite-live-preview';

const backendTarget = process.env['BACKEND_TARGET'] ?? 'http://10.130.163.57:8080';
const wsBackendTarget = backendTarget.replace(/^http/, 'ws');

console.log(`[Vite] Proxy backend → ${backendTarget}`);

export default defineConfig({
    plugins: [
        livePreview({
            reload: true,
            config: { build: { sourcemap: true } },
        }),
    ],

    build: {
        outDir: 'dist',
        sourcemap:  true,
        target: 'es2022',
        minify: 'esbuild',
        rollupOptions: {
            input: {
                plugin: 'src/plugin.ts',
                index: './index.html',
            },
            output: {
                entryFileNames: '[name].js',
            },
        },
        emptyOutDir: true,
    },

    server: {
        port: 4200,
        cors: true,
        host: '0.0.0.0',
        strictPort: true,
        proxy: {
            '/api': {
                target: backendTarget,
                changeOrigin: true,
            },
            '/plugin': {
                target: wsBackendTarget,
                ws: true,
                changeOrigin: true,
            },
        },
    },

    preview: {
        port: 4200,
        cors: true,
        strictPort: true,
        host: '0.0.0.0',
    },

    resolve: {
        alias: { '@': '/src' },
    },
});
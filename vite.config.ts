import { defineConfig } from "vite";
import livePreview from "vite-live-preview";

// Récupération des variables (Docker injecte celles-ci)
const serverAddress = process.env.PENPOT_SERVER_ADDRESS || "localhost";
const websocketPort = process.env.PENPOT_WEBSOCKET_PORT || "8080";
const websocketUrl = `ws://${serverAddress}:${websocketPort}/plugin`;

const previewPort = Number.parseInt(process.env.PENPOT_PLUGIN_SERVER_PORT || "4200", 10);

export default defineConfig({
    plugins: [
        livePreview({
            reload: true,
            config: {
                build: { sourcemap: true },
            },
        }),
    ],
    build: {
        outDir: "dist",
        sourcemap: true,
        target: "es2022",
        minify: "esbuild",
        rollupOptions: {
            input: {
                plugin: "src/plugin.ts",
                index: "./index.html",
            },
            output: {
                entryFileNames: "[name].js",
            },
        },
        emptyOutDir: true,
    },
    // IMPORTANT pour Docker : host doit être "0.0.0.0"
    preview: {
        port: previewPort,
        cors: true,
        strictPort: true,
        host: "0.0.0.0", 
    },
    server: {
        port: previewPort,
        cors: true,
        host: "0.0.0.0",
        strictPort: true,
    },
    define: {
        PENPOT_WEBSOCKET_URL: JSON.stringify(websocketUrl),
    },
    resolve: {
        alias: { "@": "/src" },
    },
});